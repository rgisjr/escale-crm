-- manifest: repositório de mídia da organização (áudio, imagem, arquivo reutilizáveis) e variável do número que aponta para um ativo
create table if not exists public.org_media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null,
  mime text not null,
  size_bytes bigint not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint org_media_assets_nome_tamanho check (char_length(nome) between 1 and 120),
  constraint org_media_assets_tamanho check (size_bytes between 1 and 16777216),
  constraint org_media_assets_caminho check (position('/assets/' in storage_path) > 0)
);
create unique index if not exists org_media_assets_org_id_unica on public.org_media_assets (organization_id, id);
create index if not exists idx_org_media_assets_org on public.org_media_assets (organization_id, created_at desc);
alter table public.org_media_assets enable row level security;
drop policy if exists tenant_isolation_org_media_assets_all on public.org_media_assets;
create policy tenant_isolation_org_media_assets_all on public.org_media_assets
  for all
  using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));
revoke all on public.org_media_assets from anon;

-- A variável do número pode apontar para um ativo (o áudio de boas-vindas DESTE atendente).
-- FK composta: o ativo tem de ser da MESMA organização da variável.
alter table public.channel_variables add column if not exists asset_id uuid;
alter table public.channel_variables alter column value_text drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'channel_variables_ativo_fk') then
    alter table public.channel_variables add constraint channel_variables_ativo_fk
      foreign key (organization_id, asset_id) references public.org_media_assets(organization_id, id) on delete restrict;
  end if;
end $$;
alter table public.channel_variables drop constraint if exists channel_variables_valor_ou_ativo;
alter table public.channel_variables add constraint channel_variables_valor_ou_ativo
  check ((value_text is not null) <> (asset_id is not null));
