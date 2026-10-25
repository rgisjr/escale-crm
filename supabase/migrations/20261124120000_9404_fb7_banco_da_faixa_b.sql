-- manifest: **Faixa B · FB7: o banco da Faixa B da revisão de 24/10.** (1) B7-5: `grupo_id` do catálogo de campos do contato/empresa e do negócio passa a ter FK composta `(organization_id, grupo_id)` com `unique (organization_id, id)` no grupo e `on delete set null (grupo_id)`, de modo que um admin não grava grupo de outra organização nem apagar o grupo de uma zera o campo de outra; o dado já errado é curado antes (`grupo_id` volta a nulo). (2) B7-6: o playbook ao entrar na etapa isola cada atividade num sub-bloco (uma falha não desfaz as demais; conflito único vira "já existe"). (3) B7-7: `fn_escale_empresa_da_importacao` trata a corrida pelo CNPJ (`unique_violation` volta a vincular à empresa recém-criada). (4) B7-8: o negócio nasce na moeda da origem também quando chega com o DEFAULT `BRL` numa organização que não é BRL. (5) G7-8: `fn_escale_contar_importacao` conta as linhas numa varredura só. (6) G7-9: índice da busca de empresa por nome na importação. (7) G7-11: os itens das ações em massa são apagados quando a ação termina (gatilho) e os de ações já terminadas saem agora. (8) B2-14: índice único do aviso `next_action_ambiguous` aberto (e cura dos duplicados). (9) G3-11: `fn_escale_conversa_mais_recente_por_contato`, uma conversa por contato (invoker, a RLS vale). Fica de fora, com motivo no PR: B7-4 (o lock advisory no gatilho BEFORE não evita o deadlock, o lock de linha vem antes), G7-13 e G7-20 (refatoram gatilhos quentes só por desempenho).
-- ---- FORK ESCALE · Faixa B FB7: banco da Faixa B (migration 9404) ----

-- 1. Grupo do campo só da própria organização (B7-5) ---------------------------
update public.crm_campos_do_crm t
   set grupo_id = null
 where t.grupo_id is not null
   and not exists (select 1 from public.crm_grupos_de_campos g
                    where g.id = t.grupo_id and g.organization_id = t.organization_id);
update public.crm_campos_do_negocio t
   set grupo_id = null
 where t.grupo_id is not null
   and not exists (select 1 from public.crm_grupos_de_campos g
                    where g.id = t.grupo_id and g.organization_id = t.organization_id);

do $b75$
begin
  if not exists (select 1 from pg_constraint where conname = 'crm_grupos_de_campos_org_id_uk') then
    alter table public.crm_grupos_de_campos
      add constraint crm_grupos_de_campos_org_id_uk unique (organization_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'crm_campos_do_crm_grupo_da_org_fk') then
    alter table public.crm_campos_do_crm drop constraint if exists crm_campos_do_crm_grupo_id_fkey;
    alter table public.crm_campos_do_crm
      add constraint crm_campos_do_crm_grupo_da_org_fk
      foreign key (organization_id, grupo_id)
      references public.crm_grupos_de_campos (organization_id, id) on delete set null (grupo_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'crm_campos_do_negocio_grupo_da_org_fk') then
    alter table public.crm_campos_do_negocio drop constraint if exists crm_campos_do_negocio_grupo_id_fkey;
    alter table public.crm_campos_do_negocio
      add constraint crm_campos_do_negocio_grupo_da_org_fk
      foreign key (organization_id, grupo_id)
      references public.crm_grupos_de_campos (organization_id, id) on delete set null (grupo_id);
  end if;
end
$b75$;

-- 2. Playbook: cada atividade no seu sub-bloco (B7-6) ---------------------------
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
      -- Uma atividade que falha não leva as outras junto: o savepoint é por atividade.
      begin
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
      exception
        when unique_violation then
          null; -- outra mudança de etapa do mesmo negócio já criou esta: "já existe"
        when others then
          raise warning 'fn_escale_atividades_ao_entrar_na_etapa (atividade %): % (%)', v_modelo.id, sqlerrm, sqlstate;
      end;
    end loop;
  exception when others then
    raise warning 'fn_escale_atividades_ao_entrar_na_etapa: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end
