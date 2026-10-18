-- manifest: **Acesso por origem (fork Escale, Fase 1J).** Cada origem passa a ter a sua regra de quem vê os negócios (`crm_pipelines.settings.escale_visualizacao`, os mesmos valores de `organizations.settings.visibility_mode`; ausente = a regra da organização) e a sua lista de pessoas com acesso (`settings.escale_pessoas`, ids). O grupo ganha `crm_pipeline_groups.settings` com a lista dele: a origem sem lista própria segue a do grupo; lista vazia = sem restrição; só o administrador passa por cima. Funções definer e estáveis decidem: `fn_escale_lista_permite`, `fn_escale_visualizacao_da_origem` (a regra em vigor), `fn_escale_tem_acesso_a_origem`, `fn_escale_tem_acesso_ao_grupo` e `fn_escale_pode_ver_negocio` (a `fn_can_view_lead` da 0036 com a origem no meio; a 0036 fica intacta). Treze policies recriadas com o mesmo texto e a função nova: `crm_leads` select/insert/update/delete (forma da 0529), `crm_lead_activities_select` e `crm_lead_links_select` (0042), `crm_pipelines_select` e `crm_stages_select` (0030), `crm_pipeline_groups_select` (9001), `crm_notas_do_negocio_select` (9008) e as três de escrita de manager+ `crm_pipelines_manager_write`, `crm_stages_manager_write` (0533) e `crm_pipeline_groups_manager_write` (9001), que são FOR ALL e por isso também decidem a leitura (ganham o termo de acesso no USING). Sem configurar nada, o resultado é idêntico ao de hoje. Um gatilho before insert em `crm_leads` põe o criador como dono quando a origem é "só os seus" (o que `POST /api/v1/leads` já faz para a regra da organização), fechado a anon/authenticated e com `exception → raise warning`. 
-- 9010: acesso por origem (fork Escale).

-- ── 0. a lista do grupo mora no settings dele (o mesmo desenho da origem) ──
alter table public.crm_pipeline_groups add column if not exists settings jsonb not null default '{}'::jsonb;

-- ── 1. lista vazia (ou ausente) libera; senão a pessoa precisa estar nela ──
create or replace function public.fn_escale_lista_permite(p_lista jsonb)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when jsonb_typeof(p_lista) = 'array' and jsonb_array_length(p_lista) > 0
      then p_lista ? auth.uid()::text
    else true
  end;
$$;

revoke all on function public.fn_escale_lista_permite(jsonb) from public;
revoke execute on function public.fn_escale_lista_permite(jsonb) from anon;
grant execute on function public.fn_escale_lista_permite(jsonb) to authenticated, service_role;

-- ── 2. a regra em vigor: a da origem, senão a da organização, senão o padrão ──
create or replace function public.fn_escale_visualizacao_da_origem(p_org uuid, p_pipeline uuid)
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select case v
    when 'all' then 'all'
    when 'own_and_unassigned' then 'own_and_unassigned'
    else 'own'
  end
  from (
    select coalesce(
      (select p.settings->>'escale_visualizacao'
         from public.crm_pipelines p
        where p.id = p_pipeline and p.organization_id = p_org
          and p.settings->>'escale_visualizacao' in ('all','own','own_and_unassigned')),
      (select o.settings->>'visibility_mode'
         from public.organizations o
        where o.id = p_org),
      'own_and_unassigned') as v
  ) regra;
$$;

revoke all on function public.fn_escale_visualizacao_da_origem(uuid, uuid) from public;
-- Recebe a organização e não confere quem chama: só as definers deste arquivo a usam (varredura 0149).
revoke execute on function public.fn_escale_visualizacao_da_origem(uuid, uuid) from anon, authenticated;
grant execute on function public.fn_escale_visualizacao_da_origem(uuid, uuid) to service_role;

-- ── 3. quem tem acesso à origem: só admin passa por cima; a lista da origem vence a do grupo ──
create or replace function public.fn_escale_tem_acesso_a_origem(p_org uuid, p_pipeline uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when public.fn_is_platform_admin() then true
    when public.fn_user_role_in_org(p_org) is null then false
    when public.fn_user_role_in_org(p_org) = 'admin' then true
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
  end;
$$;

revoke all on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) from public;
revoke execute on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) from anon;
grant execute on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) to authenticated, service_role;

