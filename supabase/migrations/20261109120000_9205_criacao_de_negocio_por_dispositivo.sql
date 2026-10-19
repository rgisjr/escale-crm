-- manifest: **Criação de negócio por dispositivo (fork Escale, Fase 3E).** Tabela nova `crm_criacao_de_negocio` (uma linha por dispositivo: `ligado` e as condições em `regras`, a forma validada pela rota; FK composta com `channel_sessions` em cascata; membros leem, administrador escreve) e a RPC `fn_escale_nascer_negocio_do_dispositivo` (invoker, só service_role): a mesma trava por organização e contato do `fn_nascer_lead_da_conversa`; com negócio do contato na origem da condição (qualquer status), não cria; senão insere na origem e etapa da condição e põe as tags da condição no contato (a régua da 9007) com o evento `contact.tag_added`. Sem linha de configuração, o nascimento continua o do original.
-- ---- FORK ESCALE · criação de negócio por dispositivo (migration 9205) ----

create table if not exists public.crm_criacao_de_negocio (
  channel_session_id uuid primary key,
  organization_id uuid not null,
  ligado boolean not null default false,
  regras jsonb not null default '[]'::jsonb,
  atualizado_por uuid,
  updated_at timestamptz not null default now(),
  constraint crm_criacao_de_negocio_canal_fk foreign key (organization_id, channel_session_id)
    references public.channel_sessions (organization_id, id) on delete cascade,
  constraint crm_criacao_de_negocio_regras_lista
    check (jsonb_typeof(regras) = 'array' and octet_length(regras::text) <= 32768)
);

alter table public.crm_criacao_de_negocio enable row level security;
drop policy if exists crm_criacao_de_negocio_select on public.crm_criacao_de_negocio;
drop policy if exists crm_criacao_de_negocio_write on public.crm_criacao_de_negocio;
create policy crm_criacao_de_negocio_select on public.crm_criacao_de_negocio
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_criacao_de_negocio_write on public.crm_criacao_de_negocio
  for all using ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin'))
  with check ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin'));
revoke all on public.crm_criacao_de_negocio from anon;
grant select, insert, update, delete on public.crm_criacao_de_negocio to authenticated;
grant all on public.crm_criacao_de_negocio to service_role;
drop trigger if exists trg_crm_criacao_de_negocio_updated_at on public.crm_criacao_de_negocio;
create trigger trg_crm_criacao_de_negocio_updated_at
  before update on public.crm_criacao_de_negocio
  for each row execute function public.fn_set_updated_at();
comment on table public.crm_criacao_de_negocio is
  'Criação de negócio por dispositivo (fork Escale, migration 9205; F1): o interruptor e as condições da Clint. Sem linha, o negócio nasce na origem padrão (o original). Membros leem; administrador escreve.';

create or replace function public.fn_escale_nascer_negocio_do_dispositivo(
  p_org uuid,
  p_contact uuid,
  p_pipeline uuid,
  p_stage uuid,
  p_title text,
  p_source text,
  p_source_metadata jsonb default '{}'::jsonb,
  p_tags_do_contato text[] default '{}'::text[]
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_tags text[];
  v_novas text[];
begin
  -- A mesma trava do fn_nascer_lead_da_conversa: as duas portas de nascimento não correm.
  perform pg_advisory_xact_lock(hashtextextended(p_org::text || ':' || p_contact::text, 0));

  -- "Se o contato já possui um negócio nessa origem, nenhum novo negócio é criado e o negócio existente não é alterado."
  if exists (select 1 from public.crm_leads l where l.organization_id = p_org and l.contact_id = p_contact and l.pipeline_id = p_pipeline) then
    return null;
  end if;

  insert into public.crm_leads (organization_id, pipeline_id, stage_id, contact_id, title, source, source_metadata, tags, currency)
  values (p_org, p_pipeline, p_stage, p_contact, p_title, p_source, coalesce(p_source_metadata, '{}'::jsonb), '{}'::text[],
          coalesce((select o.currency from public.organizations o where o.id = p_org), 'BRL'))
  returning id into v_id;

  -- As tags da condição no contato: a régua da 9007 (minúsculas, aparadas, 40, sem `cliente`, sem repetir).
  begin
    select coalesce(array_agg(x.tag order by x.ordem), '{}'::text[]) into v_novas
      from (
        select left(lower(btrim(t.tag, E' \t\r\n\f\x0b')), 40) as tag, min(t.ordem) as ordem
          from unnest(coalesce(p_tags_do_contato, '{}'::text[])) with ordinality as t(tag, ordem)
         group by 1
      ) x
     where x.tag <> '' and x.tag <> 'cliente';
    if cardinality(v_novas) > 0 then
      select coalesce(c.tags, '{}'::text[]) into v_tags
        from public.contacts c
       where c.organization_id = p_org and c.id = p_contact and c.is_anonymized = false and c.is_merged_into is null
       for no key update;
      if found then
        select coalesce(array_agg(n.tag order by n.ordem), '{}'::text[]) into v_novas
          from unnest(v_novas) with ordinality as n(tag, ordem)
         where not exists (select 1 from unnest(v_tags) as a(tag) where left(lower(btrim(a.tag, E' \t\r\n\f\x0b')), 40) = n.tag);
        if cardinality(v_novas) > 0 then
          update public.contacts set tags = v_tags || v_novas, updated_at = now() where organization_id = p_org and id = p_contact;
          perform public.emit_event(
            'contact.tag_added', 'contact', p_contact,
            jsonb_build_object('added_tags', to_jsonb(v_novas), 'tags', to_jsonb(v_tags || v_novas)),
            jsonb_build_object('actor_type', 'system', 'actor_id', 'fn_escale_nascer_negocio_do_dispositivo'),
            p_org);
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'fn_escale_nascer_negocio_do_dispositivo: tags não aplicadas: % (%)', sqlerrm, sqlstate;
  end;

  return v_id;
end;
$$;

revoke all on function public.fn_escale_nascer_negocio_do_dispositivo(uuid, uuid, uuid, uuid, text, text, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.fn_escale_nascer_negocio_do_dispositivo(uuid, uuid, uuid, uuid, text, text, jsonb, text[]) to service_role;
comment on function public.fn_escale_nascer_negocio_do_dispositivo(uuid, uuid, uuid, uuid, text, text, jsonb, text[]) is
  'Fork Escale (9205): o negócio que nasce pela condição do dispositivo (F1). Nulo = o contato já tem negócio nessa origem. Invoker, só o service role (o ingest).';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