$fn$;

revoke all on function public.fn_escale_atividades_ao_entrar_na_etapa() from public, anon, authenticated;

-- 3. Empresa da importação: a corrida pelo CNPJ (B7-7) e o índice do nome (G7-9) --
create or replace function public.fn_escale_empresa_da_importacao(
  p_org uuid, p_autor uuid, p_contato uuid, p_nome text, p_cnpj text, p_cnpj_normalizado text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  v_nome text := nullif(btrim(coalesce(p_nome, '')), '');
  v_cnpj text := nullif(btrim(coalesce(p_cnpj_normalizado, '')), '');
begin
  perform 1 from public.contacts where id = p_contato and organization_id = p_org;
  if not found then
    raise exception 'contato_nao_encontrado' using errcode = 'P0002';
  end if;
  if v_cnpj is not null then
    select id into v_empresa from public.companies
     where organization_id = p_org and normalized_cnpj = v_cnpj
     order by created_at limit 1;
  end if;
  if v_empresa is null and v_nome is not null then
    select id into v_empresa from public.companies
     where organization_id = p_org and lower(btrim(coalesce(trade_name, legal_name, ''))) = lower(v_nome)
     order by created_at limit 1;
  end if;
  if v_empresa is null and v_nome is null and v_cnpj is null then
    select cp.company_id into v_empresa
      from public.contacts c
      join public.company_people cp on cp.person_id = c.person_id and cp.organization_id = p_org
     where c.id = p_contato and c.organization_id = p_org
     order by cp.is_primary desc, cp.created_at
     limit 1;
  end if;
  if v_empresa is null then
    begin
      insert into public.companies (organization_id, trade_name, cnpj, normalized_cnpj, created_by)
      values (p_org, v_nome, case when v_cnpj is null then null else nullif(btrim(p_cnpj), '') end, v_cnpj, p_autor)
      returning id into v_empresa;
    exception when unique_violation then
      -- Outra linha (ou o cadastro manual) criou a empresa deste CNPJ agora há pouco: vincula a ela.
      select id into v_empresa from public.companies
       where organization_id = p_org and normalized_cnpj = v_cnpj
       order by created_at limit 1;
      if v_empresa is null then
        raise;
      end if;
    end;
  end if;
  perform public.fn_escale_vincular_contato_a_empresa(p_org, p_contato, v_empresa, false);
  return v_empresa;
end;
$$;

revoke all on function public.fn_escale_empresa_da_importacao(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_escale_empresa_da_importacao(uuid, uuid, uuid, text, text, text) to service_role;

create index if not exists idx_companies_org_nome_lower
  on public.companies (organization_id, (lower(btrim(coalesce(trade_name, legal_name, '')))));

-- 4. Moeda da origem numa organização que não é BRL (B7-8) ----------------------
create or replace function public.fn_escale_lead_nasce_na_moeda_da_origem()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_moeda text;
  v_da_organizacao text;
begin
  select p.settings ->> 'escale_moeda' into v_moeda
    from public.crm_pipelines p
   where p.id = new.pipeline_id
     and p.organization_id = new.organization_id;
  if v_moeda is null or v_moeda !~ '^[A-Z]{3}$' then
    return new;
  end if;

  select o.currency into v_da_organizacao
    from public.organizations o
   where o.id = new.organization_id;

  -- 'BRL' é o DEFAULT da coluna: chega assim quando a moeda foi omitida, mesmo numa organização que não é BRL.
  if new.currency is null or new.currency in ('BRL', coalesce(v_da_organizacao, 'BRL')) then
    new.currency := v_moeda;
  end if;
  return new;
end
$fn$;

revoke all on function public.fn_escale_lead_nasce_na_moeda_da_origem() from public, anon, authenticated;

-- 5. Contar a importação numa varredura só (G7-8) ----------------------------------
create or replace function public.fn_escale_contar_importacao(p_importacao uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_na_fila integer;
  v_revisar integer;
  v_importadas integer;
  v_puladas integer;
  v_erros integer;
  v_avisos integer;
begin
  select count(*) filter (where l.status in ('na_fila', 'processando')),
         count(*) filter (where l.status = 'revisar'),
         count(*) filter (where l.status = 'importada'),
         count(*) filter (where l.status = 'pulada'),
         count(*) filter (where l.status = 'erro'),
         count(*) filter (where l.status = 'importada' and l.com_aviso)
    into v_na_fila, v_revisar, v_importadas, v_puladas, v_erros, v_avisos
    from public.crm_importacoes_linhas l
   where l.importacao_id = p_importacao;

  update public.crm_importacoes i
     set importadas = v_importadas,
         revisar = v_revisar,
         puladas = v_puladas,
         erros = v_erros,
         avisos = v_avisos
   where i.id = p_importacao
  returning i.status into v_status;

  if v_status in ('importando', 'aguardando_revisao') and v_na_fila = 0 then
    v_status := case when v_revisar > 0 then 'aguardando_revisao' else 'concluida' end;
    update public.crm_importacoes
       set status = v_status,
           concluida_em = case when v_status = 'concluida' then now() else null end
     where id = p_importacao;
  end if;
  return v_status;
end;
$$;

-- 6. Os itens das ações em massa saem quando a ação termina (G7-11) ---------------
create or replace function public.fn_escale_descartar_itens_da_massa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'crm_acoes_em_massa' then
    delete from public.crm_acoes_em_massa_itens where acao_id = new.id;
  else
    delete from public.crm_acoes_em_massa_conversas_itens where acao_id = new.id;
  end if;
  return null;
end
$$;
revoke all on function public.fn_escale_descartar_itens_da_massa() from public, anon, authenticated;

drop trigger if exists trg_escale_descartar_itens_da_massa on public.crm_acoes_em_massa;
create trigger trg_escale_descartar_itens_da_massa
  after update of status on public.crm_acoes_em_massa
  for each row
  when (new.status in ('concluida', 'falhou', 'recusada') and old.status is distinct from new.status)
  execute function public.fn_escale_descartar_itens_da_massa();

drop trigger if exists trg_escale_descartar_itens_da_massa on public.crm_acoes_em_massa_conversas;
create trigger trg_escale_descartar_itens_da_massa
  after update of status on public.crm_acoes_em_massa_conversas
  for each row
  when (new.status in ('concluida', 'falhou') and old.status is distinct from new.status)
  execute function public.fn_escale_descartar_itens_da_massa();

delete from public.crm_acoes_em_massa_itens i
 using public.crm_acoes_em_massa a
 where a.id = i.acao_id and a.status in ('concluida', 'falhou', 'recusada');
delete from public.crm_acoes_em_massa_conversas_itens i
 using public.crm_acoes_em_massa_conversas a
 where a.id = i.acao_id and a.status in ('concluida', 'falhou');

-- 7. Um aviso aberto por contato ambíguo (B2-14) ------------------------------------
update public.agent_inbox_items x
   set status = 'resolved'
  from (
    select id,
           row_number() over (partition by organization_id, ref_id order by created_at, id) as n
      from public.agent_inbox_items
     where kind = 'next_action_ambiguous' and status = 'open'
  ) d
 where x.id = d.id and d.n > 1;

create unique index if not exists agent_inbox_next_action_ambiguous_aberto_uidx
  on public.agent_inbox_items (organization_id, ref_id)
  where kind = 'next_action_ambiguous' and status = 'open';

-- 8. Uma conversa por contato, a mais recente (G3-11) ---------------------------------
create or replace function public.fn_escale_conversa_mais_recente_por_contato(p_org uuid, p_contatos uuid[])
returns table (contact_id uuid, conversation_id uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select distinct on (c.contact_id) c.contact_id, c.id
    from public.conversations c
   where c.organization_id = p_org
     and c.contact_id = any (p_contatos)
   order by c.contact_id, c.last_message_at desc nulls last, c.id desc
$$;
revoke all on function public.fn_escale_conversa_mais_recente_por_contato(uuid, uuid[]) from public, anon;
grant execute on function public.fn_escale_conversa_mais_recente_por_contato(uuid, uuid[]) to authenticated, service_role;

notify pgrst, 'reload schema';
