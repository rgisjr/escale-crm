-- manifest: **Filtros e ações em massa da fila de Conversas (fork Escale, Fase 3D).** O painel de filtros da casca avaliado no banco com a RLS de quem olha (`fn_escale_conversa_passa`, invoker: status pelo mapa da seção 6 do PRD, os toggles, data do atendimento, atendentes, agentes, setor efetivo da 3C, grupos, canais, tags do contato, negócios do contato por `fn_escale_negocio_da_fila_passa`, a busca e as exclusões do Inbox original — contato pessoal e canal desativado); a página da fila (`fn_escale_fila_da_casca`, setof conversations, ordem e cursor) e o total (`fn_escale_contar_fila_da_casca`); as ações em massa (`crm_acoes_em_massa_conversas` e `_itens`: cada um vê as suas, só quem tem "Ações em massa" — `fn_crm_pode(org, 'CHAT_BULK_ACTIONS')` — cria, e quem pediu só fecha o preparo) e `fn_escale_criar_acao_em_massa_de_conversas` (invoker: resolve as conversas pelos ids ou pelo filtro, até 100.000, e emite `conversas.acao_em_massa_requested` acima do limite da execução imediata). Nenhuma função definer.
-- ---- FORK ESCALE · filtros e ações em massa da fila de Conversas (migration 9204) ----

