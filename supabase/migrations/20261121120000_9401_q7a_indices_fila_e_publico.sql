-- manifest: **Revisão Q7a: índices, fila e público (fork Escale).** Índices nas FKs que a cascata e as funções varriam (`crm_atividades_do_negocio` por `lead_id` e `atividade_id`; `crm_mensagens_agendadas` por contato, conversa e dispositivo; `crm_arquivos_do_contato` por negócio; `crm_setor_da_conversa` pelo setor anterior; `crm_atividades_da_etapa` pela etapa) e o da fila por interação (`conversations (organization_id, last_message_at desc nulls last, id desc)`); `fn_escale_admin_unico` passa a contar só admin que aceitou o convite (convite pendente travava a exportação do único admin); `fn_escale_ids_do_publico` (invoker, fechada ao `anon`) devolve o público inteiro num `uuid[]` numa chamada só, no lugar das páginas com OFFSET que recalculavam o filtro a cada página; `fn_escale_fila_da_casca` vira plpgsql com uma consulta por ordem e `ORDER BY` direto nas colunas, mesmo resultado, para o índice cortar no `LIMIT`.
-- ---- FORK ESCALE · revisão Q7a: índices, fila e público (migration 9401) ----
-- 9401: revisão de qualidade Q7a (fork Escale). Só índices e funções; nenhum dado muda.

-- ── 1. Índices das FKs (G7-1, G7-7, G7-14) ──────────────────────────────────
-- Sem eles, excluir negócio, contato, conversa, dispositivo, setor ou etapa (e a
-- `fn_escale_credito_do_ganho`, que filtra só por `lead_id`) lia a tabela inteira.
-- Nas colunas anuláveis o índice é parcial: a cascata procura por igualdade.
create index if not exists idx_crm_atividades_do_negocio_lead_id
  on public.crm_atividades_do_negocio (lead_id);
create index if not exists idx_crm_atividades_do_negocio_atividade
  on public.crm_atividades_do_negocio (atividade_id)
  where atividade_id is not null;

create index if not exists idx_crm_mensagens_agendadas_contato
  on public.crm_mensagens_agendadas (contact_id);
create index if not exists idx_crm_mensagens_agendadas_conversa_fk
  on public.crm_mensagens_agendadas (conversation_id);
create index if not exists idx_crm_mensagens_agendadas_dispositivo
  on public.crm_mensagens_agendadas (channel_session_id);

create index if not exists idx_crm_arquivos_do_contato_negocio
  on public.crm_arquivos_do_contato (organization_id, lead_id)
  where lead_id is not null;
create index if not exists idx_crm_setor_da_conversa_setor_anterior
  on public.crm_setor_da_conversa (organization_id, setor_anterior_id)
  where setor_anterior_id is not null;
create index if not exists idx_crm_atividades_da_etapa_stage
  on public.crm_atividades_da_etapa (stage_id);

-- ── 2. O único admin conta só quem aceitou o convite (B7-2) ──────────────────
-- Um convite de admin pendente (accepted_at nulo) fazia o único admin real ser
-- "não único": a exportação dele esperava um aprovador que não existe. A régua
-- é a da 9013 e da 9014 (aceito e não revogado).
create or replace function public.fn_escale_admin_unico(p_org uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.fn_role_at_least(p_org, 'admin')
     and (select count(*)
            from public.user_organizations u
           where u.organization_id = p_org
             and u.role = 'admin'
             and u.accepted_at is not null
             and u.revoked_at is null) = 1
$$;

revoke all on function public.fn_escale_admin_unico(uuid) from public, anon;
grant execute on function public.fn_escale_admin_unico(uuid) to authenticated, service_role;

-- ── 3. O público inteiro numa chamada (G7-2) ─────────────────────────────────
-- Os ids de `fn_escale_contatos_do_publico` na ordem dela, num `uuid[]` numa
-- linha só: o `max_rows` do PostgREST corta linhas, não o tamanho do array, e o
-- filtro é calculado uma vez (as páginas com OFFSET o recalculavam a cada uma).
-- Mesma permissão da função de origem (gerente ou acima, ou o service role).
create or replace function public.fn_escale_ids_do_publico(p_org uuid, p_publico jsonb)
returns uuid[]
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(p.contact_id order by p.posicao), '{}'::uuid[])
    from public.fn_escale_contatos_do_publico(p_org, p_publico) p
$$;

revoke all on function public.fn_escale_ids_do_publico(uuid, jsonb) from public, anon;
grant execute on function public.fn_escale_ids_do_publico(uuid, jsonb) to authenticated, service_role;

-- ── 4. A página da fila: uma consulta por ordem (G7-3) ───────────────────────
-- O mesmo filtro, o mesmo cursor e a mesma ordem da 9204, mas o `ORDER BY` é
-- direto nas colunas (não por `CASE`), então o banco percorre o índice da ordem
-- e para ao juntar o `LIMIT`, em vez de filtrar e ordenar a organização inteira.
-- `p_ordem` diferente de 'espera' é a ordem por interação, como na 9204.
create index if not exists idx_conversations_org_fila_interacao
  on public.conversations (organization_id, last_message_at desc nulls last, id desc);

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
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_filtros jsonb := coalesce(p_filtros, '{}'::jsonb);
  v_limite integer := least(greatest(coalesce(p_limite, 51), 1), 101);
begin
  if p_ordem = 'espera' then
    return query
      select c.*
        from public.conversations c
       where c.organization_id = p_org
         and (p_depois_id is null
              or (not p_depois_nulo and (c.awaiting_since > p_depois_sort
                                         or (c.awaiting_since = p_depois_sort and c.id > p_depois_id)
                                         or c.awaiting_since is null))
              or (p_depois_nulo and c.awaiting_since is null and c.id > p_depois_id))
         and public.fn_escale_conversa_passa(c, v_filtros)
       order by c.awaiting_since asc nulls last, c.id asc
       limit v_limite;
  else
    return query
      select c.*
        from public.conversations c
       where c.organization_id = p_org
         and (p_depois_id is null
              or (not p_depois_nulo and (c.last_message_at < p_depois_sort
                                         or (c.last_message_at = p_depois_sort and c.id < p_depois_id)
                                         or c.last_message_at is null))
              or (p_depois_nulo and c.last_message_at is null and c.id < p_depois_id))
         and public.fn_escale_conversa_passa(c, v_filtros)
       order by c.last_message_at desc nulls last, c.id desc
       limit v_limite;
  end if;
end
$$;

revoke all on function public.fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer) from public, anon;
grant execute on function public.fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer) to authenticated, service_role;

comment on function public.fn_escale_ids_do_publico(uuid, jsonb) is
  'Fork Escale (9401): os ids do público da campanha, na ordem, num uuid[] numa chamada só. Invoker; só gerente ou acima, ou o service role.';

notify pgrst, 'reload schema';
