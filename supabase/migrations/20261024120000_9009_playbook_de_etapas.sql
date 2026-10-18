-- manifest: **Playbook de etapas e atividades (fork Escale, Fase 1I).** Duas tabelas novas: `crm_atividades_da_etapa` (o playbook da origem: as atividades de cada etapa, com título, tipo — whatsapp, instagram, ligacao, email, agendamento, tarefa, reuniao —, visibilidade — padrao ou nao_listada —, prazo em minutos depois da entrada na etapa, ordem e o texto da mensagem, do roteiro ou da instrução; todo membro lê, gerente ou acima escreve) e `crm_atividades_do_negocio` (uma linha por tarefa de `crm_tasks` que veio do playbook ou foi criada na ficha: tipo, visibilidade, etapa, a atividade do playbook que a gerou e quem concluiu; todo membro lê, agente ou acima escreve). `trg_escale_atividades_ao_entrar_na_etapa` (AFTER INSERT ou UPDATE OF stage_id em `crm_leads`, definer, fechado) cria as tarefas da etapa nova para o negócio aberto, por qualquer caminho (tela, lote, arquivar etapa, API, automação, agente, captação, importação, retomada, transferência e o negócio que nasce da conversa); a atividade que o negócio já tem não se repete (a pendente ganha prazo novo); falhar vira aviso e não derruba a mudança de etapa. `trg_escale_quem_concluiu_a_atividade` (AFTER UPDATE OF status em `crm_tasks`) grava quem concluiu e quando. `fn_escale_salvar_playbook` troca a lista da origem numa transação, como quem chama.
-- 9009: playbook de etapas e atividades (fork Escale).

-- ── O PLAYBOOK DA ORIGEM ───────────────────────────────────────────────────
-- Uma linha por atividade de etapa (o `template_activity` da Clint). O prazo é
-- em MINUTOS depois da entrada na etapa (`time_to_check`): até 999 anos. O
-- texto (mensagem, roteiro ou instrução) é de quem configura, não da pessoa
-- atendida: não entra na cascata da LGPD. A FK composta prende a origem à
-- organização; a etapa é conferida pela função de salvar (crm_stages não tem
-- índice único (organization_id, id)).
create table if not exists public.crm_atividades_da_etapa (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null,
  stage_id uuid not null references public.crm_stages(id) on delete cascade,
  titulo text not null,
  tipo text not null,
  visibilidade text not null default 'padrao',
  prazo_minutos integer not null default 1440,
  ordem integer not null default 0,
  conteudo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_atividades_da_etapa_funil_fk foreign key (organization_id, pipeline_id)
    references public.crm_pipelines (organization_id, id) on delete cascade,
  constraint crm_atividades_da_etapa_titulo_valido check (char_length(btrim(titulo)) between 1 and 255),
  constraint crm_atividades_da_etapa_tipo_valido
    check (tipo in ('whatsapp', 'instagram', 'ligacao', 'email', 'agendamento', 'tarefa', 'reuniao')),
  constraint crm_atividades_da_etapa_visibilidade_valida
    check (visibilidade in ('padrao', 'nao_listada')),
  constraint crm_atividades_da_etapa_prazo_valido check (prazo_minutos between 0 and 525074400),
  constraint crm_atividades_da_etapa_ordem_valida check (ordem between 0 and 9999),
  constraint crm_atividades_da_etapa_conteudo_valido check (conteudo is null or char_length(conteudo) <= 4096)
);

create index if not exists idx_crm_atividades_da_etapa_etapa
  on public.crm_atividades_da_etapa (organization_id, stage_id, prazo_minutos, ordem);
create index if not exists idx_crm_atividades_da_etapa_funil
  on public.crm_atividades_da_etapa (organization_id, pipeline_id);

