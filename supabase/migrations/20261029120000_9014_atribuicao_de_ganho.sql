-- manifest: **Atribuição de ganho por origem (fork Escale, Fase 1K, D14).** "Atribuição de ganho pelo sistema": com `crm_pipelines.settings.escale_so_admin_ganha = true`, `trg_escale_so_admin_marca_ganho` (BEFORE INSERT e BEFORE UPDATE em `crm_leads`, só quando o negócio vira ganho) recusa com `PT403 so_administrador_marca_ganho` quem tem sessão e não é administrador; automação, agente de IA, integração e MCP (sem sessão) seguem ganhando. Crédito do ganho: tabela nova `crm_ganho_do_negocio` (uma linha por negócio ganho, lida por quem vê o negócio, escrita só pelo gatilho e pela correção), preenchida por `trg_escale_registra_o_ganho` com `fn_escale_credito_do_ganho`, que aplica as regras da origem (`escale_atribuicao_de_ganho`: ter concluído N atividades de um tipo, ou o contato ter uma tag, com E/OU) sobre `crm_atividades_do_negocio` (9009): o dono se cumprir; senão quem cumpriu com mais atividades concluídas no negócio; ninguém, o dono. Sair de ganho apaga a linha. `fn_escale_corrigir_ganho` (só service_role) troca a pessoa e a data e grava quem corrigiu. Falhar ao creditar vira aviso e não derruba o ganho.
-- 9014: atribuição de ganho (fork Escale).

-- ── SÓ O ADMINISTRADOR MARCA GANHO ─────────────────────────────────────────
-- Roda depois de `trg_crm_lead_close_on_stage` (ordem alfabética dos BEFORE),
-- que é quem põe `status = 'won'` ao entrar na etapa de ganho; o WHEN vê o
-- `new` já com o status. Sem sessão (`auth.uid()` nulo: automação, IA,
-- integração, MCP) passa: é a "atribuição de ganho pelo sistema" (Q3). Com
-- sessão, só o papel admin (`fn_user_role_in_org` conta a sessão de suporte
-- completa como admin). O WHEN também dispara quando um negócio já ganho muda
-- de origem: sem isso, ir e voltar de uma origem sem a regra driblaria a trava.
create or replace function public.fn_escale_so_admin_marca_ganho()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if auth.uid() is null then
    return new;
  end if;
  if not exists (
    select 1 from public.crm_pipelines p
     where p.id = new.pipeline_id
       and p.organization_id = new.organization_id
       and p.settings -> 'escale_so_admin_ganha' = 'true'::jsonb
  ) then
    return new;
  end if;
  if coalesce(public.fn_user_role_in_org(new.organization_id), '') = 'admin' then
    return new;
  end if;
  raise exception 'so_administrador_marca_ganho' using errcode = 'PT403';
end
$fn$;

revoke all on function public.fn_escale_so_admin_marca_ganho() from public, anon, authenticated;

drop trigger if exists trg_escale_so_admin_marca_ganho on public.crm_leads;
create trigger trg_escale_so_admin_marca_ganho
  before update on public.crm_leads
  for each row
  when (new.status = 'won'
        and (old.status is distinct from 'won' or new.pipeline_id is distinct from old.pipeline_id))
  execute function public.fn_escale_so_admin_marca_ganho();

drop trigger if exists trg_escale_so_admin_marca_ganho_ao_criar on public.crm_leads;
create trigger trg_escale_so_admin_marca_ganho_ao_criar
  before insert on public.crm_leads
  for each row
  when (new.status = 'won')
  execute function public.fn_escale_so_admin_marca_ganho();

