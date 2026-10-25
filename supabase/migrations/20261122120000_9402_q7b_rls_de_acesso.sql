-- manifest: **Revisão Q7b: regras de acesso (RLS) do fork Escale.** Mesma visibilidade para todo papel, com a conta feita uma vez por comando: `fn_escale_meus_papeis()` (o papel em cada organização, lido uma vez) e `fn_escale_origens_que_vejo()` (as origens acessíveis e a regra de cada uma) substituem, nas policies de `crm_leads`, `crm_pipelines` e `crm_stages`, as chamadas por linha de `fn_escale_pode_ver_negocio`/`fn_escale_tem_acesso_a_origem`; atividades, links e notas do negócio deixam só o `exists` em `crm_leads` (a RLS dele decide); a policy de setor de `conversations` resolve papel e permissão uma vez por organização (`fn_crm_orgs_que_veem_pelo_setor()`) e só depois olha o setor da conversa (`fn_crm_conversa_no_meu_setor`); as quatro funções de acesso leem o papel uma vez; as 35 policies `crm_*` com `auth.uid()` solto passam a `(select auth.uid())`; e a leitura da distribuição de dono ganha o termo `fn_is_platform_admin()` (o suporte somente leitura passa a ver, como nas demais tabelas do fork).
-- ---- FORK ESCALE · revisão Q7b: regras de acesso (migration 9402) ----
-- 9402: revisão de qualidade Q7b (fork Escale). Só funções e policies; nenhum dado muda.
-- A visibilidade resultante é a mesma de antes para todo papel (viewer, agent,
-- manager, admin, suporte, platform admin, outra organização), com UMA exceção
-- deliberada: a leitura da distribuição de dono para o platform admin (B7-9).
-- Prova: tests/invariants/escale-q7b-9402.test.ts compara, linha a linha, o banco
-- sem este bloco e o banco com ele.

-- ── 1. As funções de acesso leem o papel uma vez (G7-10) ────────────────────
-- Antes cada uma chamava fn_user_role_in_org (support_context + user_organizations)
-- duas ou três vezes no mesmo CASE. O CTE materializado garante uma leitura só;
-- os ramos do CASE são os mesmos, na mesma ordem.
create or replace function public.fn_escale_tem_acesso_a_origem(p_org uuid, p_pipeline uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  with eu as materialized (select public.fn_user_role_in_org(p_org) as papel)
  select case
    when public.fn_is_platform_admin() then true
    when eu.papel is null then false
    when eu.papel = 'admin' then true
    else coalesce((
      select case
        when jsonb_typeof(p.settings->'escale_pessoas') = 'array'
             and jsonb_array_length(p.settings->'escale_pessoas') > 0
          then (p.settings->'escale_pessoas') ? auth.uid()::text
        else public.fn_escale_lista_permite(g.settings->'escale_pessoas')
      end
      from public.crm_pipelines p
      left join public.crm_pipeline_groups g on g.id = p.group_id and g.organization_id = p.organization_id
      where p.id = p_pipeline and p.organization_id = p_org), false)
  end
  from eu;
$$;

revoke all on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) from public, anon;
grant execute on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) to authenticated, service_role;

create or replace function public.fn_escale_tem_acesso_ao_grupo(p_org uuid, p_grupo uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  with eu as materialized (select public.fn_user_role_in_org(p_org) as papel)
  select case
    when public.fn_is_platform_admin() then true
    when eu.papel is null then false
    when eu.papel = 'admin' then true
    when public.fn_escale_lista_permite((
      select g.settings->'escale_pessoas'
        from public.crm_pipeline_groups g
       where g.id = p_grupo and g.organization_id = p_org)) then true
    else exists (
      select 1 from public.crm_pipelines p
       where p.group_id = p_grupo and p.organization_id = p_org
         and jsonb_typeof(p.settings->'escale_pessoas') = 'array'
         and jsonb_array_length(p.settings->'escale_pessoas') > 0
         and (p.settings->'escale_pessoas') ? auth.uid()::text)
  end
  from eu;
$$;

revoke all on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) from public, anon;
grant execute on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) to authenticated, service_role;