-- ── 1. Negócios: algum negócio visível do contato cumpre TODOS os critérios ──
create or replace function public.fn_escale_negocio_da_fila_passa(p_org uuid, p_contato uuid, p_negocio jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select (coalesce(p_negocio ->> 'tem', 'com') = 'com') = exists (
    select 1
      from public.crm_leads l
      join public.crm_pipelines p on p.id = l.pipeline_id
     where l.organization_id = p_org
       and l.contact_id = p_contato
       and not p.is_archived
       and (jsonb_array_length(coalesce(p_negocio -> 'grupos', '[]'::jsonb)) = 0
            or p.group_id::text in (select jsonb_array_elements_text(p_negocio -> 'grupos')))
       and (jsonb_array_length(coalesce(p_negocio -> 'origens', '[]'::jsonb)) = 0
            or l.pipeline_id::text in (select jsonb_array_elements_text(p_negocio -> 'origens')))
       and (jsonb_array_length(coalesce(p_negocio -> 'etapas', '[]'::jsonb)) = 0
            or l.stage_id::text in (select jsonb_array_elements_text(p_negocio -> 'etapas')))
       and (jsonb_array_length(coalesce(p_negocio -> 'status', '[]'::jsonb)) = 0
            or l.status in (select jsonb_array_elements_text(p_negocio -> 'status')))
       and (
         (jsonb_array_length(coalesce(p_negocio -> 'donos_usuarios', '[]'::jsonb)) = 0
          and jsonb_array_length(coalesce(p_negocio -> 'donos_agentes', '[]'::jsonb)) = 0
          and not coalesce((p_negocio ->> 'sem_dono')::boolean, false))
         or l.owner_user_id::text in (select jsonb_array_elements_text(coalesce(p_negocio -> 'donos_usuarios', '[]'::jsonb)))
         or l.owner_agent_id::text in (select jsonb_array_elements_text(coalesce(p_negocio -> 'donos_agentes', '[]'::jsonb)))
         or (coalesce((p_negocio ->> 'sem_dono')::boolean, false)
             and l.owner_user_id is null and l.owner_agent_id is null)
       )
       and (jsonb_array_length(coalesce(p_negocio -> 'motivos', '[]'::jsonb)) = 0
            or (l.status = 'lost' and l.lost_reason in (select jsonb_array_elements_text(p_negocio -> 'motivos'))))
       and (case p_negocio ->> 'data_tipo'
              when 'criacao' then
                (p_negocio ->> 'data_de' is null
                 or (l.created_at at time zone (p_negocio ->> 'fuso'))::date >= (p_negocio ->> 'data_de')::date)
                and (p_negocio ->> 'data_ate' is null
                 or (l.created_at at time zone (p_negocio ->> 'fuso'))::date <= (p_negocio ->> 'data_ate')::date)
              when 'ganho' then
                l.status = 'won'
                and (p_negocio ->> 'data_de' is null
                 or (l.closed_at at time zone (p_negocio ->> 'fuso'))::date >= (p_negocio ->> 'data_de')::date)
                and (p_negocio ->> 'data_ate' is null
                 or (l.closed_at at time zone (p_negocio ->> 'fuso'))::date <= (p_negocio ->> 'data_ate')::date)
              when 'perda' then
                l.status = 'lost'
                and (p_negocio ->> 'data_de' is null
                 or (l.closed_at at time zone (p_negocio ->> 'fuso'))::date >= (p_negocio ->> 'data_de')::date)
                and (p_negocio ->> 'data_ate' is null
                 or (l.closed_at at time zone (p_negocio ->> 'fuso'))::date <= (p_negocio ->> 'data_ate')::date)
              else true
            end)
  )
$$;

-- ── 2. Uma conversa passa no filtro do painel? ───────────────────────────────
-- p_f é o FiltroDaFilaCompilado da rota (lib/escale/conversas/compilar-filtros-da-fila.ts).
-- Pares opostos de toggles somam por OU; grupos diferentes se juntam por E.
create or replace function public.fn_escale_conversa_passa(p_c public.conversations, p_f jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    -- 1. o que o Inbox original esconde: contato pessoal e canal desativado
    not exists (select 1 from public.contacts ct where ct.id = (p_c).contact_id and ct.is_personal)
    and not exists (select 1 from public.channel_sessions s
                     where s.id = (p_c).channel_session_id and s.metadata ->> 'disabled' = 'true')
    -- 2. a busca: a prévia, o nome e o telefone do contato (anonimizado e pessoal não se acham pelo nome)
    and (p_f -> 'busca' is null
         or (p_c).last_message_preview ilike (p_f #>> '{busca,padrao}')
         or exists (select 1 from public.contacts ct
                     where ct.id = (p_c).contact_id and not ct.is_anonymized and not ct.is_personal
                       and (ct.display_name ilike (p_f #>> '{busca,padrao}')
                            or ct.name ilike (p_f #>> '{busca,padrao}')
                            or ((p_f #>> '{busca,digitos}') is not null
                                and ct.phone_number like '%' || (p_f #>> '{busca,digitos}') || '%'))))
    -- 3. status da conversa (seção 6 do PRD): cada valor soma por OU
    and (jsonb_array_length(coalesce(p_f -> 'status', '[]'::jsonb)) = 0
         or ((p_f -> 'status') ? 'em_aberto'
             and (p_c).status in ('open', 'pending', 'claimed', 'ai_handling')
             and not coalesce((p_c).snooze_until > now(), false))
         or ((p_f -> 'status') ? 'em_espera'
             and (p_c).status in ('open', 'pending', 'claimed', 'ai_handling')
             and coalesce((p_c).snooze_until > now(), false))
         or ((p_f -> 'status') ? 'fechado' and (p_c).status in ('closed', 'resolved'))
         or ((p_f -> 'status') ? 'arquivada' and (p_c).status = 'archived'))
    -- 4. os toggles
    and (not (coalesce(p_f -> 'marcas', '[]'::jsonb) ?| array['atribuidas_a_mim', 'nao_atribuidas'])
         or ((p_f -> 'marcas') ? 'atribuidas_a_mim' and (p_c).assigned_to_user_id = auth.uid())
         or ((p_f -> 'marcas') ? 'nao_atribuidas' and (p_c).assigned_to_user_id is null))
    and (not (coalesce(p_f -> 'marcas', '[]'::jsonb) ?| array['sem_resposta', 'aguardando_contato'])
         or ((p_f -> 'marcas') ? 'sem_resposta' and (p_c).awaiting_since is not null)
         or ((p_f -> 'marcas') ? 'aguardando_contato'
             and (p_c).last_outbound_at is not null
             and ((p_c).last_inbound_at is null or (p_c).last_outbound_at > (p_c).last_inbound_at)))
    and (not (coalesce(p_f -> 'marcas', '[]'::jsonb) ?| array['lidas', 'nao_lidas'])
         or ((p_f -> 'marcas') ? 'lidas' and (p_c).unread_count_for_assignee = 0)
         or ((p_f -> 'marcas') ? 'nao_lidas' and (p_c).unread_count_for_assignee > 0))
    and (not (coalesce(p_f -> 'marcas', '[]'::jsonb) ?| array['dentro_da_janela', 'fora_da_janela'])
         or (exists (select 1 from public.channel_sessions s
                      where s.id = (p_c).channel_session_id and s.provider = 'meta_cloud')
             and (((p_f -> 'marcas') ? 'dentro_da_janela'
                   and (p_c).last_inbound_at > now() - interval '24 hours')
                  or ((p_f -> 'marcas') ? 'fora_da_janela'
                      and ((p_c).last_inbound_at is null or (p_c).last_inbound_at <= now() - interval '24 hours')))))
    and (not coalesce((p_f -> 'marcas') ? 'em_transferencia', false)
         or exists (select 1 from public.crm_setor_da_conversa s
                     where s.conversation_id = (p_c).id and s.em_transferencia))
    and (not coalesce((p_f -> 'marcas') ? 'suspensas', false)
         or exists (select 1 from public.crm_pausas_de_automacao pa
                     where pa.conversation_id = (p_c).id and (pa.ate is null or pa.ate > now())))
    -- 5. data de criação do atendimento (no fuso da organização)
    and (p_f ->> 'criada_de' is null
         or (coalesce((p_c).service_started_at, (p_c).created_at) at time zone (p_f ->> 'fuso'))::date
            >= (p_f ->> 'criada_de')::date)
    and (p_f ->> 'criada_ate' is null
         or (coalesce((p_c).service_started_at, (p_c).created_at) at time zone (p_f ->> 'fuso'))::date
            <= (p_f ->> 'criada_ate')::date)
    -- 6. atendentes, agentes de IA e setores (o setor efetivo da 3C)
    and ((jsonb_array_length(coalesce(p_f -> 'atendentes', '[]'::jsonb)) = 0
          and not coalesce((p_f ->> 'sem_atendente')::boolean, false))
         or (p_c).assigned_to_user_id::text in (select jsonb_array_elements_text(coalesce(p_f -> 'atendentes', '[]'::jsonb)))
         or (coalesce((p_f ->> 'sem_atendente')::boolean, false) and (p_c).assigned_to_user_id is null))
    and (jsonb_array_length(coalesce(p_f -> 'agentes', '[]'::jsonb)) = 0
         or ((p_c).assignee_kind = 'ai'
             and (p_c).active_ai_agent_id::text in (select jsonb_array_elements_text(p_f -> 'agentes'))))
    and (jsonb_array_length(coalesce(p_f -> 'setores', '[]'::jsonb)) = 0
         or coalesce(
              (select s.setor_id from public.crm_setor_da_conversa s where s.conversation_id = (p_c).id),
              (select d.setor_id from public.crm_setor_do_dispositivo d where d.channel_session_id = (p_c).channel_session_id)
            )::text in (select jsonb_array_elements_text(p_f -> 'setores')))
    -- 7. grupos de WhatsApp
    and (case p_f ->> 'grupos' when 'conversas' then not (p_c).is_group when 'grupos' then (p_c).is_group else true end)
    -- 8. canais e dispositivos
    and (jsonb_array_length(coalesce(p_f -> 'canais', '[]'::jsonb)) = 0
         or (p_c).channel_session_id::text in (select jsonb_array_elements_text(p_f -> 'canais')))
    -- 9. contatos › tags (as do contato, sem caixa: a 5b da 9102)
    and (p_f -> 'tags' is null
         or exists (select 1 from public.contacts ct
                     where ct.id = (p_c).contact_id and public.fn_escale_tags_passam(ct.tags, p_f -> 'tags')))
    -- 10. negócios do contato
    and (p_f -> 'negocio' is null
         or public.fn_escale_negocio_da_fila_passa((p_c).organization_id, (p_c).contact_id, p_f -> 'negocio'))
$$;

-- ── 3. A página da fila: ordem e cursor por chave ────────────────────────────
create or replace function public.fn_escale_fila_da_casca(
  p_org uuid,
  p_filtros jsonb,
  p_ordem text default 'interacao',
  p_depois_sort timestamptz default null,
  p_depois_id uuid default null,
  p_depois_nulo boolean default false,
  p_limite integer default 51
)
returns setof public.conversations
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.*
    from public.conversations c
   where c.organization_id = p_org
     and public.fn_escale_conversa_passa(c, coalesce(p_filtros, '{}'::jsonb))
     and (p_depois_id is null
          or (p_ordem = 'espera' and (
                (not p_depois_nulo and (c.awaiting_since > p_depois_sort
                                        or (c.awaiting_since = p_depois_sort and c.id > p_depois_id)
                                        or c.awaiting_since is null))
                or (p_depois_nulo and c.awaiting_since is null and c.id > p_depois_id)))
          or (p_ordem <> 'espera' and (
                (not p_depois_nulo and (c.last_message_at < p_depois_sort
                                        or (c.last_message_at = p_depois_sort and c.id < p_depois_id)
                                        or c.last_message_at is null))
                or (p_depois_nulo and c.last_message_at is null and c.id < p_depois_id))))
   order by
     case when p_ordem = 'espera' then c.awaiting_since end asc nulls last,
     case when p_ordem = 'espera' then c.id end asc,
     case when p_ordem <> 'espera' then c.last_message_at end desc nulls last,
     case when p_ordem <> 'espera' then c.id end desc
   limit least(greatest(coalesce(p_limite, 51), 1), 101)
$$;

create or replace function public.fn_escale_contar_fila_da_casca(p_org uuid, p_filtros jsonb)
returns integer
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select count(*)::integer
    from public.conversations c
   where c.organization_id = p_org
     and public.fn_escale_conversa_passa(c, coalesce(p_filtros, '{}'::jsonb))
$$;

-- ── 4. As ações em massa ─────────────────────────────────────────────────────
create table if not exists public.crm_acoes_em_massa_conversas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  acao text not null,
  parametros jsonb not null default '{}'::jsonb,
  status text not null default 'preparando',
  total integer not null default 0,
  feitos integer not null default 0,
  falhas integer not null default 0,
  erros jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_acoes_em_massa_conversas_acao_valida
    check (acao in ('status', 'atendente', 'setor', 'incluir_tag', 'remover_tag')),
  constraint crm_acoes_em_massa_conversas_status_valido
    check (status in ('preparando', 'na_fila', 'processando', 'concluida', 'falhou')),
  constraint crm_acoes_em_massa_conversas_parametros_objeto
    check (jsonb_typeof(parametros) = 'object' and octet_length(parametros::text) <= 8192),
  constraint crm_acoes_em_massa_conversas_erros_lista
    check (jsonb_typeof(erros) = 'array' and octet_length(erros::text) <= 32768),
  constraint crm_acoes_em_massa_conversas_contagens
    check (total between 0 and 100000 and feitos >= 0 and falhas >= 0),
  constraint crm_acoes_em_massa_conversas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_acoes_em_massa_conversas_pessoa
  on public.crm_acoes_em_massa_conversas (user_id, organization_id, created_at desc);

-- Sem FK na conversa: a conversa pode ser apagada enquanto o lote anda.
create table if not exists public.crm_acoes_em_massa_conversas_itens (
  acao_id uuid not null references public.crm_acoes_em_massa_conversas(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  posicao integer not null,
  feito boolean not null default false,
  primary key (acao_id, conversation_id)
);
create index if not exists idx_crm_acoes_em_massa_conversas_itens_fila
  on public.crm_acoes_em_massa_conversas_itens (acao_id, feito, posicao);

alter table public.crm_acoes_em_massa_conversas enable row level security;
alter table public.crm_acoes_em_massa_conversas_itens enable row level security;
drop policy if exists crm_acoes_em_massa_conversas_select on public.crm_acoes_em_massa_conversas;
drop policy if exists crm_acoes_em_massa_conversas_insert on public.crm_acoes_em_massa_conversas;
drop policy if exists crm_acoes_em_massa_conversas_preparo on public.crm_acoes_em_massa_conversas;
drop policy if exists crm_acoes_em_massa_conversas_itens_select on public.crm_acoes_em_massa_conversas_itens;
drop policy if exists crm_acoes_em_massa_conversas_itens_insert on public.crm_acoes_em_massa_conversas_itens;

-- Cada um vê as suas.
create policy crm_acoes_em_massa_conversas_select on public.crm_acoes_em_massa_conversas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );
-- Só quem tem "Ações em massa" pede; nasce preparando e zerada.
create policy crm_acoes_em_massa_conversas_insert on public.crm_acoes_em_massa_conversas
  for insert with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and public.fn_crm_pode(organization_id, 'CHAT_BULK_ACTIONS')
    and user_id = auth.uid()
    and status = 'preparando'
    and total = 0 and feitos = 0 and falhas = 0
  );
-- Quem pediu só fecha o preparo; o resto é do consumidor (service role).
create policy crm_acoes_em_massa_conversas_preparo on public.crm_acoes_em_massa_conversas
  for update
  using (
    (organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid() and status = 'preparando'
  )
  with check (
    (organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid()
    and status in ('preparando', 'na_fila') and feitos = 0 and falhas = 0
  );
create policy crm_acoes_em_massa_conversas_itens_select on public.crm_acoes_em_massa_conversas_itens
  for select using (
    exists (select 1 from public.crm_acoes_em_massa_conversas a
             where a.id = crm_acoes_em_massa_conversas_itens.acao_id and a.user_id = auth.uid())
  );
create policy crm_acoes_em_massa_conversas_itens_insert on public.crm_acoes_em_massa_conversas_itens
  for insert with check (
    exists (select 1 from public.crm_acoes_em_massa_conversas a
             where a.id = crm_acoes_em_massa_conversas_itens.acao_id
               and a.organization_id = crm_acoes_em_massa_conversas_itens.organization_id
               and a.user_id = auth.uid()
               and a.status = 'preparando')
  );

revoke all on public.crm_acoes_em_massa_conversas from anon;
revoke all on public.crm_acoes_em_massa_conversas_itens from anon;
grant select, insert, update on public.crm_acoes_em_massa_conversas to authenticated;
grant select, insert on public.crm_acoes_em_massa_conversas_itens to authenticated;
grant all on public.crm_acoes_em_massa_conversas to service_role;
grant all on public.crm_acoes_em_massa_conversas_itens to service_role;

drop trigger if exists trg_crm_acoes_em_massa_conversas_updated_at on public.crm_acoes_em_massa_conversas;
create trigger trg_crm_acoes_em_massa_conversas_updated_at
  before update on public.crm_acoes_em_massa_conversas
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_acoes_em_massa_conversas is
  'Ações em massa da fila de Conversas da casca (fork Escale, migration 9204; B8). Quem tem "Ações em massa" (fn_crm_pode CHAT_BULK_ACTIONS) cria e vê as suas; até o limite imediato a rota executa, acima o consumidor do event_log processa com o service role.';

-- ── 5. Pedir a ação: uma transação, com a RLS de quem pede ───────────────────
create or replace function public.fn_escale_criar_acao_em_massa_de_conversas(
  p_org uuid,
  p_acao text,
  p_parametros jsonb,
  p_ids uuid[],
  p_filtros jsonb,
  p_quantidade integer,
  p_excluidos uuid[],
  p_imediato_ate integer default 50
)
returns table (acao_id uuid, quantidade integer, status text)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_total integer;
begin
  if not public.fn_crm_pode(p_org, 'CHAT_BULK_ACTIONS') then
    raise exception 'acao_em_massa_sem_permissao: sem a permissão Ações em massa' using errcode = 'P0001';
  end if;

  insert into public.crm_acoes_em_massa_conversas (organization_id, user_id, acao, parametros)
  values (p_org, auth.uid(), p_acao, coalesce(p_parametros, '{}'::jsonb))
  returning id into v_id;

  if p_ids is not null then
    insert into public.crm_acoes_em_massa_conversas_itens (acao_id, organization_id, conversation_id, posicao)
    select v_id, p_org, c.id, row_number() over (order by c.last_message_at desc nulls last, c.id desc)
      from public.conversations c
     where c.organization_id = p_org
       and c.id = any(p_ids);
  else
    insert into public.crm_acoes_em_massa_conversas_itens (acao_id, organization_id, conversation_id, posicao)
    select v_id, p_org, s.id, s.posicao
      from (
        select c.id, row_number() over (order by c.last_message_at desc nulls last, c.id desc) as posicao
          from public.conversations c
         where c.organization_id = p_org
           and public.fn_escale_conversa_passa(c, coalesce(p_filtros, '{}'::jsonb))
      ) s
     where s.posicao <= least(coalesce(p_quantidade, 100001), 100001)
       and not (s.id = any(coalesce(p_excluidos, '{}'::uuid[])));
  end if;
  get diagnostics v_total = row_count;

  if v_total = 0 then
    raise exception 'acao_em_massa_vazia: nenhuma conversa selecionada' using errcode = 'P0001';
  end if;
  if v_total > 100000 then
    raise exception 'acao_em_massa_grande_demais: no máximo 100.000 conversas por ação' using errcode = 'P0001';
  end if;

  update public.crm_acoes_em_massa_conversas set total = v_total, status = 'na_fila' where id = v_id;

  if v_total > coalesce(p_imediato_ate, 50) then
    perform public.emit_event(
      'conversas.acao_em_massa_requested',
      'crm_acao_em_massa_conversas',
      v_id,
      jsonb_build_object('acao_id', v_id),
      '{}'::jsonb,
      p_org
    );
  end if;

  return query select v_id, v_total, 'na_fila'::text;
end;
$$;

revoke all on function public.fn_escale_negocio_da_fila_passa(uuid, uuid, jsonb) from public, anon;
revoke all on function public.fn_escale_conversa_passa(public.conversations, jsonb) from public, anon;
revoke all on function public.fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer) from public, anon;
revoke all on function public.fn_escale_contar_fila_da_casca(uuid, jsonb) from public, anon;
revoke all on function public.fn_escale_criar_acao_em_massa_de_conversas(uuid, text, jsonb, uuid[], jsonb, integer, uuid[], integer) from public, anon;
grant execute on function public.fn_escale_negocio_da_fila_passa(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_conversa_passa(public.conversations, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer) to authenticated, service_role;
grant execute on function public.fn_escale_contar_fila_da_casca(uuid, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_criar_acao_em_massa_de_conversas(uuid, text, jsonb, uuid[], jsonb, integer, uuid[], integer) to authenticated, service_role;

comment on function public.fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer) is
  'Fork Escale (9204): uma página da fila de Conversas da casca, com o filtro compilado do painel, a ordem (interacao | espera) e o cursor por chave. Invoker: a RLS de conversations de quem olha decide.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
