-- manifest: **Insights de automação (fork Escale, Fase 5C).** Funções de leitura, todas `security invoker` (a RLS de `automation_rule_runs`, `event_log`, `crm_leads`, `contacts`, `calendar_appointments` e `conversations` decide o que quem olha vê): `fn_escale_resumo_da_automacao` conta as execuções de uma regra no período por status e, por passo, por resultado (`actions_result` alinhado com `actions`), sem contar a espera pela janela; `fn_escale_execucoes_da_automacao` lista as execuções com o contato e o negócio do evento de origem (o mesmo caminho do `buildContext` do motor), com filtro por status ou pelo resultado de um ou mais passos (o passo "Ações" da casca junta várias ações), busca pelo nome do contato e paginação (até 5.001 linhas, para o CSV saber que passou do teto). Ajudantes imutáveis `fn_escale_execucao_e_espera`, `fn_escale_uuid_ou_nulo` e `fn_escale_sem_acento`. Sem tabela nova e sem índice novo: o `idx_automation_rule_runs_rule (rule_id, created_at desc)` da 0038 serve. O motor e `automation_rule_runs` não mudam.
-- ---- FORK ESCALE · insights de automação (migration 9707) ----

-- A espera pela janela (lib/automation/engine.ts, registrarAdiamento): nenhum passo foi tentado.
create or replace function public.fn_escale_execucao_e_espera(p_status text, p_resultados jsonb)
returns boolean language sql immutable set search_path = public, pg_temp as $$
  select coalesce(
    p_status = 'adiado'
    and jsonb_typeof(p_resultados) = 'array'
    and jsonb_array_length(p_resultados) = 1
    and p_resultados -> 0 -> 'detail' ->> 'reason' = 'fora_da_janela_de_envio',
    false);
$$;

create or replace function public.fn_escale_uuid_ou_nulo(p text)
returns uuid language sql immutable set search_path = public, pg_temp as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end;
$$;