create or replace function public.fn_escale_pode_ver_negocio(p_org uuid, p_owner_user_id uuid, p_pipeline uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  with eu as materialized (select public.fn_user_role_in_org(p_org) as papel)
  select case
    when public.fn_is_platform_admin() then true
    when eu.papel is null then false
    when not public.fn_escale_tem_acesso_a_origem(p_org, p_pipeline) then false
    when eu.papel in ('viewer','manager','admin') then true
    when p_owner_user_id = auth.uid() then true
    else case public.fn_escale_visualizacao_da_origem(p_org, p_pipeline)
      when 'all' then true
      when 'own_and_unassigned' then p_owner_user_id is null
      else false
    end
  end
  from eu;
$$;

revoke all on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) from public, anon;
grant execute on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) to authenticated, service_role;

-- fn_role_at_least lia o papel de novo a cada chamada: aqui os mesmos níveis
-- (viewer 1, agent 2, manager 3, admin 4; papel ou mínimo desconhecido = false)
-- são comparados com o papel lido uma vez.
create or replace function public.fn_crm_pode(p_org uuid, p_chave text)
returns boolean language sql stable security definer set search_path = public as $$
  with eu as materialized (select public.fn_user_role_in_org(p_org) as papel),
  niveis(papel, nivel) as (values ('viewer',1),('agent',2),('manager',3),('admin',4))
  select case
    when auth.uid() is null then false
    when eu.papel is null then false
    when eu.papel = 'admin' then true
    -- o piso de "Editar ou excluir setores" é gerente (lib/escale/conversas/permissoes.ts)
    when p_chave = 'CHAT_EDIT_TEAMS'
         and not coalesce((select n.nivel >= 3 from niveis n where n.papel = eu.papel), false) then false
    else coalesce(
      (select p.ligado from public.crm_permissoes_de_atendimento p
        where p.organization_id = p_org and p.user_id = auth.uid() and p.chave = p_chave),
      coalesce((select u.nivel >= m.nivel
                  from niveis u
                  join niveis m on m.papel = public.fn_crm_papel_padrao(p_chave)
                 where u.papel = eu.papel), false))
  end
  from eu;
$$;
revoke all on function public.fn_crm_pode(uuid, text) from public, anon;
grant execute on function public.fn_crm_pode(uuid, text) to authenticated, service_role;

-- ── 2. O que a pessoa vê, calculado uma vez por comando (G7-4, B7-1) ────────
-- O papel em cada organização em que ela tem papel (as de fn_user_org_ids: os
-- vínculos ativos e a organização do suporte ativo), lido uma vez por organização.
create or replace function public.fn_escale_meus_papeis()
returns table (organization_id uuid, papel text)
language sql stable security definer set search_path = public, pg_temp
as $$
  with eu as materialized (
    select o.org, public.fn_user_role_in_org(o.org) as papel
      from (select distinct x as org from public.fn_user_org_ids() as x) o
  )
  select eu.org, eu.papel from eu where eu.papel is not null;
$$;

revoke all on function public.fn_escale_meus_papeis() from public, anon;
grant execute on function public.fn_escale_meus_papeis() to authenticated, service_role;

-- As origens que a pessoa acessa e a regra de cada uma, no mesmo desenho de
-- fn_escale_tem_acesso_a_origem + fn_escale_pode_ver_negocio:
--   'organizacao'  admin ou platform admin: a organização inteira (para eles o
--                  acesso nem olha a origem e a regra do negócio libera tudo);
--   'tudo'         viewer/gerente, ou a origem em "todos";
--   'sem_dono'     os próprios e os sem dono ("own_and_unassigned");
--   'proprio'      só os próprios.
-- Nas policies de leitura o platform admin já é liberado antes; nas de escrita
-- (que só citam a função "_full") ele entra pela linha 'organizacao' de cada
-- organização em que tem papel, como fn_escale_tem_acesso_a_origem fazia.
create or replace function public.fn_escale_origens_que_vejo()
returns table (organization_id uuid, pipeline_id uuid, regra text)
language sql stable security definer set search_path = public, pg_temp
as $$
  with eu as materialized (select m.organization_id, m.papel from public.fn_escale_meus_papeis() m)
  select eu.organization_id, null::uuid, 'organizacao'::text
    from eu
   where eu.papel = 'admin' or public.fn_is_platform_admin()
  union all
  select p.organization_id, p.id,
         case
           when eu.papel in ('viewer','manager') then 'tudo'
           else case public.fn_escale_visualizacao_da_origem(p.organization_id, p.id)
                  when 'all' then 'tudo'
                  when 'own_and_unassigned' then 'sem_dono'
                  else 'proprio'
                end
         end
    from eu
    join public.crm_pipelines p on p.organization_id = eu.organization_id
    left join public.crm_pipeline_groups g on g.id = p.group_id and g.organization_id = p.organization_id
   where eu.papel <> 'admin'
     and (case
            when jsonb_typeof(p.settings->'escale_pessoas') = 'array'
                 and jsonb_array_length(p.settings->'escale_pessoas') > 0
              then (p.settings->'escale_pessoas') ? auth.uid()::text
            else public.fn_escale_lista_permite(g.settings->'escale_pessoas')
          end) is true;
