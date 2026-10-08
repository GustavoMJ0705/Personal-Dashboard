-- Sistema de família: famílias, membros com status e compartilhamento de tarefas e compromissos.

create schema if not exists private;
grant usage on schema private to authenticated;

-- tipos ---------------------------------------------------------------------

create type public.family_role as enum ('owner', 'member');
create type public.member_status as enum ('at_home', 'working', 'studying', 'traveling', 'out');

-- families ------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index families_user_idx on public.families (user_id);

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

-- family_members ------------------------------------------------------------

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  role public.family_role not null default 'member',
  status public.member_status,
  status_note text check (status_note is null or char_length(status_note) <= 80),
  status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index family_members_family_idx on public.family_members (family_id);

create trigger family_members_set_updated_at
  before update on public.family_members
  for each row execute function public.set_updated_at();

create or replace function private.touch_member_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status or new.status_note is distinct from old.status_note then
    new.status_updated_at = now();
  end if;
  return new;
end;
$$;

create trigger family_members_touch_status
  before update on public.family_members
  for each row execute function private.touch_member_status();

-- funções das policies ------------------------------------------------------
-- security definer: leem family_members sem passar pelo RLS dela, evitando recursão.

create or replace function private.is_member_of_family(fid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = uid
  );
$$;

create or replace function private.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_member_of_family(fid, (select auth.uid()));
$$;

create or replace function private.is_family_owner(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.families f
    where f.id = fid and f.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_member_of_family(uuid, uuid) from public;
revoke all on function private.is_family_member(uuid) from public;
revoke all on function private.is_family_owner(uuid) from public;
grant execute on function private.is_member_of_family(uuid, uuid) to authenticated;
grant execute on function private.is_family_member(uuid) to authenticated;
grant execute on function private.is_family_owner(uuid) to authenticated;

-- RLS: families --------------------------------------------------------------
-- Sem policy de insert: a família nasce pela RPC create_family, junto com o dono.

alter table public.families enable row level security;

create policy "families: select member" on public.families
  for select to authenticated
  using (private.is_family_member(id));

create policy "families: update owner" on public.families
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "families: delete owner" on public.families
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke update on public.families from anon, authenticated;
grant update (name) on public.families to authenticated;

-- RLS: family_members --------------------------------------------------------
-- Sem policy de insert: membros entram pelas RPCs create_family e add_family_member.

alter table public.family_members enable row level security;

create policy "family_members: select same family" on public.family_members
  for select to authenticated
  using (private.is_family_member(family_id));

create policy "family_members: update self" on public.family_members
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "family_members: delete by owner" on public.family_members
  for delete to authenticated
  using (private.is_family_owner(family_id) and user_id <> (select auth.uid()));

revoke update on public.family_members from anon, authenticated;
grant update (display_name, status, status_note) on public.family_members to authenticated;

-- RPCs -----------------------------------------------------------------------

create or replace function public.create_family(family_name text, member_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_family_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.family_members where user_id = uid) then
    raise exception 'already_in_family' using errcode = 'P0001';
  end if;

  insert into public.families (user_id, name)
  values (uid, btrim(family_name))
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, display_name, role)
  values (new_family_id, uid, btrim(member_display_name), 'owner');

  return new_family_id;
end;
$$;

create or replace function public.add_family_member(member_email text, member_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  owner_family_id uuid;
  target_user_id uuid;
  new_member_id uuid;
begin
  select f.id into owner_family_id from public.families f where f.user_id = uid;
  if owner_family_id is null then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(btrim(member_email));
  if target_user_id is null then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.family_members where user_id = target_user_id) then
    raise exception 'already_in_family' using errcode = 'P0001';
  end if;

  insert into public.family_members (family_id, user_id, display_name, role)
  values (owner_family_id, target_user_id, btrim(member_display_name), 'member')
  returning id into new_member_id;

  return new_member_id;
end;
$$;

revoke all on function public.create_family(text, text) from public, anon;
revoke all on function public.add_family_member(text, text) from public, anon;
grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.add_family_member(text, text) to authenticated;

-- compartilhamento em tasks e events ----------------------------------------

alter table public.tasks
  add column family_id uuid references public.families (id) on delete set null,
  add column assignee_id uuid references auth.users (id) on delete set null;

alter table public.events
  add column family_id uuid references public.families (id) on delete set null,
  add column assignee_id uuid references auth.users (id) on delete set null;

create index tasks_family_idx on public.tasks (family_id) where family_id is not null;
create index events_family_starts_idx on public.events (family_id, starts_at) where family_id is not null;

-- Quem sai da família deixa de ser responsável pelos itens dela.
create or replace function private.unassign_removed_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tasks set assignee_id = null
  where family_id = old.family_id and assignee_id = old.user_id;
  update public.events set assignee_id = null
  where family_id = old.family_id and assignee_id = old.user_id;
  return old;
end;
$$;

create trigger family_members_unassign_on_delete
  after delete on public.family_members
  for each row execute function private.unassign_removed_member();

-- policies de tasks e events: pessoais ou da família --------------------------

drop policy "tasks: select own" on public.tasks;
drop policy "tasks: insert own" on public.tasks;
drop policy "tasks: update own" on public.tasks;
drop policy "tasks: delete own" on public.tasks;

create policy "tasks: select own or family" on public.tasks
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (family_id is not null and private.is_family_member(family_id))
  );

create policy "tasks: insert own" on public.tasks
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (family_id is null or private.is_family_member(family_id))
    and (assignee_id is null or (family_id is not null and private.is_member_of_family(family_id, assignee_id)))
  );

-- Membro edita item da família; só o criador pode torná-lo pessoal de novo (family_id nulo).
create policy "tasks: update own or family" on public.tasks
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    or (family_id is not null and private.is_family_member(family_id))
  )
  with check (
    ((select auth.uid()) = user_id or (family_id is not null and private.is_family_member(family_id)))
    and (family_id is null or private.is_family_member(family_id))
    and (assignee_id is null or (family_id is not null and private.is_member_of_family(family_id, assignee_id)))
  );

create policy "tasks: delete own" on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke update on public.tasks from anon, authenticated;
grant update (title, description, due_date, priority, completed_at, family_id, assignee_id)
  on public.tasks to authenticated;

drop policy "events: select own" on public.events;
drop policy "events: insert own" on public.events;
drop policy "events: update own" on public.events;
drop policy "events: delete own" on public.events;

create policy "events: select own or family" on public.events
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (family_id is not null and private.is_family_member(family_id))
  );

create policy "events: insert own" on public.events
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (family_id is null or private.is_family_member(family_id))
    and (assignee_id is null or (family_id is not null and private.is_member_of_family(family_id, assignee_id)))
  );

create policy "events: update own or family" on public.events
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    or (family_id is not null and private.is_family_member(family_id))
  )
  with check (
    ((select auth.uid()) = user_id or (family_id is not null and private.is_family_member(family_id)))
    and (family_id is null or private.is_family_member(family_id))
    and (assignee_id is null or (family_id is not null and private.is_member_of_family(family_id, assignee_id)))
  );

create policy "events: delete own" on public.events
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke update on public.events from anon, authenticated;
grant update (title, starts_at, ends_at, location, all_day, family_id, assignee_id)
  on public.events to authenticated;

-- realtime ------------------------------------------------------------------

alter publication supabase_realtime add table public.events, public.family_members;