-- ── 4. quem vê o grupo: a lista dele, ou alguma origem dele com lista própria que me inclua ──
-- (senão a origem liberada ficaria órfã no painel, que monta a árvore pelos grupos)
create or replace function public.fn_escale_tem_acesso_ao_grupo(p_org uuid, p_grupo uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when public.fn_is_platform_admin() then true
    when public.fn_user_role_in_org(p_org) is null then false
    when public.fn_user_role_in_org(p_org) = 'admin' then true
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
  end;
$$;

revoke all on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) from public;
revoke execute on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) from anon;
grant execute on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) to authenticated, service_role;

-- ── 5. quem vê o negócio: a fn_can_view_lead (0036) com a origem no meio ──
-- Viewer e gerente continuam vendo tudo da origem a que têm acesso (como no
-- original); o agent segue a regra em vigor DA ORIGEM. fn_can_view_lead não muda.
create or replace function public.fn_escale_pode_ver_negocio(p_org uuid, p_owner_user_id uuid, p_pipeline uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when public.fn_is_platform_admin() then true
    when public.fn_user_role_in_org(p_org) is null then false
    when not public.fn_escale_tem_acesso_a_origem(p_org, p_pipeline) then false
    when public.fn_user_role_in_org(p_org) in ('viewer','manager','admin') then true
    when p_owner_user_id = auth.uid() then true
    else case public.fn_escale_visualizacao_da_origem(p_org, p_pipeline)
      when 'all' then true
      when 'own_and_unassigned' then p_owner_user_id is null
      else false
    end
  end;
$$;

revoke all on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) from public;
revoke execute on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) from anon;
grant execute on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) to authenticated, service_role;

-- ── 6. as policies de crm_leads (o texto da 0529, só a função trocada) ──
drop policy if exists "crm_leads_select" on public.crm_leads;
drop policy if exists "crm_leads_insert" on public.crm_leads;
drop policy if exists "crm_leads_update" on public.crm_leads;
drop policy if exists "crm_leads_delete" on public.crm_leads;

create policy "crm_leads_select" on public.crm_leads
  for select using (
    public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)
  );

create policy "crm_leads_insert" on public.crm_leads
  for insert with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)
        and (public.fn_role_at_least(organization_id, 'manager')
             or public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)))
  );
create policy "crm_leads_update" on public.crm_leads
  for update using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)
        and (public.fn_role_at_least(organization_id, 'manager')
             or public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)))
  ) with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)
        and (public.fn_role_at_least(organization_id, 'manager')
             or public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)))
  );
create policy "crm_leads_delete" on public.crm_leads
  for delete using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)
        and (public.fn_role_at_least(organization_id, 'manager')
             or public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)))
  );

-- ── 7. os filhos do negócio (o texto da 0042) ──
drop policy if exists "crm_lead_activities_select" on public.crm_lead_activities;
create policy "crm_lead_activities_select" on public.crm_lead_activities
  for select using (
    exists (
      select 1 from public.crm_leads l
      where l.id = crm_lead_activities.lead_id
        and public.fn_escale_pode_ver_negocio(l.organization_id, l.owner_user_id, l.pipeline_id)
    )
  );

drop policy if exists "crm_lead_links_select" on public.crm_lead_links;
create policy "crm_lead_links_select" on public.crm_lead_links
  for select using (
    exists (
      select 1 from public.crm_leads l
      where l.id = crm_lead_links.lead_id
        and public.fn_escale_pode_ver_negocio(l.organization_id, l.owner_user_id, l.pipeline_id)
    )
  );

-- ── 8. a origem, as etapas e o grupo somem para quem não tem acesso (0030 e 9001) ──
-- É o que faz o painel Origens, o quadro, a troca rápida, as Visualizações (9003)
-- e os filtros salvos (9004) seguirem as listas: todos leem crm_pipelines pela sessão.
drop policy if exists "crm_pipelines_select" on public.crm_pipelines;
create policy "crm_pipelines_select" on public.crm_pipelines
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_escale_tem_acesso_a_origem(organization_id, id))
  );

drop policy if exists "crm_stages_select" on public.crm_stages;
create policy "crm_stages_select" on public.crm_stages
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id))
  );

drop policy if exists "crm_pipeline_groups_select" on public.crm_pipeline_groups;
create policy "crm_pipeline_groups_select" on public.crm_pipeline_groups
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_escale_tem_acesso_ao_grupo(organization_id, id))
  );

