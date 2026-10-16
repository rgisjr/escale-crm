-- manifest: **Filtros salvos do quadro de negócios (fork Escale, Fase 1D).** Tabela nova `crm_filtros_salvos`: cada pessoa salva os filtros de UMA origem (`pipeline_id`) ou de UMA visualização (`view_id`), com nome (único por pessoa e alvo, sem olhar caixa), os critérios (`criterios`, jsonb validado pela rota) e `compartilhado`. RLS: quem criou vê e escreve (escrever exige ser membro da organização com papel `viewer` ou acima, via `fn_role_at_least` — a cerca de RBAC da 0150 recusa policy ALL só de tenancy), e só grava em origem/visualização que ENXERGA (o WITH CHECK confere o alvo sob a RLS de quem grava, porque o navegador também chega ao PostgREST); o filtro compartilhado é visto por quem enxerga a origem ou a visualização, porque a policy consulta `crm_pipelines`/`crm_pipeline_views` com a sessão de quem olha (nenhuma permissão copiada). FKs compostas com `on delete cascade` para a origem, a visualização e `user_organizations`. Trigger `trg_crm_filtros_salvos_limite` (função `fn_crm_filtros_salvos_limite`, security invoker): no máximo 20 filtros por pessoa em cada origem ou visualização, contados nas linhas cruas e serializados por advisory lock (vale para o INSERT e para o UPDATE que muda o alvo). Função `fn_escale_atividades_concluidas` (security invoker): quantas tarefas concluídas cada negócio tem, para o filtro e a ordenação do quadro.
-- 9004: filtros salvos do quadro e contagem de atividades concluídas (fork Escale).

create table if not exists public.crm_filtros_salvos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  pipeline_id uuid,
  view_id uuid,
  nome text not null,
  compartilhado boolean not null default false,
  criterios jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Um filtro é de uma origem OU de uma visualização, nunca dos dois nem de nenhum.
  constraint crm_filtros_salvos_um_alvo check ((pipeline_id is null) <> (view_id is null)),
  constraint crm_filtros_salvos_nome_valido check (char_length(btrim(nome)) between 1 and 60),
  constraint crm_filtros_salvos_criterios_objeto check (jsonb_typeof(criterios) = 'object'),
  constraint crm_filtros_salvos_criterios_tamanho check (octet_length(criterios::text) <= 16384),
  constraint crm_filtros_salvos_dono_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade,
  constraint crm_filtros_salvos_origem_fk foreign key (organization_id, pipeline_id)
    references public.crm_pipelines (organization_id, id) on delete cascade,
  constraint crm_filtros_salvos_visualizacao_fk foreign key (organization_id, view_id)
    references public.crm_pipeline_views (organization_id, id) on delete cascade
);

-- Nome único por pessoa e alvo, sem olhar caixa (a rota confere antes, também
-- sem acento); o índice é a guarda contra corrida entre duas abas.
create unique index if not exists uq_crm_filtros_salvos_nome
  on public.crm_filtros_salvos (organization_id, user_id, coalesce(pipeline_id, view_id), lower(btrim(nome)));

create index if not exists idx_crm_filtros_salvos_origem
  on public.crm_filtros_salvos (organization_id, pipeline_id);
create index if not exists idx_crm_filtros_salvos_visualizacao
  on public.crm_filtros_salvos (organization_id, view_id);
create index if not exists idx_crm_filtros_salvos_dono
  on public.crm_filtros_salvos (user_id, organization_id);

alter table public.crm_filtros_salvos enable row level security;

drop policy if exists crm_filtros_salvos_select on public.crm_filtros_salvos;
drop policy if exists crm_filtros_salvos_dono_write on public.crm_filtros_salvos;

-- Quem vê: quem criou; e, se compartilhado, quem enxerga a origem ou a
-- visualização. As duas subconsultas rodam sob a RLS de quem olha — é isso
-- que faz o filtro seguir a permissão da origem/visualização sem copiá-la.
create policy crm_filtros_salvos_select on public.crm_filtros_salvos
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (user_id = auth.uid()
             or (compartilhado
                 and (exists (select 1 from public.crm_pipelines p where p.id = crm_filtros_salvos.pipeline_id)
                      or exists (select 1 from public.crm_pipeline_views v where v.id = crm_filtros_salvos.view_id)))))
  );

-- Quem escreve: só quem criou, dentro da própria organização. Qualquer membro
-- (viewer ou acima) salva os seus filtros (decisão de 15/10), e é isso que o
-- fn_role_at_least(organization_id, 'viewer') diz, no USING e no WITH CHECK: a
-- régua de papel fica explícita, como pede a cerca de RBAC da 0150 (policy ALL
-- só de tenancy não entra). O suporte somente leitura para nas travas
-- support_write_* (chamada no fim deste arquivo).
-- USING só olha o dono: quem perdeu a visibilidade do alvo ainda apaga o que é
-- seu. O WITH CHECK (todo INSERT e todo UPDATE) exige, além disso, que o alvo
-- seja VISÍVEL para quem grava, sob a RLS dele: o navegador fala com o
-- PostgREST sem passar pela rota, e sem isso um membro plantaria um filtro
-- compartilhado numa origem/visualização que ele não enxerga (ex.: 'escolhidos').
create policy crm_filtros_salvos_dono_write on public.crm_filtros_salvos
  using (
    (organization_id in (select public.fn_user_org_ids())
     and public.fn_role_at_least(organization_id, 'viewer'))
    and user_id = auth.uid()
  )
  with check (
    (organization_id in (select public.fn_user_org_ids())
     and public.fn_role_at_least(organization_id, 'viewer'))
    and user_id = auth.uid()
    and (crm_filtros_salvos.pipeline_id is null
         or exists (select 1 from public.crm_pipelines p where p.id = crm_filtros_salvos.pipeline_id))
    and (crm_filtros_salvos.view_id is null
         or exists (select 1 from public.crm_pipeline_views v where v.id = crm_filtros_salvos.view_id))
  );

