-- Testes de RLS do sistema de família.
-- Rodar contra o banco local:  psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/family_rls.sql
-- Tudo roda numa transação e termina em rollback. Uma falha interrompe com "FALHOU: ...".

begin;

\set dono    '''00000000-0000-4000-8000-00000000000a'''
\set membro  '''00000000-0000-4000-8000-00000000000b'''
\set estranho '''00000000-0000-4000-8000-00000000000c'''

insert into auth.users (id, email) values
  (:dono, 'dono@teste.local'),
  (:membro, 'membro@teste.local'),
  (:estranho, 'estranho@teste.local');

create temp table ctx (key text primary key, value uuid);
grant all on ctx to authenticated;

-- dono cria a família e adiciona o membro ---------------------------------

select set_config('request.jwt.claims', json_build_object('sub', :dono, 'role', 'authenticated')::text, true);
set local role authenticated;

insert into ctx values ('family', public.create_family('Família Teste', 'Dono'));
select public.add_family_member('MEMBRO@teste.local', 'Membro');

do $$
declare fid uuid := (select value from ctx where key = 'family');
begin
  begin
    perform public.create_family('Outra', 'Dono');
    raise exception 'FALHOU: dono criou uma segunda família';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'already_in_family' then raise; end if;
  end;

  begin
    perform public.add_family_member('ninguem@teste.local', 'X');
    raise exception 'FALHOU: adicionou e-mail inexistente';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'user_not_found' then raise; end if;
  end;

  insert into public.tasks (title) values ('pessoal do dono');
  insert into public.tasks (title, family_id) values ('da família toda', fid);
  insert into public.tasks (title, family_id, assignee_ids)
    values ('para o membro', fid, array['00000000-0000-4000-8000-00000000000b']::uuid[]);
  insert into public.tasks (title, family_id, assignee_ids)
    values ('para dono e membro', fid, array['00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b']::uuid[]);
  insert into public.events (title, starts_at, ends_at, family_id)
    values ('jantar em família', now(), now() + interval '1 hour', fid);
  insert into public.events (title, starts_at, ends_at)
    values ('consulta pessoal', now(), now() + interval '1 hour');
  insert into public.events (title, starts_at, ends_at, family_id, assignee_ids)
    values ('reunião da escola', now(), now() + interval '1 hour', fid,
            array['00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b']::uuid[]);

  begin
    insert into public.events (title, starts_at, ends_at, family_id, assignee_ids)
      values ('com estranho', now(), now() + interval '1 hour', fid, array['00000000-0000-4000-8000-00000000000c']::uuid[]);
    raise exception 'FALHOU: atribuiu compromisso a quem não é da família';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.tasks (title, family_id, assignee_ids)
      values ('para membro e estranho', fid, array['00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c']::uuid[]);
    raise exception 'FALHOU: atribuiu tarefa a quem não é da família';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.tasks (title, assignee_ids) values ('atribuída sem família', array['00000000-0000-4000-8000-00000000000b']::uuid[]);
    raise exception 'FALHOU: atribuiu tarefa sem family_id';
  exception when insufficient_privilege then null;
  end;

  raise notice 'ok: dono cria família, adiciona membro e compartilha itens';
end $$;

-- membro ------------------------------------------------------------------

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :membro, 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
  fid uuid := (select value from ctx where key = 'family');
  family_task uuid := (select id from public.tasks where title = 'da família toda');
