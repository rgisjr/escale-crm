-- manifest: **Rascunho de automação (fork Escale).** Tabela nova `crm_rascunhos_de_automacao`: uma linha por regra (`rule_id` PK, FK cascade para `automation_rules`) com o nome, o desenho da tela (jsonb objeto, até 1 MB) e a versão da regra em que ele se baseou (`versao_base`) que a pessoa salvou sem conseguir publicar. O motor nunca lê esta tabela: a regra no ar segue a última versão publicada. O gatilho `fn_escale_automacao_da_mesma_org` (9701) recusa linha de outra organização. RLS: só gerente ou acima da organização lê e grava; anon sem acesso; travas de suporte aplicadas. `automation_rules` não muda.

create table if not exists public.crm_rascunhos_de_automacao (
  rule_id uuid primary key references public.automation_rules(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 120),
  desenho jsonb not null check (jsonb_typeof(desenho) = 'object' and octet_length(desenho::text) <= 1048576),
  versao_base text check (versao_base is null or char_length(versao_base) <= 64),
  salvo_por uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_rascunhos_de_automacao_org
  on public.crm_rascunhos_de_automacao (organization_id);

drop trigger if exists trg_escale_rascunho_de_automacao_mesma_org on public.crm_rascunhos_de_automacao;
create trigger trg_escale_rascunho_de_automacao_mesma_org before insert or update on public.crm_rascunhos_de_automacao
  for each row execute function public.fn_escale_automacao_da_mesma_org();

alter table public.crm_rascunhos_de_automacao enable row level security;
revoke all on table public.crm_rascunhos_de_automacao from anon;

drop policy if exists crm_rascunhos_de_automacao_gerente on public.crm_rascunhos_de_automacao;
create policy crm_rascunhos_de_automacao_gerente on public.crm_rascunhos_de_automacao
  using (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')))
  with check (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')));

grant select, insert, update, delete on public.crm_rascunhos_de_automacao to authenticated;
grant all on public.crm_rascunhos_de_automacao to service_role;

comment on table public.crm_rascunhos_de_automacao is
  'Fork Escale (9708): o desenho salvo sem publicar de cada automação. O motor não lê; a regra no ar é a última versão publicada.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
