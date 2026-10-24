-- manifest: **Ficha do contato e mescla da casca (fork Escale, Fase 2E).** `fn_escale_chave_do_telefone` (a chave do telefone com o nono dígito, espelho de `canonicalPhoneBR`); `fn_escale_chaves_de_mescla(p_org)` (invoker: as chaves de telefone — também o parkado em `source_metadata.telefone_em_conflito` —, e-mail, ID do WhatsApp e Instagram que se repetem entre 2 e 50 contatos vivos; o servidor agrupa e pontua); `fn_escale_mesclar_contatos` (invoker: chama o `fn_mesclar_contatos` do original, que confere o papel de gerente e reponta tudo, e grava no principal o nome, o e-mail, o telefone e o Instagram escolhidos, na mesma transação); `crm_notas_do_negocio.lead_id` aceita nulo para a nota do contato, com as policies refeitas (nota solta: a organização vê; agente+ escreve como autor).
-- 9106: ficha do contato e mescla (fork Escale, Frente B).

-- ── 1. A chave do telefone ───────────────────────────────────────────────────
-- Espelha `canonicalPhoneBR` + só dígitos (lib/channels/phone-variants.ts): o celular
-- brasileiro de 12 dígitos (55 + DDD + 8 começando em 6-9) ganha o nono; o resto fica.
create or replace function public.fn_escale_chave_do_telefone(p_telefone text)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select case
    when d = '' then null
    when length(d) = 12 and d like '55%' and substr(d, 3, 2) ~ '^[1-9][0-9]$' and substr(d, 5, 1) ~ '^[6-9]$'
      then '55' || substr(d, 3, 2) || '9' || substr(d, 5)
    else d
  end
  from (select regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g') as d) x;
$$;

revoke all on function public.fn_escale_chave_do_telefone(text) from public, anon;
grant execute on function public.fn_escale_chave_do_telefone(text) to authenticated, service_role;

-- ── 2. As chaves que repetem ─────────────────────────────────────────────────
-- Invoker: lê `contacts` com a RLS de quem pede. Grupos de mais de 50 ficam fora
-- (a Clint chama de "Grupo grande demais para exibir"; o motor aceita até 20).
create or replace function public.fn_escale_chaves_de_mescla(p_org uuid)
returns table (contato_id uuid, regra text, chave text)
language sql
stable
security invoker
set search_path = ''
as $$
  with vivos as (
    select c.id, c.phone_number, c.email_normalized, c.email, c.wa_lid, c.source_metadata, c.custom_fields
      from public.contacts c
     where c.organization_id = p_org
       and c.is_merged_into is null
       and not c.is_anonymized
  ),
  chaves as (
    select id, 'telefone'::text as regra, public.fn_escale_chave_do_telefone(phone_number) as chave from vivos
    union all
    select id, 'telefone', public.fn_escale_chave_do_telefone(source_metadata ->> 'telefone_em_conflito') from vivos
    union all
    select id, 'email', nullif(lower(btrim(coalesce(email_normalized, email))), '') from vivos
    union all
    select id, 'whatsapp', nullif(btrim(wa_lid::text), '') from vivos
    union all
    select id, 'instagram', lower(substring(custom_fields ->> 'link_instagram' from 'instagram\.com/([A-Za-z0-9._]+)')) from vivos
  ),
  validas as (
    select distinct id, regra, chave from chaves where chave is not null and chave <> ''
  ),
  contadas as (
    select id, regra, chave, count(*) over (partition by regra, chave) as n from validas
  )
  select id, regra, chave from contadas where n between 2 and 50;
$$;

revoke all on function public.fn_escale_chaves_de_mescla(uuid) from public, anon;
grant execute on function public.fn_escale_chaves_de_mescla(uuid) to authenticated, service_role;

-- ── 3. Mesclar com as escolhas ───────────────────────────────────────────────
-- Invoker: o `fn_mesclar_contatos` (definer do original) confere o suporte e o papel
-- de gerente pelo `auth.uid()` de quem chama. Depois dele os secundários são lápide
-- (`is_merged_into`) e saem dos índices únicos parciais, então o principal pode receber
-- o telefone ou o e-mail de um deles. Um terceiro contato VIVO com o mesmo valor faz o
-- bloco inteiro voltar (a mescla junto) com `identidade_em_uso`.
create or replace function public.fn_escale_mesclar_contatos(
  p_org uuid,
  p_principal uuid,
  p_secundarios uuid[],
  p_escolhas jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_resultado jsonb;
  v_escolhas jsonb := coalesce(p_escolhas, '{}'::jsonb);
begin
  begin
    v_resultado := public.fn_mesclar_contatos(p_org, p_principal, p_secundarios);

    if v_escolhas ?| array['nome', 'email', 'telefone', 'instagram'] then
      update public.contacts c
         set name = case when v_escolhas ? 'nome' then coalesce(nullif(btrim(v_escolhas ->> 'nome'), ''), c.name) else c.name end,
             email = case when v_escolhas ? 'email' then coalesce(nullif(btrim(v_escolhas ->> 'email'), ''), c.email) else c.email end,
             phone_number = case when v_escolhas ? 'telefone' then coalesce(nullif(btrim(v_escolhas ->> 'telefone'), ''), c.phone_number) else c.phone_number end,
             custom_fields = case
               when v_escolhas ? 'instagram' and nullif(btrim(v_escolhas ->> 'instagram'), '') is not null
                 then jsonb_set(coalesce(c.custom_fields, '{}'::jsonb), '{link_instagram}', to_jsonb(btrim(v_escolhas ->> 'instagram')))
               else c.custom_fields
             end,
             updated_at = now()
       where c.organization_id = p_org
         and c.id = p_principal;
    end if;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'identidade_em_uso';
  end;
  return v_resultado;
end;
$$;

revoke all on function public.fn_escale_mesclar_contatos(uuid, uuid, uuid[], jsonb) from public, anon;
grant execute on function public.fn_escale_mesclar_contatos(uuid, uuid, uuid[], jsonb) to authenticated, service_role;

-- ── 4. A nota do contato ─────────────────────────────────────────────────────
alter table public.crm_notas_do_negocio alter column lead_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crm_notas_do_negocio_tem_dono') then
    alter table public.crm_notas_do_negocio
      add constraint crm_notas_do_negocio_tem_dono check (lead_id is not null or contact_id is not null);
  end if;
end $$;

create index if not exists idx_crm_notas_do_negocio_contato
  on public.crm_notas_do_negocio (organization_id, contact_id, created_at desc);

drop policy if exists crm_notas_do_negocio_select on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_insert on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_dono_ou_gerente_write on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_dono_ou_gerente_delete on public.crm_notas_do_negocio;

-- Nota do negócio: quem vê o negócio, pela regra da origem (como na 9010). Nota solta do contato: a
-- organização inteira, como o próprio contato (RLS de `contacts` é só por organização).
create policy crm_notas_do_negocio_select on public.crm_notas_do_negocio
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (case
               when lead_id is null then contact_id is not null
               else exists (select 1 from public.crm_leads l
                             where l.id = crm_notas_do_negocio.lead_id
                               and l.organization_id = crm_notas_do_negocio.organization_id
                               and public.fn_escale_pode_ver_negocio(l.organization_id, l.owner_user_id, l.pipeline_id))
             end))
  );