revoke all on public.crm_filtros_salvos from anon;
grant select, insert, update, delete on public.crm_filtros_salvos to authenticated;
grant all on public.crm_filtros_salvos to service_role;

drop trigger if exists trg_crm_filtros_salvos_updated_at on public.crm_filtros_salvos;
create trigger trg_crm_filtros_salvos_updated_at
  before update on public.crm_filtros_salvos
  for each row execute function public.fn_set_updated_at();

-- Limite de 20 filtros por pessoa e alvo, NO BANCO: a rota confere antes, mas o
-- navegador também chega ao PostgREST, e duas abas correm entre o "contar" e o
-- "gravar". O advisory lock (por organização + pessoa + alvo, solto no fim da
-- transação) enfileira duas gravações do mesmo alvo; a contagem olha as linhas
-- CRUAS, inclusive as de critérios que o schema de hoje não aceita mais. Vale
-- para INSERT e para o UPDATE que muda o alvo (reapontar para um alvo cheio).
-- INVOKER: quem grava enxerga as próprias linhas pela RLS.
create or replace function public.fn_crm_filtros_salvos_limite()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_total integer;
begin
  -- Reapontar sem trocar de pessoa nem de alvo (ou mexer só em outra coluna) não
  -- aumenta a contagem de ninguém: sai sem lock e sem contar. Senão, quem já está
  -- nos 20 não conseguiria nem regravar a própria linha.
  if tg_op = 'UPDATE'
     and (new.organization_id, new.user_id, coalesce(new.pipeline_id, new.view_id))
         is not distinct from (old.organization_id, old.user_id, coalesce(old.pipeline_id, old.view_id)) then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'crm_filtros_salvos:' || new.organization_id::text || ':' || new.user_id::text || ':'
      || coalesce(coalesce(new.pipeline_id, new.view_id)::text, ''), 0));
  select count(*) into v_total
    from public.crm_filtros_salvos f
   where f.organization_id = new.organization_id
     and f.user_id = new.user_id
     and coalesce(f.pipeline_id, f.view_id) = coalesce(new.pipeline_id, new.view_id)
     and (tg_op = 'INSERT' or f.id <> old.id);
  if v_total >= 20 then
    raise exception 'crm_filtros_salvos_limite: no máximo 20 filtros salvos por pessoa em cada origem ou visualização'
      using errcode = 'check_violation', constraint = 'crm_filtros_salvos_limite';
  end if;
  return new;
end;
$$;

revoke all on function public.fn_crm_filtros_salvos_limite() from public, anon;

drop trigger if exists trg_crm_filtros_salvos_limite on public.crm_filtros_salvos;
create trigger trg_crm_filtros_salvos_limite
  before insert or update of organization_id, user_id, pipeline_id, view_id on public.crm_filtros_salvos
  for each row execute function public.fn_crm_filtros_salvos_limite();

-- Quantas tarefas CONCLUÍDAS cada negócio tem. Contar no banco, e não trazer as
-- linhas: o PostgREST corta toda leitura em 1000 linhas sem erro, e um lote de
-- 100 negócios com histórico longo passaria disso calado. INVOKER: a RLS de
-- crm_tasks de quem chama vale.
create or replace function public.fn_escale_atividades_concluidas(p_org uuid, p_leads uuid[])
returns table (lead_id uuid, total integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select t.lead_id, count(*)::integer
    from public.crm_tasks t
   where t.organization_id = p_org
     and t.lead_id = any(p_leads)
     and t.status = 'done'
   group by t.lead_id
$$;

revoke all on function public.fn_escale_atividades_concluidas(uuid, uuid[]) from public, anon;
grant execute on function public.fn_escale_atividades_concluidas(uuid, uuid[]) to authenticated, service_role;

comment on table public.crm_filtros_salvos is
  'Filtros salvos do quadro de negócios (fork Escale, migration 9004): de uma origem (pipeline_id) ou de uma visualização (view_id). Pessoal ou compartilhado; o compartilhado é visto por quem enxerga a origem/visualização (RLS com a sessão de quem olha). Só quem criou escreve.';
comment on function public.fn_crm_filtros_salvos_limite() is
  'Trigger de crm_filtros_salvos (fork Escale, migration 9004): no máximo 20 filtros por pessoa em cada origem ou visualização, contados nas linhas cruas e serializados por advisory lock. Security invoker. Erro: check_violation com a constraint crm_filtros_salvos_limite (a rota mostra a mensagem do limite).';
comment on function public.fn_escale_atividades_concluidas(uuid, uuid[]) is
  'Conta as tarefas concluídas (crm_tasks.status = done) de cada negócio de p_leads na organização p_org. Security invoker. Chamador: lib/escale/filtros/ler-dados-do-quadro.ts (rota do quadro).';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
-- Na cadeia de migrations, esta chamada é o que dá as três travas
-- support_write_* à tabela nova. No baseline.sql o bloco mora ANTES da última
-- chamada do arquivo, que também a cobre; chamar aqui é idempotente.
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
