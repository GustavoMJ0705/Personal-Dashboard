-- Tarefas passam a ter várias pessoas responsáveis (assignee_ids) em vez de uma só.
-- family_id nulo = pessoal; family_id preenchido e assignee_ids vazio = família toda;
-- assignee_ids preenchido = essas pessoas (todas membros da família).

create or replace function private.are_members_of_family(fid uuid, uids uuid[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from unnest(uids) as u(id)
    where not exists (
      select 1 from public.family_members m
      where m.family_id = fid and m.user_id = u.id
    )
  );
$$;

revoke all on function private.are_members_of_family(uuid, uuid[]) from public;
grant execute on function private.are_members_of_family(uuid, uuid[]) to authenticated;

alter table public.tasks add column assignee_ids uuid[] not null default '{}';

update public.tasks set assignee_ids = array[assignee_id] where assignee_id is not null;

drop policy "tasks: insert own" on public.tasks;
drop policy "tasks: update own or family" on public.tasks;

alter table public.tasks drop column assignee_id;

create policy "tasks: insert own" on public.tasks
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (family_id is null or private.is_family_member(family_id))
    and (cardinality(assignee_ids) = 0 or (family_id is not null and private.are_members_of_family(family_id, assignee_ids)))
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
    and (cardinality(assignee_ids) = 0 or (family_id is not null and private.are_members_of_family(family_id, assignee_ids)))
  );

revoke update on public.tasks from anon, authenticated;
grant update (title, description, due_date, priority, completed_at, family_id, assignee_ids)
  on public.tasks to authenticated;

create index tasks_assignee_ids_idx on public.tasks using gin (assignee_ids);

-- Quem sai da família deixa de ser responsável pelos itens dela.
create or replace function private.unassign_removed_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tasks set assignee_ids = array_remove(assignee_ids, old.user_id)
  where family_id = old.family_id and old.user_id = any (assignee_ids);
  update public.events set assignee_id = null
  where family_id = old.family_id and assignee_id = old.user_id;
  return old;
end;
$$;
