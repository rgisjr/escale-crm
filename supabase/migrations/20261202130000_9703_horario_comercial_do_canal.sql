-- manifest: horário comercial por dia da semana de cada número (várias faixas por dia), terceira régua do envio automático
create table if not exists public.channel_business_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_session_id uuid not null,
  dia_da_semana smallint not null,
  inicio_min smallint not null,
  fim_min smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_business_hours_dia check (dia_da_semana between 0 and 6),
  constraint channel_business_hours_inicio check (inicio_min between 0 and 1439),
  constraint channel_business_hours_fim check (fim_min between 1 and 1440 and fim_min > inicio_min),
  constraint channel_business_hours_canal_fk foreign key (organization_id, channel_session_id)
    references public.channel_sessions(organization_id, id) on delete cascade
);
create unique index if not exists channel_business_hours_unica
  on public.channel_business_hours (organization_id, channel_session_id, dia_da_semana, inicio_min);
create index if not exists idx_channel_business_hours_canal
  on public.channel_business_hours (organization_id, channel_session_id);

alter table public.channel_business_hours enable row level security;
drop policy if exists tenant_isolation_channel_business_hours_all on public.channel_business_hours;
create policy tenant_isolation_channel_business_hours_all on public.channel_business_hours
  for all
  using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));
revoke all on public.channel_business_hours from anon;