-- ── 8b. as policies de escrita de manager+ (0533 e 9001) são FOR ALL: também valem para SELECT ──
-- Policies permissivas se somam (OR). Sem o termo de acesso, o gerente fora da
-- lista continuaria vendo a origem, as etapas e o grupo (e poderia esvaziar a
-- lista). Mesmo texto das originais, com o termo de acesso no USING; o WITH
-- CHECK não muda (a linha nova de um INSERT ainda não existe para a função).
-- No grupo vale só a lista DELE: ter acesso por uma origem não dá o direito de
-- reescrever a lista do grupo (senão o gerente se incluiria em todas as origens).
drop policy if exists "crm_pipelines_manager_write" on public.crm_pipelines;
create policy "crm_pipelines_manager_write" on public.crm_pipelines
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager')
        and public.fn_escale_tem_acesso_a_origem(organization_id, id))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

drop policy if exists "crm_stages_manager_write" on public.crm_stages;
create policy "crm_stages_manager_write" on public.crm_stages
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager')
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

drop policy if exists "crm_pipeline_groups_manager_write" on public.crm_pipeline_groups;
create policy "crm_pipeline_groups_manager_write" on public.crm_pipeline_groups
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager')
        and (public.fn_role_at_least(organization_id, 'admin')
             or public.fn_escale_lista_permite(settings->'escale_pessoas')))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

-- ── 9. o dono padrão em origem "só os seus" (o POST /api/v1/leads faz isso para a regra da organização) ──
create or replace function public.fn_escale_dono_padrao_na_origem()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return new; end if;
  if new.owner_user_id is not null or new.owner_agent_id is not null then return new; end if;
  begin
    if public.fn_user_role_in_org(new.organization_id) is distinct from 'agent' then return new; end if;
    -- Só a regra PRÓPRIA da origem: a da organização segue com o POST /api/v1/leads (#2547), como hoje.
    if not exists (select 1 from public.crm_pipelines p
                    where p.id = new.pipeline_id and p.organization_id = new.organization_id
                      and p.settings->>'escale_visualizacao' = 'own') then return new; end if;
    new.owner_user_id := auth.uid();
    new.owner_kind := 'user';
    new.assigned_at := now();
  exception when others then
    raise warning 'fn_escale_dono_padrao_na_origem: % (%)', sqlerrm, sqlstate;
  end;
  return new;
end;
$$;

revoke all on function public.fn_escale_dono_padrao_na_origem() from public, anon, authenticated;

drop trigger if exists trg_escale_dono_padrao_na_origem on public.crm_leads;
create trigger trg_escale_dono_padrao_na_origem
  before insert on public.crm_leads
  for each row execute function public.fn_escale_dono_padrao_na_origem();

-- ── 10. a nota da 1H (migration 9008, que vem antes): quem vê a nota é quem vê o negócio ──
drop policy if exists crm_notas_do_negocio_select on public.crm_notas_do_negocio;
create policy crm_notas_do_negocio_select on public.crm_notas_do_negocio
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and exists (select 1 from public.crm_leads l
                     where l.id = crm_notas_do_negocio.lead_id
                       and l.organization_id = crm_notas_do_negocio.organization_id
                       and public.fn_escale_pode_ver_negocio(l.organization_id, l.owner_user_id, l.pipeline_id)))
  );

comment on column public.crm_pipeline_groups.settings is
  'Configurações do grupo (fork Escale, 9010). escale_pessoas: quem tem acesso ao grupo; a origem sem lista própria segue esta.';
comment on function public.fn_escale_lista_permite(jsonb) is
  'Lista de pessoas (fork Escale, 9010): vazia ou ausente libera; senão auth.uid() precisa estar nela.';
comment on function public.fn_escale_dono_padrao_na_origem() is
  'Gatilho before insert em crm_leads (fork Escale, 9010): o vendedor (agent) que cria negócio sem dono numa origem "apenas seus negócios" vira o dono.';
comment on function public.fn_escale_visualizacao_da_origem(uuid, uuid) is
  'A regra de quem vê os negócios em vigor na origem (fork Escale, 9010): settings.escale_visualizacao da origem; sem ela, organizations.settings.visibility_mode; sem as duas, own_and_unassigned.';
comment on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) is
  'Quem tem acesso à origem (fork Escale, 9010): só admin passa por cima; a lista da origem (settings.escale_pessoas); sem ela, a do grupo; vazia = todos os membros. É a regra de crm_pipelines_select e crm_stages_select.';
comment on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) is
  'Quem vê o grupo (fork Escale, 9010): admin; a lista do grupo; ou alguma origem dele com lista própria que inclua a pessoa.';
comment on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) is
  'Quem vê o negócio (fork Escale, 9010): fn_can_view_lead (0036) com a origem: sem acesso à origem ninguém abaixo de admin vê; viewer/gerente/admin veem tudo; o agent vê o seu e, conforme a regra da origem, os sem dono ou todos.';

notify pgrst, 'reload schema';
