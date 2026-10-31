-- manifest: variáveis por canal (padrão da organização + valor do número) para uma automação servir N canais
create table if not exists public.channel_variables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_session_id uuid,
  chave text not null,
  value_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_variables_chave_formato check (chave ~ '^[a-z][a-z0-9_]{0,39}$'),
  constraint channel_variables_valor_tamanho check (char_length(value_text) between 1 and 2000),
  constraint channel_variables_canal_fk foreign key (organization_id, channel_session_id)
    references public.channel_sessions(organization_id, id) on delete cascade
);
create unique index if not exists channel_variables_unica
  on public.channel_variables (organization_id, coalesce(channel_session_id, '00000000-0000-0000-0000-000000000000'::uuid), chave);
create index if not exists idx_channel_variables_canal on public.channel_variables (organization_id, channel_session_id);

alter table public.channel_variables enable row level security;
drop policy if exists tenant_isolation_channel_variables_all on public.channel_variables;
create policy tenant_isolation_channel_variables_all on public.channel_variables
  for all
  using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));
revoke all on public.channel_variables from anon;