create policy crm_notas_do_negocio_insert on public.crm_notas_do_negocio
  for insert with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and user_id = auth.uid()
        and (case
               when lead_id is null then contact_id is not null
               else exists (select 1 from public.crm_leads l
                             where l.id = crm_notas_do_negocio.lead_id
                               and l.organization_id = crm_notas_do_negocio.organization_id)
             end))
  );

create policy crm_notas_do_negocio_dono_ou_gerente_write on public.crm_notas_do_negocio
  for update using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager'))
        and (lead_id is null
             or exists (select 1 from public.crm_leads l
                         where l.id = crm_notas_do_negocio.lead_id
                           and l.organization_id = crm_notas_do_negocio.organization_id)))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager'))
        and (lead_id is null
             or exists (select 1 from public.crm_leads l
                         where l.id = crm_notas_do_negocio.lead_id
                           and l.organization_id = crm_notas_do_negocio.organization_id)))
  );

create policy crm_notas_do_negocio_dono_ou_gerente_delete on public.crm_notas_do_negocio
  for delete using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager'))
        and (lead_id is null
             or exists (select 1 from public.crm_leads l
                         where l.id = crm_notas_do_negocio.lead_id
                           and l.organization_id = crm_notas_do_negocio.organization_id)))
  );

comment on column public.crm_notas_do_negocio.lead_id is
  'Negócio da nota (fork Escale 9008). Nulo desde a 9106: nota do contato, feita pela janela do contato da casca.';
