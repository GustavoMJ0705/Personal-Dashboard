-- Horário opcional para tarefas. due_date continua sendo o dia civil;
-- due_at guarda o instante (UTC) quando a tarefa tem hora, sempre no mesmo dia em São Paulo.

alter table public.tasks add column due_at timestamptz;

alter table public.tasks add constraint tasks_due_at_matches_date check (
  due_at is null
  or (due_date is not null and due_date = (due_at at time zone 'America/Sao_Paulo')::date)
);

grant update (due_at) on public.tasks to authenticated;
