-- Compromissos passam a ter várias pessoas (assignee_ids), como as tarefas.

alter table public.events add column assignee_ids uuid[] not null default '{}';

update public.events set assignee_ids = array[assignee_id] where assignee_id is not null;

drop policy "events: insert own" on public.events;
drop policy "events: update own or family" on public.events;

alter table public.events drop column assignee_id;

create policy "events: insert own" on public.events
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (family_id is null or private.is_family_member(family_id))
    and (cardinality(assignee_ids) = 0 or (family_id is not null and private.are_members_of_family(family_id, assignee_ids)))
  );

-- Membro edita item da família; só o criador pode torná-lo pessoal de novo (family_id nulo).
create policy "events: update own or family" on public.events
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

revoke update on public.events from anon, authenticated;
grant update (title, starts_at, ends_at, location, all_day, family_id, assignee_ids)
  on public.events to authenticated;

create index events_assignee_ids_idx on public.events using gin (assignee_ids);

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
  update public.events set assignee_ids = array_remove(assignee_ids, old.user_id)
  where family_id = old.family_id and old.user_id = any (assignee_ids);
  return old;
end;
$$;