-- ── A ATIVIDADE DO NEGÓCIO ─────────────────────────────────────────────────
-- A tarefa continua sendo a `crm_tasks` do original (título, texto, prazo,
-- status, responsável, linha do tempo, selo do card, anonimização). Esta tabela
-- só acrescenta o que a tarefa não tem: tipo, visibilidade, etapa, a atividade
-- do playbook que a gerou e quem concluiu. Apagar a tarefa apaga a linha.
create table if not exists public.crm_atividades_do_negocio (
  tarefa_id uuid primary key references public.crm_tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  stage_id uuid references public.crm_stages(id) on delete set null,
  atividade_id uuid references public.crm_atividades_da_etapa(id) on delete set null,
  tipo text not null default 'tarefa',
  visibilidade text not null default 'padrao',
  concluida_por uuid references auth.users(id) on delete set null,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  constraint crm_atividades_do_negocio_tipo_valido
    check (tipo in ('whatsapp', 'instagram', 'ligacao', 'email', 'agendamento', 'tarefa', 'reuniao')),
  constraint crm_atividades_do_negocio_visibilidade_valida
    check (visibilidade in ('padrao', 'nao_listada'))
);

-- Uma atividade do playbook nasce UMA vez por negócio (voltar à etapa não repete).
create unique index if not exists uq_crm_atividades_do_negocio_modelo
  on public.crm_atividades_do_negocio (lead_id, atividade_id)
  where atividade_id is not null;
create index if not exists idx_crm_atividades_do_negocio_lead
  on public.crm_atividades_do_negocio (organization_id, lead_id);

alter table public.crm_atividades_da_etapa enable row level security;
alter table public.crm_atividades_do_negocio enable row level security;

drop policy if exists crm_atividades_da_etapa_select on public.crm_atividades_da_etapa;
drop policy if exists crm_atividades_da_etapa_manager_write on public.crm_atividades_da_etapa;
drop policy if exists crm_atividades_do_negocio_select on public.crm_atividades_do_negocio;
drop policy if exists crm_atividades_do_negocio_agent_write on public.crm_atividades_do_negocio;

-- Ler: a organização inteira (a ficha mostra o playbook da etapa futura a quem
-- vê o negócio; a tarefa do original também é lida pela organização inteira).
create policy crm_atividades_da_etapa_select on public.crm_atividades_da_etapa
  for select using (
    public.fn_is_platform_admin() or (organization_id in (select public.fn_user_org_ids()))
  );

-- Escrever o playbook é configurar a origem: gerente ou acima (PRD §5).
create policy crm_atividades_da_etapa_manager_write on public.crm_atividades_da_etapa
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

create policy crm_atividades_do_negocio_select on public.crm_atividades_do_negocio
  for select using (
    public.fn_is_platform_admin() or (organization_id in (select public.fn_user_org_ids()))
  );

-- Escrever acompanha a tarefa: agente ou acima (a régua de `crm_tasks_write`).
create policy crm_atividades_do_negocio_agent_write on public.crm_atividades_do_negocio
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent'))
  );

revoke all on public.crm_atividades_da_etapa from anon;
revoke all on public.crm_atividades_do_negocio from anon;
grant select, insert, update, delete on public.crm_atividades_da_etapa to authenticated;
grant select, insert, update, delete on public.crm_atividades_do_negocio to authenticated;
grant all on public.crm_atividades_da_etapa to service_role;
grant all on public.crm_atividades_do_negocio to service_role;

drop trigger if exists trg_crm_atividades_da_etapa_updated_at on public.crm_atividades_da_etapa;
create trigger trg_crm_atividades_da_etapa_updated_at
  before update on public.crm_atividades_da_etapa
  for each row execute function public.fn_set_updated_at();