$$;

revoke all on function public.fn_escale_origens_que_vejo() from public, anon;
grant execute on function public.fn_escale_origens_que_vejo() to authenticated, service_role;

-- ── 3. As policies de crm_leads (G7-4, B7-1) ────────────────────────────────
-- Quem vê: o platform admin; o admin, a organização inteira; os demais, pela regra
-- da origem. Cada subconsulta é a mesma para todas as linhas: o banco a calcula
-- uma vez (hashed SubPlan) em vez de chamar a regra por linha.
alter policy "crm_leads_select" on public.crm_leads
  using (
    (select public.fn_is_platform_admin())
    or organization_id in (select v.organization_id from public.fn_escale_origens_que_vejo() v
                            where v.regra = 'organizacao')
    or (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                            from public.fn_escale_origens_que_vejo() v
                                           where v.regra = 'tudo')
    or (owner_user_id = (select auth.uid())
        and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                 from public.fn_escale_origens_que_vejo() v
                                                where v.pipeline_id is not null))
    or (owner_user_id is null
        and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                 from public.fn_escale_origens_que_vejo() v
                                                where v.regra = 'sem_dono'))
  );

-- Escrita: agent ou acima, com acesso à origem, e gerente ou quem vê o negócio
-- (o mesmo de antes; o `tem_acesso` repetido sai porque quem vê já tem acesso).
-- O platform admin com papel na organização entra pela linha 'organizacao'.
alter policy "crm_leads_insert" on public.crm_leads
  with check (
    (select public.fn_is_platform_admin_full())
    or ((organization_id in (select public.fn_user_org_ids()))
        and organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                 where m.papel in ('agent','manager','admin'))
        and (organization_id in (select v.organization_id from public.fn_escale_origens_que_vejo() v
                                  where v.regra = 'organizacao')
             or (organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                      where m.papel in ('manager','admin'))
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.pipeline_id is not null))
             or (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                     from public.fn_escale_origens_que_vejo() v
                                                    where v.regra = 'tudo')
             or (owner_user_id = (select auth.uid())
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.pipeline_id is not null))
             or (owner_user_id is null
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.regra = 'sem_dono'))))
  );

alter policy "crm_leads_update" on public.crm_leads
  using (
    (select public.fn_is_platform_admin_full())
    or ((organization_id in (select public.fn_user_org_ids()))
        and organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                 where m.papel in ('agent','manager','admin'))
        and (organization_id in (select v.organization_id from public.fn_escale_origens_que_vejo() v
                                  where v.regra = 'organizacao')
             or (organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                      where m.papel in ('manager','admin'))
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.pipeline_id is not null))
             or (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                     from public.fn_escale_origens_que_vejo() v
                                                    where v.regra = 'tudo')
             or (owner_user_id = (select auth.uid())
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.pipeline_id is not null))
             or (owner_user_id is null
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.regra = 'sem_dono'))))
  ) with check (
    (select public.fn_is_platform_admin_full())
    or ((organization_id in (select public.fn_user_org_ids()))
        and organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                 where m.papel in ('agent','manager','admin'))
        and (organization_id in (select v.organization_id from public.fn_escale_origens_que_vejo() v
                                  where v.regra = 'organizacao')
             or (organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                      where m.papel in ('manager','admin'))
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.pipeline_id is not null))
             or (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                     from public.fn_escale_origens_que_vejo() v
                                                    where v.regra = 'tudo')
             or (owner_user_id = (select auth.uid())
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.pipeline_id is not null))
             or (owner_user_id is null
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.regra = 'sem_dono'))))
  );

