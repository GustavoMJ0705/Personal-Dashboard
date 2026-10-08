-- Schema inicial: tasks, events e reminders.
-- Toda tabela pertence a um usuário (user_id) e é protegida por RLS via auth.uid().

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- tasks ---------------------------------------------------------------------

create type public.task_priority as enum ('low', 'normal', 'high');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  description text,
  due_date date,
  priority public.task_priority not null default 'normal',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_open_due_idx on public.tasks (user_id, due_date) where completed_at is null;
create index tasks_user_completed_idx on public.tasks (user_id, completed_at);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy "tasks: select own" on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "tasks: insert own" on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "tasks: update own" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "tasks: delete own" on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- events --------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_ends_after_start check (ends_at >= starts_at)
);

create index events_user_starts_idx on public.events (user_id, starts_at);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events: select own" on public.events
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "events: insert own" on public.events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "events: update own" on public.events
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "events: delete own" on public.events
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- reminders -----------------------------------------------------------------

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  remind_at timestamptz not null,
  channel text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usado pelo job do pg_cron para achar lembretes vencidos ainda não enviados.
create index reminders_pending_idx on public.reminders (remind_at) where sent_at is null;
create index reminders_user_remind_idx on public.reminders (user_id, remind_at);

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

alter table public.reminders enable row level security;

create policy "reminders: select own" on public.reminders
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "reminders: insert own" on public.reminders
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "reminders: update own" on public.reminders
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "reminders: delete own" on public.reminders
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- realtime ------------------------------------------------------------------

-- Só tasks: concluir no celular precisa refletir no desktop.
alter publication supabase_realtime add table public.tasks;
