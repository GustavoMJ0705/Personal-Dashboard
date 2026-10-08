-- O horário da tarefa é do fuso de quem a criou, não mais sempre de São Paulo.
-- O banco só exige que exista data quando há horário; o app grava due_date e due_at no mesmo fuso.

alter table public.tasks drop constraint tasks_due_at_matches_date;

alter table public.tasks add constraint tasks_due_at_requires_date check (due_at is null or due_date is not null);