alter policy "crm_leads_delete" on public.crm_leads
  using (
    (select public.fn_is_platform_admin_full())
    or ((organization_id in (select public.fn_user_org_ids()))
        and organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                 where m.papel in ('agent','manager','admin'))
        and (organization_id in (select v.organization_id from public.fn_escale_origens_que_vejo() v
                                  where v.regra = 'organizacao')
             or (organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                      where m.papel in ('manager','admin'))
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.pipeline_id is not null))
             or (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                     from public.fn_escale_origens_que_vejo() v
                                                    where v.regra = 'tudo')
             or (owner_user_id = (select auth.uid())
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.pipeline_id is not null))
             or (owner_user_id is null
                 and (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                          from public.fn_escale_origens_que_vejo() v
                                                         where v.regra = 'sem_dono'))))
  );

-- ── 4. Os filhos do negócio: só o exists, a RLS de crm_leads decide (G7-6) ──
-- A subconsulta em crm_leads já passa pela crm_leads_select da sessão (a única
-- policy de leitura dela): chamar a regra de novo aqui a fazia rodar duas vezes.
-- É o desenho de crm_ganho_do_negocio_select (9014).
alter policy "crm_lead_activities_select" on public.crm_lead_activities
  using (
    exists (select 1 from public.crm_leads l where l.id = crm_lead_activities.lead_id)
  );

alter policy "crm_lead_links_select" on public.crm_lead_links
  using (
    exists (select 1 from public.crm_leads l where l.id = crm_lead_links.lead_id)
  );

alter policy crm_notas_do_negocio_select on public.crm_notas_do_negocio
  using (
    (select public.fn_is_platform_admin())
    or ((organization_id in (select public.fn_user_org_ids()))
        and (case
               when lead_id is null then contact_id is not null
               else exists (select 1 from public.crm_leads l
                             where l.id = crm_notas_do_negocio.lead_id
                               and l.organization_id = crm_notas_do_negocio.organization_id)
             end))
  );

-- ── 5. A origem e as etapas (B7-1) ──────────────────────────────────────────
-- A policy de escrita do gerente (FOR ALL) também entra em toda leitura: as duas
-- passam a usar o conjunto calculado uma vez. O WITH CHECK da escrita não muda.
alter policy "crm_pipelines_select" on public.crm_pipelines
  using (
    (select public.fn_is_platform_admin())
    or ((organization_id in (select public.fn_user_org_ids()))
        and (organization_id in (select v.organization_id from public.fn_escale_origens_que_vejo() v
                                  where v.regra = 'organizacao')
             or (organization_id, id) in (select v.organization_id, v.pipeline_id
                                            from public.fn_escale_origens_que_vejo() v
                                           where v.pipeline_id is not null)))
  );

alter policy "crm_pipelines_manager_write" on public.crm_pipelines
  using (
    (select public.fn_is_platform_admin_full())
    or ((organization_id in (select public.fn_user_org_ids()))
        and organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                 where m.papel in ('manager','admin'))
        and (organization_id in (select v.organization_id from public.fn_escale_origens_que_vejo() v
                                  where v.regra = 'organizacao')
             or (organization_id, id) in (select v.organization_id, v.pipeline_id
                                            from public.fn_escale_origens_que_vejo() v
                                           where v.pipeline_id is not null)))
  );

alter policy "crm_stages_select" on public.crm_stages
  using (
    (select public.fn_is_platform_admin())
    or ((organization_id in (select public.fn_user_org_ids()))
        and (organization_id in (select v.organization_id from public.fn_escale_origens_que_vejo() v
                                  where v.regra = 'organizacao')
             or (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                     from public.fn_escale_origens_que_vejo() v
                                                    where v.pipeline_id is not null)))
  );