-- ── SÓ O ADMINISTRADOR MUDA AS REGRAS DO GANHO ─────────────────────────────
-- A política `crm_pipelines_manager_write` deixa o gerente gravar
-- `crm_pipelines.settings` direto pelo PostgREST; a conferência de admin da
-- rota não o alcança. Este gatilho fecha a porta no banco: com sessão, quem não
-- é administrador (nem suporte com escrita) não muda `escale_so_admin_ganha`
-- nem `escale_atribuicao_de_ganho`. Sem sessão (serviço, sistema) passa. Na
-- criação, a chave presente conta como mudança (ausente -> valor).
create or replace function public.fn_escale_so_admin_muda_regras_de_ganho()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_chave text;
  v_antes jsonb;
  v_depois jsonb;
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.fn_is_platform_admin_full()
     or public.fn_role_at_least(new.organization_id, 'admin') then
    return new;
  end if;
  foreach v_chave in array array['escale_so_admin_ganha', 'escale_atribuicao_de_ganho'] loop
    v_antes := case when tg_op = 'UPDATE' and jsonb_typeof(old.settings) = 'object'
                    then old.settings -> v_chave end;
    v_depois := case when jsonb_typeof(new.settings) = 'object'
                     then new.settings -> v_chave end;
    if v_antes is distinct from v_depois then
      raise exception 'so_administrador_muda_regras_do_ganho' using errcode = 'PT403';
    end if;
  end loop;
  return new;
end
$fn$;

revoke all on function public.fn_escale_so_admin_muda_regras_de_ganho() from public, anon, authenticated;

drop trigger if exists trg_escale_so_admin_muda_regras_de_ganho on public.crm_pipelines;
create trigger trg_escale_so_admin_muda_regras_de_ganho
  before insert or update of settings on public.crm_pipelines
  for each row
  execute function public.fn_escale_so_admin_muda_regras_de_ganho();