create or replace function public.fn_escale_sem_acento(p text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select translate(lower(coalesce(p, '')),
    'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
$$;

create or replace function public.fn_escale_resumo_da_automacao(p_regra uuid, p_desde timestamptz)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  with execucoes as (
    select r.status, r.actions_result
    from public.automation_rule_runs r
    where r.rule_id = p_regra and (p_desde is null or r.created_at >= p_desde)
  ),
  contagem as (
    select count(*) as total,
           count(*) filter (where status = 'success') as sucesso,
           count(*) filter (where status = 'partial') as parcial,
           count(*) filter (where status = 'failed') as falhou,
           count(*) filter (where status = 'adiado') as adiado
    from execucoes
  ),
  passos as (
    select (a.ordem - 1)::int as indice,
           coalesce(a.item ->> 'type', '') as tipo,
           count(*) filter (where a.item ->> 'status' = 'success') as sucesso,
           count(*) filter (where a.item ->> 'status' in ('failed', 'skipped')) as erro,
           count(*) filter (where a.item ->> 'status' = 'postponed') as esperando
    from execucoes e
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(e.actions_result) = 'array' then e.actions_result else '[]'::jsonb end
    ) with ordinality as a(item, ordem)
    where not public.fn_escale_execucao_e_espera(e.status, e.actions_result)
    group by 1, 2
  )
  select jsonb_build_object(
    'total', c.total, 'sucesso', c.sucesso, 'parcial', c.parcial, 'falhou', c.falhou, 'adiado', c.adiado,
    'ultima', (select max(r.created_at) from public.automation_rule_runs r where r.rule_id = p_regra),
    'passos', coalesce((select jsonb_agg(jsonb_build_object(
                 'indice', p.indice, 'tipo', p.tipo, 'sucesso', p.sucesso, 'erro', p.erro, 'esperando', p.esperando)
               order by p.indice, p.tipo) from passos p), '[]'::jsonb))
  from contagem c;
$$;

-- `p_passos` e `p_tipos` andam juntos (mesmo tamanho): a execução entra se ALGUM desses passos tem o
-- tipo esperado e um resultado da lista. O passo "Ações" da casca manda todas as ações dele.
create or replace function public.fn_escale_execucoes_da_automacao(
  p_regra uuid,
  p_desde timestamptz,
  p_situacoes text[],
  p_passos int[],
  p_tipos text[],
  p_resultados text[],
  p_busca text,
  p_limite int,
  p_deslocamento int
)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  with execucoes as (
    select r.id, r.status, r.actions_result, r.created_at, r.event_id,
           e.entity_kind, e.entity_id, e.payload
    from public.automation_rule_runs r
    left join public.event_log e on e.id = r.event_id
    where r.rule_id = p_regra
      and (p_desde is null or r.created_at >= p_desde)
      and (p_passos is not null or p_situacoes is null or r.status = any (p_situacoes))
      and (p_passos is null or (
        not public.fn_escale_execucao_e_espera(r.status, r.actions_result)
        and exists (
          select 1 from unnest(p_passos, p_tipos) as s(indice, tipo)
          where r.actions_result -> s.indice ->> 'type' = s.tipo
            and (case r.actions_result -> s.indice ->> 'status'
                   when 'success' then 'sucesso'
                   when 'failed' then 'erro'
                   when 'skipped' then 'erro'
                   when 'postponed' then 'esperando'
                 end) = any (coalesce(p_resultados, array['sucesso', 'erro', 'esperando'])))))
  ),
  alvos as (
    select x.*,
      case when x.entity_kind in ('crm_lead', 'lead')
           then coalesce(x.entity_id, public.fn_escale_uuid_ou_nulo(x.payload ->> 'lead_id'))
           else public.fn_escale_uuid_ou_nulo(x.payload ->> 'lead_id') end as lead_id,
      case when x.entity_kind = 'contact' then x.entity_id
           else public.fn_escale_uuid_ou_nulo(x.payload ->> 'contact_id') end as contato_direto,
      case when x.entity_kind = 'calendar_appointment' then x.entity_id end as compromisso_id,
      public.fn_escale_uuid_ou_nulo(x.payload ->> 'conversation_id') as conversa_id
    from execucoes x
  ),
  resolvidas as (
    select a.id, a.status, a.actions_result, a.created_at, a.event_id,
           l.id as negocio_id, l.title as negocio_titulo,
           c.id as contato_id, c.name as contato_nome, c.phone_number as contato_telefone,
           c.email as contato_email, (c.avatar_storage_path is not null) as contato_tem_foto
    from alvos a
    left join public.crm_leads l on l.id = a.lead_id
    left join public.calendar_appointments ap on ap.id = a.compromisso_id
    left join public.conversations cv on cv.id = a.conversa_id
    left join public.contacts c on c.id = coalesce(l.contact_id, a.contato_direto, ap.contact_id, cv.contact_id)
    where p_busca is null or btrim(p_busca) = ''
       or strpos(public.fn_escale_sem_acento(c.name), public.fn_escale_sem_acento(btrim(p_busca))) > 0
  )
  select jsonb_build_object(
    'total', (select count(*) from resolvidas),
    'linhas', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at desc, p.id desc)
      from (select * from resolvidas order by created_at desc, id desc
            limit least(greatest(coalesce(p_limite, 10), 1), 5001)
            offset greatest(coalesce(p_deslocamento, 0), 0)) p), '[]'::jsonb));
$$;

revoke all on function public.fn_escale_execucao_e_espera(text, jsonb) from public, anon;
revoke all on function public.fn_escale_uuid_ou_nulo(text) from public, anon;
revoke all on function public.fn_escale_sem_acento(text) from public, anon;
revoke all on function public.fn_escale_resumo_da_automacao(uuid, timestamptz) from public, anon;
revoke all on function public.fn_escale_execucoes_da_automacao(uuid, timestamptz, text[], int[], text[], text[], text, int, int) from public, anon;
grant execute on function public.fn_escale_execucao_e_espera(text, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_uuid_ou_nulo(text) to authenticated, service_role;
grant execute on function public.fn_escale_sem_acento(text) to authenticated, service_role;
grant execute on function public.fn_escale_resumo_da_automacao(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.fn_escale_execucoes_da_automacao(uuid, timestamptz, text[], int[], text[], text[], text, int, int) to authenticated, service_role;

comment on function public.fn_escale_resumo_da_automacao(uuid, timestamptz) is
  'Fork Escale (9707): contagens da aba Insights (lib/escale/automacoes/insights). Invoker: a RLS decide.';
comment on function public.fn_escale_execucoes_da_automacao(uuid, timestamptz, text[], int[], text[], text[], text, int, int) is
  'Fork Escale (9707): listagem de execuções da aba Insights com contato e negócio do evento. Invoker: a RLS decide.';

notify pgrst, 'reload schema';