alter policy "crm_stages_manager_write" on public.crm_stages
  using (
    (select public.fn_is_platform_admin_full())
    or ((organization_id in (select public.fn_user_org_ids()))
        and organization_id in (select m.organization_id from public.fn_escale_meus_papeis() m
                                 where m.papel in ('manager','admin'))
        and (organization_id in (select v.organization_id from public.fn_escale_origens_que_vejo() v
                                  where v.regra = 'organizacao')
             or (organization_id, pipeline_id) in (select v.organization_id, v.pipeline_id
                                                     from public.fn_escale_origens_que_vejo() v
                                                    where v.pipeline_id is not null)))
  );

-- ── 6. Conversas pelo setor: papel e permissão uma vez (G7-5, B7-3) ─────────
-- As organizações em que a pessoa é atendente, tem "Ver conversas do setor" e é
-- membro de algum setor. Só nelas a policy olha o setor de cada conversa.
create or replace function public.fn_crm_orgs_que_veem_pelo_setor()
returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  with eu as materialized (
    select m.organization_id from public.fn_escale_meus_papeis() m
     where m.papel = 'agent'
       and auth.uid() is not null
       and public.fn_crm_pode(m.organization_id, 'CHAT_VIEW_TEAM')
  )
  select eu.organization_id from eu
   where exists (select 1 from public.crm_setores_membros s
                  where s.organization_id = eu.organization_id and s.user_id = auth.uid());
$$;

revoke all on function public.fn_crm_orgs_que_veem_pelo_setor() from public, anon;
grant execute on function public.fn_crm_orgs_que_veem_pelo_setor() to authenticated, service_role;

-- A conversa está num setor de que a pessoa é membro nesta organização? (o fim de
-- fn_crm_ve_pelo_setor, sem o papel e a permissão, que a policy já resolveu).
-- Confere o vínculo ativo de quem chama (0149): chamada direta com o id de outra
-- organização devolve false.
create or replace function public.fn_crm_conversa_no_meu_setor(p_org uuid, p_conversation uuid, p_channel_session uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_organizations u
     where u.organization_id = p_org and u.user_id = auth.uid() and u.revoked_at is null)
  and exists (
    select 1 from public.crm_setores_membros m
     where m.organization_id = p_org
       and m.user_id = auth.uid()
       and m.setor_id = public.fn_crm_setor_efetivo(p_conversation, p_channel_session));
$$;

revoke all on function public.fn_crm_conversa_no_meu_setor(uuid, uuid, uuid) from public, anon;
grant execute on function public.fn_crm_conversa_no_meu_setor(uuid, uuid, uuid) to authenticated, service_role;

alter policy crm_conversations_select_setor on public.conversations
  using (
    organization_id in (select public.fn_crm_orgs_que_veem_pelo_setor())
    and public.fn_crm_conversa_no_meu_setor(organization_id, id, channel_session_id)
  );

-- ── 7. Distribuição de dono: o platform admin lê, como nas demais do fork (B7-9) ──
-- A sessão de suporte somente leitura (papel "viewer") não via a distribuição e a
-- tela da origem quebrava. Alargamento deliberado só para o platform admin.
alter policy crm_distribuicao_de_dono_select on public.crm_distribuicao_de_dono
  using (
    (select public.fn_is_platform_admin())
    or (public.fn_role_at_least(organization_id, 'manager')
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id))
  );

alter policy crm_distribuicoes_feitas_select on public.crm_distribuicoes_feitas
  using (
    (select public.fn_is_platform_admin())
    or (public.fn_role_at_least(organization_id, 'manager')
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id))
  );

alter policy crm_distribuicao_alteracoes_select on public.crm_distribuicao_alteracoes
  using (
    (select public.fn_is_platform_admin())
    or (public.fn_role_at_least(organization_id, 'manager')
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id))
  );

-- ── 8. auth.uid() avaliado uma vez por comando nas policies crm_* (G7-18) ───
-- Mesma expressão, só `auth.uid()` trocado por `(select auth.uid())` (initplan).
-- ALTER POLICY mantém comando, papéis, tipo e comentário. Idempotente: na segunda
-- passada não sobra `auth.uid()` solto e a expressão volta igual.
do $q7b$
declare
  r record;
  v_embrulhado constant text := '( SELECT auth.uid() AS uid)';
  v_qual text;
  v_check text;
  v_sql text;
