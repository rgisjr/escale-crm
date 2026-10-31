-- manifest: **Pastas e favoritos de automação (fork Escale, Fase 5A).** Tabelas novas `crm_pastas_de_automacao` (nome, cor e ícone da Clint, por organização), `crm_automacoes_da_casca` (uma linha por regra: a pasta e a forma em que foi criada, fluxo ou editor) e `crm_automacoes_favoritas` (por pessoa). FK para `automation_rules` com cascade; FK composta para a pasta com `on delete set null (pasta_id)` (excluir a pasta solta as automações); favoritos presos a `user_organizations`. Gatilho recusa linha de organização diferente da regra. RLS: a organização lê; gerente ou acima escreve pastas e organização; cada pessoa só os próprios favoritos. Função `fn_escale_duplicar_automacao` (security invoker) copia a regra pausada com a pasta e a forma. `automation_rules` não muda.
-- ---- FORK ESCALE · pastas e favoritos de automação (migration 9701) ----

create table if not exists public.crm_pastas_de_automacao (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  cor text not null default 'gray'
    check (cor in ('marca','blue','teal','green','amber','red','pink','gray')),
  icone text not null default 'folder'
    check (icone in ('folder','tag','star','bell','send','cart','calendar','flag')),
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_pastas_de_automacao_org_id_key unique (organization_id, id)
);
create index if not exists idx_crm_pastas_de_automacao_org
  on public.crm_pastas_de_automacao (organization_id, created_at);

create table if not exists public.crm_automacoes_da_casca (
  rule_id uuid primary key references public.automation_rules(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pasta_id uuid,
  forma text check (forma is null or forma in ('fluxo','editor')),
  updated_at timestamptz not null default now(),
  constraint crm_automacoes_da_casca_pasta_fk foreign key (organization_id, pasta_id)
    references public.crm_pastas_de_automacao (organization_id, id) on delete set null (pasta_id)
);
create index if not exists idx_crm_automacoes_da_casca_org_pasta
  on public.crm_automacoes_da_casca (organization_id, pasta_id);

create table if not exists public.crm_automacoes_favoritas (
  user_id uuid not null,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  organization_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, rule_id),
  constraint crm_automacoes_favoritas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_automacoes_favoritas_org_pessoa
  on public.crm_automacoes_favoritas (organization_id, user_id);
create index if not exists idx_crm_automacoes_favoritas_regra
  on public.crm_automacoes_favoritas (rule_id);

-- A linha é da organização da regra (a FK simples não garante; automation_rules
-- não tem unique (organization_id, id) e esta frente não mexe nela).
create or replace function public.fn_escale_automacao_da_mesma_org() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (
    select 1 from public.automation_rules r
    where r.id = new.rule_id and r.organization_id = new.organization_id
  ) then
    raise exception 'automacao_de_outra_organizacao' using errcode = 'check_violation';
  end if;
  return new;
end $$;
-- Função de gatilho: o gatilho dispara sem EXECUTE de quem grava, então ninguém logado precisa poder chamá-la.
revoke all on function public.fn_escale_automacao_da_mesma_org() from public, anon, authenticated;

drop trigger if exists trg_escale_automacao_da_casca_mesma_org on public.crm_automacoes_da_casca;
create trigger trg_escale_automacao_da_casca_mesma_org before insert or update on public.crm_automacoes_da_casca
  for each row execute function public.fn_escale_automacao_da_mesma_org();
drop trigger if exists trg_escale_automacao_favorita_mesma_org on public.crm_automacoes_favoritas;
create trigger trg_escale_automacao_favorita_mesma_org before insert or update on public.crm_automacoes_favoritas
  for each row execute function public.fn_escale_automacao_da_mesma_org();

alter table public.crm_pastas_de_automacao enable row level security;
alter table public.crm_automacoes_da_casca enable row level security;
alter table public.crm_automacoes_favoritas enable row level security;
revoke all on table public.crm_pastas_de_automacao, public.crm_automacoes_da_casca, public.crm_automacoes_favoritas from anon;

-- Pastas e organização: igual a automation_rules (a organização lê; gerente ou acima escreve).
drop policy if exists crm_pastas_de_automacao_select on public.crm_pastas_de_automacao;
create policy crm_pastas_de_automacao_select on public.crm_pastas_de_automacao for select
  using ((organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin());
drop policy if exists crm_pastas_de_automacao_write on public.crm_pastas_de_automacao;
create policy crm_pastas_de_automacao_write on public.crm_pastas_de_automacao
  using (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')))
  with check (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')));

drop policy if exists crm_automacoes_da_casca_select on public.crm_automacoes_da_casca;
create policy crm_automacoes_da_casca_select on public.crm_automacoes_da_casca for select
  using ((organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin());
drop policy if exists crm_automacoes_da_casca_write on public.crm_automacoes_da_casca;
create policy crm_automacoes_da_casca_write on public.crm_automacoes_da_casca
  using (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')))
  with check (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')));

-- Favoritos: só os da própria pessoa, de gerente para cima (quem vê a lista).
drop policy if exists crm_automacoes_favoritas_pessoa on public.crm_automacoes_favoritas;
create policy crm_automacoes_favoritas_pessoa on public.crm_automacoes_favoritas
  using ((organization_id in (select public.fn_user_org_ids())) and user_id = (select auth.uid())
         and public.fn_role_at_least(organization_id, 'manager'))
  with check ((organization_id in (select public.fn_user_org_ids())) and user_id = (select auth.uid())
         and public.fn_role_at_least(organization_id, 'manager'));

grant select, insert, update, delete on public.crm_pastas_de_automacao, public.crm_automacoes_da_casca,
  public.crm_automacoes_favoritas to authenticated;
grant all on public.crm_pastas_de_automacao, public.crm_automacoes_da_casca, public.crm_automacoes_favoritas to service_role;

-- Duplicar (Q9): invoker, a RLS de automation_rules e da 9701 decide quem pode.
create or replace function public.fn_escale_duplicar_automacao(p_regra uuid, p_nome text)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v public.automation_rules;
  v_pasta uuid;
  v_forma text;
  v_nova uuid;
begin
  select * into v from public.automation_rules where id = p_regra;
  if not found then
    raise exception 'automacao_nao_encontrada' using errcode = 'no_data_found';
  end if;
  insert into public.automation_rules (organization_id, name, trigger_event, trigger_config, conditions, actions,
                                       is_active, created_by_user_id, last_change_actor_kind, last_change_at)
  values (v.organization_id, left(btrim(p_nome), 120), v.trigger_event, v.trigger_config, v.conditions, v.actions,
          false, auth.uid(), 'user', now())
  returning id into v_nova;
  select c.pasta_id, c.forma into v_pasta, v_forma from public.crm_automacoes_da_casca c where c.rule_id = p_regra;
  insert into public.crm_automacoes_da_casca (rule_id, organization_id, pasta_id, forma)
  values (v_nova, v.organization_id, v_pasta, v_forma);
  return v_nova;
end $$;
revoke all on function public.fn_escale_duplicar_automacao(uuid, text) from public, anon;
grant execute on function public.fn_escale_duplicar_automacao(uuid, text) to authenticated, service_role;

comment on table public.crm_pastas_de_automacao is 'Fork Escale (9701): pastas da lista de automações da casca.';
comment on table public.crm_automacoes_da_casca is 'Fork Escale (9701): pasta e forma (fluxo/editor) de cada automation_rule na casca. Sem linha = sem pasta, abre no fluxo.';
comment on table public.crm_automacoes_favoritas is 'Fork Escale (9701): automações favoritas de cada pessoa.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