-- ── SALVAR O PLAYBOOK ──────────────────────────────────────────────────────
-- Troca a lista da origem numa transação. INVOKER: a RLS de quem chama vale
-- (agent e viewer param no 42501). Mantém os ids (a tarefa que já nasceu
-- continua apontando para a atividade), apaga as que saíram — só das etapas
-- abertas: a atividade de etapa arquivada fica guardada — e recusa etapa de
-- outra origem, ganha, perdida ou arquivada.
create or replace function public.fn_escale_salvar_playbook(
  p_org uuid,
  p_pipeline uuid,
  p_atividades jsonb
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
begin
  if jsonb_typeof(p_atividades) is distinct from 'array' or jsonb_array_length(p_atividades) > 300 then
    raise exception 'o playbook aceita até 300 atividades' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_atividades) a
     where not exists (
       select 1
         from public.crm_stages s
        where s.id = (a ->> 'stage_id')::uuid
          and s.pipeline_id = p_pipeline
          and s.organization_id = p_org
          and not s.is_won and not s.is_lost and not s.is_archived
     )
  ) then
    raise exception 'atividade em etapa que não é aberta desta origem' using errcode = '22023';
  end if;

  select coalesce(array_agg((a ->> 'id')::uuid), '{}'::uuid[]) into v_ids
    from jsonb_array_elements(p_atividades) a;

  delete from public.crm_atividades_da_etapa m
   where m.organization_id = p_org
     and m.pipeline_id = p_pipeline
     and not (m.id = any (v_ids))
     and m.stage_id in (
       select s.id from public.crm_stages s
        where s.pipeline_id = p_pipeline and s.organization_id = p_org
          and not s.is_won and not s.is_lost and not s.is_archived
     );

  insert into public.crm_atividades_da_etapa
      (id, organization_id, pipeline_id, stage_id, titulo, tipo, visibilidade, prazo_minutos, ordem, conteudo)
    select (a ->> 'id')::uuid, p_org, p_pipeline, (a ->> 'stage_id')::uuid, btrim(a ->> 'titulo'),
           a ->> 'tipo', a ->> 'visibilidade', (a ->> 'prazo_minutos')::integer, (a ->> 'ordem')::integer,
           nullif(a ->> 'conteudo', '')
      from jsonb_array_elements(p_atividades) a
  on conflict (id) do update
     set stage_id = excluded.stage_id,
         titulo = excluded.titulo,
         tipo = excluded.tipo,
         visibilidade = excluded.visibilidade,
         prazo_minutos = excluded.prazo_minutos,
         ordem = excluded.ordem,
         conteudo = excluded.conteudo
   where crm_atividades_da_etapa.organization_id = p_org
     and crm_atividades_da_etapa.pipeline_id = p_pipeline;
end;
$$;

revoke all on function public.fn_escale_salvar_playbook(uuid, uuid, jsonb) from public, anon;
grant execute on function public.fn_escale_salvar_playbook(uuid, uuid, jsonb) to authenticated, service_role;

-- ── O NEGÓCIO ENTRA NA ETAPA ───────────────────────────────────────────────
-- Vale para todo caminho que grava `stage_id` (o UPDATE do lote em SQL e o de
-- arquivar etapa não emitem evento; por isso um gatilho, e não um consumidor
-- do event_log). Só o negócio ABERTO ganha atividade. Reordenar na mesma
-- etapa não conta. A tarefa nasce com prazo = agora + prazo da atividade e o
-- dono humano como responsável. Não grava `task_created` na linha do tempo
-- (seriam várias linhas a cada mudança de etapa). TUDO fica dentro de um
-- bloco com `exception`: criar atividade é consequência, e a falha não pode
-- derrubar a mudança de etapa em nenhum caminho.
create or replace function public.fn_escale_atividades_ao_entrar_na_etapa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_modelo record;
  v_existente record;
  v_tarefa uuid;