begin
  for r in
    select c.relname as tabela, pol.polname as policy,
           pg_get_expr(pol.polqual, pol.polrelid) as qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      join (values
        ('crm_acoes_em_massa', 'crm_acoes_em_massa_decisao'),
        ('crm_acoes_em_massa', 'crm_acoes_em_massa_insert'),
        ('crm_acoes_em_massa', 'crm_acoes_em_massa_preparo'),
        ('crm_acoes_em_massa', 'crm_acoes_em_massa_select'),
        ('crm_acoes_em_massa_conversas', 'crm_acoes_em_massa_conversas_insert'),
        ('crm_acoes_em_massa_conversas', 'crm_acoes_em_massa_conversas_preparo'),
        ('crm_acoes_em_massa_conversas', 'crm_acoes_em_massa_conversas_select'),
        ('crm_acoes_em_massa_conversas_itens', 'crm_acoes_em_massa_conversas_itens_insert'),
        ('crm_acoes_em_massa_conversas_itens', 'crm_acoes_em_massa_conversas_itens_select'),
        ('crm_acoes_em_massa_itens', 'crm_acoes_em_massa_itens_insert'),
        ('crm_acoes_em_massa_itens', 'crm_acoes_em_massa_itens_select'),
        ('crm_arquivos_do_contato', 'crm_arquivos_do_contato_dono_ou_gerente_write'),
        ('crm_arquivos_do_contato', 'crm_arquivos_do_contato_insert'),
        ('crm_capas_do_card', 'crm_capas_do_card_pessoa_write'),
        ('crm_capas_do_card', 'crm_capas_do_card_select'),
        ('crm_colunas_das_listas', 'crm_colunas_das_listas_pessoa_write'),
        ('crm_colunas_das_listas', 'crm_colunas_das_listas_select'),
        ('crm_eventos_da_conversa', 'crm_eventos_da_conversa_insert'),
        ('crm_filtros_das_listas', 'crm_filtros_das_listas_dono_write'),
        ('crm_filtros_das_listas', 'crm_filtros_das_listas_select'),
        ('crm_filtros_salvos', 'crm_filtros_salvos_dono_write'),
        ('crm_filtros_salvos', 'crm_filtros_salvos_select'),
        ('crm_mensagens_agendadas', 'crm_mensagens_agendadas_insert'),
        ('crm_mensagens_agendadas', 'crm_mensagens_agendadas_update'),
        ('crm_notas_do_negocio', 'crm_notas_do_negocio_dono_ou_gerente_delete'),
        ('crm_notas_do_negocio', 'crm_notas_do_negocio_dono_ou_gerente_write'),
        ('crm_notas_do_negocio', 'crm_notas_do_negocio_insert'),
        ('crm_pausas_de_automacao', 'crm_pausas_de_automacao_write'),
        ('crm_permissoes_de_atendimento', 'crm_permissoes_de_atendimento_select'),
        ('crm_pipeline_view_pessoas', 'crm_pipeline_view_pessoas_select'),
        ('crm_pipeline_views', 'crm_pipeline_views_select'),
        ('crm_preferencias_de_conversas', 'crm_preferencias_de_conversas_pessoa_write'),
        ('crm_preferencias_de_conversas', 'crm_preferencias_de_conversas_select'),
        ('crm_respostas_rapidas_extras', 'crm_respostas_rapidas_extras_write'),
        ('crm_respostas_rapidas_setores', 'crm_respostas_rapidas_setores_write')
      ) as alvo(tabela, policy) on alvo.tabela = c.relname and alvo.policy = pol.polname
     where n.nspname = 'public'
  loop
    -- protege o que já está embrulhado, embrulha o resto, devolve o protegido
    v_qual := replace(replace(replace(r.qual, v_embrulhado, '__q7b_uid__'), 'auth.uid()', v_embrulhado), '__q7b_uid__', v_embrulhado);
    v_check := replace(replace(replace(r.with_check, v_embrulhado, '__q7b_uid__'), 'auth.uid()', v_embrulhado), '__q7b_uid__', v_embrulhado);
    v_sql := format('alter policy %I on public.%I', r.policy, r.tabela);
    if v_qual is not null then
      v_sql := v_sql || format(' using (%s)', v_qual);
    end if;
    if v_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_check);
    end if;
    execute v_sql;
  end loop;
end
$q7b$;

notify pgrst, 'reload schema';
