-- Tarefa diária: repete todo dia a partir de due_date, no mesmo horário (due_at).
-- Concluir marca só o dia: completed_at de um dia anterior conta como aberta de novo.

create type public.task_recurrence as enum ('daily');

alter table public.tasks add column recurrence public.task_recurrence;

alter table public.tasks add constraint tasks_recurrence_requires_date check (recurrence is null or due_date is not null);

grant update (recurrence) on public.tasks to authenticated;