begin
  if (select count(*) from public.tasks) <> 3 then
    raise exception 'FALHOU: membro deveria ver 3 tarefas da família, viu %', (select count(*) from public.tasks);
  end if;
  if exists (select 1 from public.tasks where title = 'pessoal do dono') then
    raise exception 'FALHOU: tarefa pessoal do dono vazou para o membro';
  end if;
  if (select count(*) from public.events) <> 2 then
    raise exception 'FALHOU: membro deveria ver só os 2 compromissos da família';
  end if;
  if (select count(*) from public.family_members) <> 2 or (select count(*) from public.families) <> 1 then
    raise exception 'FALHOU: membro deveria ver a família e os 2 membros';
  end if;

  update public.tasks set completed_at = now() where id = family_task;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: membro não conseguiu concluir tarefa da família'; end if;

  delete from public.tasks where id = family_task;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: membro apagou tarefa criada pelo dono'; end if;

  begin
    update public.tasks set family_id = null where id = family_task;
    raise exception 'FALHOU: membro tornou pessoal uma tarefa do dono';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.tasks set user_id = auth.uid() where id = family_task;
    raise exception 'FALHOU: membro trocou o criador da tarefa';
  exception when insufficient_privilege then null;
  end;

  update public.family_members set status = 'working', status_note = 'até 18h' where user_id = auth.uid();
  if (select status_updated_at from public.family_members where user_id = auth.uid()) is null then
    raise exception 'FALHOU: status_updated_at não foi preenchido';
  end if;

  update public.family_members set status = 'out' where user_id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: membro mudou o status do dono'; end if;

  begin
    update public.family_members set role = 'owner' where user_id = auth.uid();
    raise exception 'FALHOU: membro se promoveu a dono';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.add_family_member('estranho@teste.local', 'Estranho');
    raise exception 'FALHOU: membro adicionou alguém à família';
  exception when insufficient_privilege then null;
  end;

  delete from public.family_members where user_id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: membro removeu o dono'; end if;

  insert into public.tasks (title, family_id) values ('criada pelo membro', fid);

  raise notice 'ok: membro vê e conclui itens da família, sem apagar, sem mexer no dono';
end $$;

-- estranho ----------------------------------------------------------------

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :estranho, 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare fid uuid := (select value from ctx where key = 'family');
begin
  if (select count(*) from public.tasks) + (select count(*) from public.events)
     + (select count(*) from public.families) + (select count(*) from public.family_members) <> 0 then
    raise exception 'FALHOU: estranho enxergou dados da família';
  end if;

  begin
    insert into public.tasks (title, family_id) values ('invasão', fid);
    raise exception 'FALHOU: estranho criou tarefa na família';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.family_members (family_id, user_id, display_name)
      values (fid, auth.uid(), 'Intruso');
    raise exception 'FALHOU: estranho se inseriu na família';
  exception when insufficient_privilege then null;
  end;

  raise notice 'ok: estranho não vê nem escreve nada da família';
end $$;

-- dono remove o membro ----------------------------------------------------

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :dono, 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare n int;
begin
  if not exists (select 1 from public.tasks where title = 'criada pelo membro') then
    raise exception 'FALHOU: dono não vê tarefa compartilhada pelo membro';
  end if;

  delete from public.family_members where user_id = auth.uid();
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: dono removeu a si mesmo'; end if;

  delete from public.family_members where user_id = '00000000-0000-4000-8000-00000000000b';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: dono não conseguiu remover o membro'; end if;

  if exists (select 1 from public.tasks where '00000000-0000-4000-8000-00000000000b' = any (assignee_ids)) then
    raise exception 'FALHOU: tarefas continuaram atribuídas a quem saiu';
  end if;

  if (select assignee_ids from public.events where title = 'reunião da escola') <> array['00000000-0000-4000-8000-00000000000a']::uuid[] then
    raise exception 'FALHOU: compromisso continuou com quem saiu da família';
  end if;

  if (select assignee_ids from public.tasks where title = 'para dono e membro') <> array['00000000-0000-4000-8000-00000000000a']::uuid[] then
    raise exception 'FALHOU: ao remover o membro, o dono deveria continuar responsável';
  end if;

  raise notice 'ok: dono remove membro e as atribuições são limpas';
end $$;

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :membro, 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if exists (select 1 from public.tasks where title <> 'criada pelo membro') then
    raise exception 'FALHOU: ex-membro continua vendo itens da família';
  end if;
  raise notice 'ok: ex-membro perde o acesso aos itens da família';
end $$;

-- anônimo -----------------------------------------------------------------

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

do $$
begin
  if (select count(*) from public.tasks) + (select count(*) from public.events)
     + (select count(*) from public.families) + (select count(*) from public.family_members) <> 0 then
    raise exception 'FALHOU: anônimo leu dados';
  end if;
  raise notice 'ok: anônimo não lê nada';
end $$;

rollback;
