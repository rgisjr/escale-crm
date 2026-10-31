-- manifest: anexo (áudio, imagem, arquivo) em respostas rápidas, fixo (asset_id) ou por variável do número (var:<chave>)
create table if not exists public.crm_respostas_rapidas_anexos (
  template_id uuid primary key references public.message_templates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset text not null,
  created_at timestamptz not null default now(),
  constraint crm_respostas_rapidas_anexos_asset check (asset ~ '^([0-9a-f-]{36}|var:[a-z][a-z0-9_]{0,39})$')
);
alter table public.crm_respostas_rapidas_anexos enable row level security;
drop policy if exists crm_respostas_rapidas_anexos_select on public.crm_respostas_rapidas_anexos;
drop policy if exists crm_respostas_rapidas_anexos_write on public.crm_respostas_rapidas_anexos;
-- Mesma régua das tabelas irmãs (extras e setores): lê quem lê o template; escreve quem escreve o template
-- (a própria, agente; a compartilhada, gerente). O organization_id da linha tem de ser o do template.
create policy crm_respostas_rapidas_anexos_select on public.crm_respostas_rapidas_anexos
  for select using (public.fn_is_platform_admin() or exists (select 1 from public.message_templates t where t.id = template_id));
create policy crm_respostas_rapidas_anexos_write on public.crm_respostas_rapidas_anexos
  for all using (exists (select 1 from public.message_templates t
                          where t.id = template_id and t.organization_id = crm_respostas_rapidas_anexos.organization_id
                            and ((t.owner_user_id = (select auth.uid()) and public.fn_role_at_least(t.organization_id, 'agent'))
                                 or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))))
  with check (exists (select 1 from public.message_templates t
                       where t.id = template_id and t.organization_id = crm_respostas_rapidas_anexos.organization_id
                         and ((t.owner_user_id = (select auth.uid()) and public.fn_role_at_least(t.organization_id, 'agent'))
                              or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))));
revoke all on public.crm_respostas_rapidas_anexos from anon;
grant select, insert, update, delete on public.crm_respostas_rapidas_anexos to authenticated;
grant all on public.crm_respostas_rapidas_anexos to service_role;