-- ── O CRÉDITO DO GANHO ─────────────────────────────────────────────────────
create table if not exists public.crm_ganho_do_negocio (
  lead_id uuid primary key references public.crm_leads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creditado_a uuid references auth.users(id) on delete set null,
  ganho_em timestamptz not null,
  pela_regra boolean not null default false,
  regras jsonb,
  marcado_por uuid references auth.users(id) on delete set null,
  corrigido_por uuid references auth.users(id) on delete set null,
  corrigido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_crm_ganho_do_negocio_org
  on public.crm_ganho_do_negocio (organization_id, creditado_a);

-- Lê quem vê o negócio (a RLS de `crm_leads`, com o acesso por origem da 9010,
-- vale dentro do EXISTS). Escrita: nenhuma policy.
alter table public.crm_ganho_do_negocio enable row level security;
drop policy if exists crm_ganho_do_negocio_select on public.crm_ganho_do_negocio;
create policy crm_ganho_do_negocio_select on public.crm_ganho_do_negocio
  for select to authenticated
  using (
    exists (
      select 1 from public.crm_leads l
       where l.id = crm_ganho_do_negocio.lead_id
         and l.organization_id = crm_ganho_do_negocio.organization_id
    )
  );

-- As regras da origem sobre as atividades concluídas no negócio (9009).
-- Condição completa: atividade com tipo da 1I e vezes de 1 a 999; tag não
-- vazia (do CONTATO, vale para todos os candidatos). Candidatos: quem concluiu
-- atividade no negócio e o dono. Cumpre = todas (e) ou alguma (ou). Entre os
-- que cumprem: o dono, se cumprir; senão quem tem mais atividades concluídas no
-- negócio; empate, a conclusão mais recente; empate de novo, o menor id.
-- Ninguém cumpre, ou origem sem regra: o dono, sem regra aplicada.
create or replace function public.fn_escale_credito_do_ganho(p_lead uuid)
returns table (o_creditado_a uuid, o_pela_regra boolean, o_regras jsonb)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_org uuid;
  v_origem uuid;
  v_dono uuid;
  v_contato uuid;
  v_cfg jsonb;
  v_operador text;
  v_conds jsonb;
  v_tags text[];
  v_cond jsonb;
  v_cand uuid;
  v_vale boolean;
  v_todas boolean;
  v_alguma boolean;
  v_total integer;
  v_ultima timestamptz;
  v_melhor uuid;
  v_melhor_total integer := -1;
  v_melhor_ultima timestamptz;
  v_dono_cumpre boolean := false;
begin
  select l.organization_id, l.pipeline_id, l.owner_user_id, l.contact_id
    into v_org, v_origem, v_dono, v_contato
    from public.crm_leads l
   where l.id = p_lead;
  if not found then
    return;
  end if;

  select p.settings -> 'escale_atribuicao_de_ganho' into v_cfg
    from public.crm_pipelines p
   where p.id = v_origem
     and p.organization_id = v_org;
  v_operador := case when v_cfg ->> 'operador' = 'ou' then 'ou' else 'e' end;

  select coalesce(jsonb_agg(c.v order by c.o), '[]'::jsonb) into v_conds
    from jsonb_array_elements(
      case when jsonb_typeof(v_cfg -> 'condicoes') = 'array' then v_cfg -> 'condicoes' else '[]'::jsonb end
    ) with ordinality as c(v, o)
   where (c.v ->> 'tipo' = 'atividade'
          and c.v ->> 'atividade' in ('whatsapp', 'instagram', 'ligacao', 'email', 'agendamento', 'tarefa', 'reuniao')
          and coalesce(c.v ->> 'vezes', '') ~ '^[0-9]{1,3}$'
          and (c.v ->> 'vezes')::integer >= 1)
      or (c.v ->> 'tipo' = 'tag' and coalesce(btrim(c.v ->> 'tag'), '') <> '');

  if jsonb_array_length(v_conds) = 0 then
    return query select v_dono, false, null::jsonb;
    return;
  end if;

  select coalesce(ct.tags, '{}'::text[]) into v_tags
    from public.contacts ct
   where ct.id = v_contato
     and ct.organization_id = v_org;
  v_tags := coalesce(v_tags, '{}'::text[]);

  for v_cand in
    select x.quem from (
      select distinct a.concluida_por as quem
        from public.crm_atividades_do_negocio a
       where a.lead_id = p_lead
         and a.concluida_por is not null
         and a.concluida_em is not null
      union
      select v_dono where v_dono is not null
    ) x
    order by x.quem
  loop
    v_todas := true;
    v_alguma := false;
    for v_cond in select e.value from jsonb_array_elements(v_conds) as e loop
      if v_cond ->> 'tipo' = 'tag' then
        v_vale := exists (
          select 1 from unnest(v_tags) as t(tag)
           where left(lower(btrim(t.tag, E' \t\r\n\f\x0b')), 40)
               = left(lower(btrim(v_cond ->> 'tag', E' \t\r\n\f\x0b')), 40)
        );
      else
        select count(*) >= (v_cond ->> 'vezes')::integer into v_vale
          from public.crm_atividades_do_negocio a
         where a.lead_id = p_lead
           and a.concluida_por = v_cand
           and a.concluida_em is not null
           and a.tipo = v_cond ->> 'atividade';
      end if;
      v_todas := v_todas and v_vale;
      v_alguma := v_alguma or v_vale;
    end loop;

    continue when not (case when v_operador = 'ou' then v_alguma else v_todas end);
    if v_cand = v_dono then
      v_dono_cumpre := true;
    end if;
    select count(*), max(a.concluida_em) into v_total, v_ultima
      from public.crm_atividades_do_negocio a
     where a.lead_id = p_lead
       and a.concluida_por = v_cand
       and a.concluida_em is not null;
    if v_total > v_melhor_total
       or (v_total = v_melhor_total and v_ultima is not null
           and (v_melhor_ultima is null or v_ultima > v_melhor_ultima)) then
      v_melhor := v_cand;
      v_melhor_total := v_total;
      v_melhor_ultima := v_ultima;
    end if;
  end loop;

  if v_dono_cumpre then
    return query select v_dono, true, jsonb_build_object('operador', v_operador, 'condicoes', v_conds);
  elsif v_melhor is not null then
    return query select v_melhor, true, jsonb_build_object('operador', v_operador, 'condicoes', v_conds);
  else
    return query select v_dono, false, null::jsonb;
  end if;
end
$fn$;

revoke all on function public.fn_escale_credito_do_ganho(uuid) from public, anon, authenticated;

-- Vira ganho: grava (ou regrava) o crédito, com quem marcou (nulo = sistema)
-- e a data do fechamento; a correção anterior se perde (é outro ganho). Sai de
-- ganho: apaga. Falhar ao creditar vira aviso e não derruba o ganho.
create or replace function public.fn_escale_registra_o_ganho()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_credito record;
begin
  if new.status = 'won' then
    begin
      select * into v_credito from public.fn_escale_credito_do_ganho(new.id);
      insert into public.crm_ganho_do_negocio
        (lead_id, organization_id, creditado_a, ganho_em, pela_regra, regras, marcado_por)
      values
        (new.id, new.organization_id, v_credito.o_creditado_a, coalesce(new.closed_at, now()),
         coalesce(v_credito.o_pela_regra, false), v_credito.o_regras, auth.uid())
      on conflict (lead_id) do update
        set creditado_a = excluded.creditado_a,
            ganho_em = excluded.ganho_em,
            pela_regra = excluded.pela_regra,
            regras = excluded.regras,
            marcado_por = excluded.marcado_por,
            corrigido_por = null,
            corrigido_em = null;
    exception when others then
      raise warning 'fn_escale_registra_o_ganho: % (%)', sqlerrm, sqlstate;
    end;
  elsif tg_op = 'UPDATE' and old.status = 'won' then
    delete from public.crm_ganho_do_negocio where lead_id = new.id;
  end if;
  return null;
end
$fn$;

revoke all on function public.fn_escale_registra_o_ganho() from public, anon, authenticated;

drop trigger if exists trg_escale_registra_o_ganho on public.crm_leads;
create trigger trg_escale_registra_o_ganho
  after update on public.crm_leads
  for each row
  when (old.status is distinct from new.status)
  execute function public.fn_escale_registra_o_ganho();

drop trigger if exists trg_escale_registra_o_ganho_ao_criar on public.crm_leads;
create trigger trg_escale_registra_o_ganho_ao_criar
  after insert on public.crm_leads
  for each row
  when (new.status = 'won')
  execute function public.fn_escale_registra_o_ganho();

-- ── A CORREÇÃO DO ADMINISTRADOR ────────────────────────────────────────────
-- A rota confere que quem pede é admin e chama com o service role (N18). Não
-- mexe em `crm_leads.closed_at`: as métricas do original seguem pelo
-- fechamento e pelo dono (Q4).
create or replace function public.fn_escale_corrigir_ganho(
  p_org uuid,
  p_lead uuid,
  p_autor uuid,
  p_creditado_a uuid,
  p_ganho_em timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if p_ganho_em is null or p_ganho_em > now() + interval '1 day' then
    raise exception 'data_invalida' using errcode = '22023';
  end if;
  if p_creditado_a is not null and not exists (
    select 1 from public.user_organizations uo
     where uo.user_id = p_creditado_a
       and uo.organization_id = p_org
       and uo.accepted_at is not null
       and uo.revoked_at is null
       and uo.role in ('agent', 'manager', 'admin')
  ) then
    raise exception 'pessoa_invalida' using errcode = 'PT422';
  end if;
  update public.crm_ganho_do_negocio g
     set creditado_a = p_creditado_a,
         ganho_em = p_ganho_em,
         corrigido_por = p_autor,
         corrigido_em = now()
   where g.lead_id = p_lead
     and g.organization_id = p_org
     and exists (
       select 1 from public.crm_leads l
        where l.id = p_lead and l.organization_id = p_org and l.status = 'won'
     );
  if not found then
    raise exception 'ganho_nao_encontrado' using errcode = 'PT404';
  end if;
end
$fn$;

revoke all on function public.fn_escale_corrigir_ganho(uuid, uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.fn_escale_corrigir_ganho(uuid, uuid, uuid, uuid, timestamptz) to service_role;

comment on table public.crm_ganho_do_negocio is
  'Fork Escale (9014): quem leva o crédito de cada negócio ganho, pelas regras da origem; o admin corrige. Lê quem vê o negócio.';

notify pgrst, 'reload schema';