begin
  if tg_op = 'UPDATE' and new.stage_id is not distinct from old.stage_id then
    return null;
  end if;
  if new.stage_id is null or new.status <> 'open' then
    return null;
  end if;

  begin
    for v_modelo in
      select m.id, m.titulo, m.tipo, m.visibilidade, m.prazo_minutos, m.conteudo
        from public.crm_atividades_da_etapa m
       where m.organization_id = new.organization_id
         and m.stage_id = new.stage_id
       order by m.prazo_minutos, m.ordem
    loop
      select a.tarefa_id, t.status into v_existente
        from public.crm_atividades_do_negocio a
        join public.crm_tasks t on t.id = a.tarefa_id
       where a.lead_id = new.id
         and a.atividade_id = v_modelo.id;

      if found then
        if v_existente.status in ('pending', 'in_progress') then
          update public.crm_tasks
             set due_date = now() + make_interval(mins => v_modelo.prazo_minutos)
           where id = v_existente.tarefa_id;
        end if;
        continue;
      end if;

      insert into public.crm_tasks
          (organization_id, title, description, due_date, priority, status, lead_id, contact_id, assigned_to, source_kind)
        values
          (new.organization_id, v_modelo.titulo, v_modelo.conteudo,
           now() + make_interval(mins => v_modelo.prazo_minutos), 'medium', 'pending',
           new.id, new.contact_id, new.owner_user_id, 'playbook')
        returning id into v_tarefa;

      insert into public.crm_atividades_do_negocio
          (tarefa_id, organization_id, lead_id, stage_id, atividade_id, tipo, visibilidade)
        values
          (v_tarefa, new.organization_id, new.id, new.stage_id, v_modelo.id, v_modelo.tipo, v_modelo.visibilidade);
    end loop;
  exception when others then
    raise warning 'fn_escale_atividades_ao_entrar_na_etapa: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end
$fn$;

revoke all on function public.fn_escale_atividades_ao_entrar_na_etapa() from public, anon, authenticated;

drop trigger if exists trg_escale_atividades_ao_entrar_na_etapa on public.crm_leads;
create trigger trg_escale_atividades_ao_entrar_na_etapa
  after insert or update of stage_id on public.crm_leads
  for each row execute function public.fn_escale_atividades_ao_entrar_na_etapa();

-- ── QUEM CONCLUIU ──────────────────────────────────────────────────────────
-- A dica da caixa de concluir (Clint) diz quem concluiu e quando. Vale para
-- toda conclusão (ficha, lista de Tarefas do original, API). Reabrir apaga.
-- Tarefa sem linha nesta tabela (a do original) não muda nada.
create or replace function public.fn_escale_quem_concluiu_a_atividade()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  update public.crm_atividades_do_negocio
     set concluida_por = case when new.status = 'done' then auth.uid() else null end,
         concluida_em = case when new.status = 'done' then now() else null end
   where tarefa_id = new.id;
  return null;
end
$fn$;

revoke all on function public.fn_escale_quem_concluiu_a_atividade() from public, anon, authenticated;

drop trigger if exists trg_escale_quem_concluiu_a_atividade on public.crm_tasks;
create trigger trg_escale_quem_concluiu_a_atividade
  after update of status on public.crm_tasks
  for each row execute function public.fn_escale_quem_concluiu_a_atividade();

comment on table public.crm_atividades_da_etapa is
  'Playbook da origem (fork Escale, migration 9009): as atividades de cada etapa (tipo, visibilidade, prazo em minutos depois da entrada, ordem, texto). Todo membro lê; gerente ou acima escreve, pela fn_escale_salvar_playbook.';
comment on table public.crm_atividades_do_negocio is
  'Atividade do negócio (fork Escale, migration 9009): uma linha por crm_tasks que veio do playbook ou foi criada na ficha, com tipo, visibilidade, etapa, a atividade que a gerou e quem concluiu.';
comment on function public.fn_escale_salvar_playbook(uuid, uuid, jsonb) is
  'Troca o playbook da origem p_pipeline da organização p_org numa transação, mantendo os ids. Security invoker: a RLS de quem chama vale. Chamador: app/api/v1/pipelines/[id]/playbook.';
comment on function public.fn_escale_atividades_ao_entrar_na_etapa() is
  'Fork Escale (9009): cria as tarefas da etapa nova (crm_atividades_da_etapa) para o negócio aberto; não repete; a pendente ganha prazo novo. Falha vira warning e não derruba a mudança de etapa. Definer, fechada a anon/authenticated.';
comment on function public.fn_escale_quem_concluiu_a_atividade() is
  'Fork Escale (9009): grava em crm_atividades_do_negocio quem concluiu a tarefa e quando; reabrir apaga. Definer, fechada a anon/authenticated.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
