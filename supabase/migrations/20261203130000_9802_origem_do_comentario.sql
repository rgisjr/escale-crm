-- manifest: **Origem do comentário (fork Escale, Fase 10C).** `escale_disparos_de_comentario` ganha a publicação de onde veio o comentário (`publicacao_legenda` até 300, `publicacao_miniatura` e `publicacao_link` até 2.000; a aplicação só grava link https de Instagram/Facebook) e o índice por contato (ficha e filtro). Gatilho `trg_escale_disparos_seguem_a_mescla` em `contacts` (`after update of is_merged_into`, função definer `fn_escale_disparos_seguem_a_mescla`, fechada a todos): quando um contato é mesclado, os disparos dele passam ao vencedor. `fn_escale_contatos_do_filtro` (9105) é recriada com a cláusula `comentario` (`com` = tem disparo; `sem` = não tem), mesma assinatura, invoker. Nenhuma tabela do original muda.
-- ---- FORK ESCALE · origem do comentário (migration 9802) ----

alter table public.escale_disparos_de_comentario
  add column if not exists publicacao_legenda text
    check (publicacao_legenda is null or char_length(publicacao_legenda) <= 300),
  add column if not exists publicacao_miniatura text
    check (publicacao_miniatura is null or char_length(publicacao_miniatura) <= 2000),
  add column if not exists publicacao_link text
    check (publicacao_link is null or char_length(publicacao_link) <= 2000);

create index if not exists idx_escale_disparos_de_comentario_contato
  on public.escale_disparos_de_comentario (organization_id, contact_id, created_at)
  where contact_id is not null;

-- A mescla do original (fn_mesclar_contatos) só reaponta as tabelas dele. Os disparos
-- do contato que virou lápide passam ao vencedor, para a ficha e o filtro não perderem a origem.
create or replace function public.fn_escale_disparos_seguem_a_mescla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.escale_disparos_de_comentario d
     set contact_id = new.is_merged_into,
         updated_at = now()
   where d.organization_id = new.organization_id
     and d.contact_id = new.id;
  return null;
end;
$$;

revoke all on function public.fn_escale_disparos_seguem_a_mescla() from public, anon, authenticated;

drop trigger if exists trg_escale_disparos_seguem_a_mescla on public.contacts;
create trigger trg_escale_disparos_seguem_a_mescla
  after update of is_merged_into on public.contacts
  for each row
  when (new.is_merged_into is not null and new.is_merged_into is distinct from old.is_merged_into)
  execute function public.fn_escale_disparos_seguem_a_mescla();

create or replace function public.fn_escale_contatos_do_filtro(
  p_org uuid,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_filtros jsonb
)
returns table (contact_id uuid, last_activity_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.id, c.last_activity_at
    from public.contacts c
   where c.organization_id = p_org
     and c.kind = 'person'
     and c.is_merged_into is null
     and c.is_personal = (p_visao = 'pessoais')
     -- a busca: a mesma da 9101, mais o nome da empresa (2D)
     and (
       (p_padrao is null and coalesce(cardinality(p_digitos), 0) = 0 and p_cpf_hash is null)
       or (p_padrao is not null and (
            c.name ~* p_padrao
            or c.display_name ~* p_padrao
            or c.email ~* p_padrao
            or c.phone_number ~* p_padrao
            or (c.custom_fields ->> 'link_instagram') ~* p_padrao
            or (c.person_id is not null and exists (
                 select 1 from public.company_people cp
                   join public.companies co on co.id = cp.company_id
                  where cp.person_id = c.person_id and cp.organization_id = c.organization_id
                    and (co.trade_name ~* p_padrao or co.legal_name ~* p_padrao)))))
       or exists (
            select 1 from unnest(coalesce(p_digitos, '{}'::text[])) d
             where c.phone_number like '%' || d || '%')
       or (p_cpf_hash is not null and c.cpf_hash = p_cpf_hash)
     )
     -- a visão pronta
     and (
       p_visao in ('todos', 'pessoais')
       or (p_visao = 'com_negocio' and exists (
            select 1
              from public.crm_leads l
              join public.crm_pipelines p on p.id = l.pipeline_id
             where l.contact_id = c.id
               and l.organization_id = c.organization_id
               and not p.is_archived))
       or (p_visao = 'sem_negocio' and not exists (
            select 1
              from public.crm_leads l
              join public.crm_pipelines p on p.id = l.pipeline_id
             where l.contact_id = c.id
               and l.organization_id = c.organization_id
               and not p.is_archived))
     )
     -- Contato › Data de criação (no fuso da organização)
     and (p_filtros ->> 'criado_de' is null
          or (c.created_at at time zone (p_filtros ->> 'fuso'))::date >= (p_filtros ->> 'criado_de')::date)
     and (p_filtros ->> 'criado_ate' is null
          or (c.created_at at time zone (p_filtros ->> 'fuso'))::date <= (p_filtros ->> 'criado_ate')::date)
     -- Contato › Telefone
     and (case p_filtros ->> 'telefone'
            when 'com' then c.phone_number is not null
            when 'sem' then c.phone_number is null
            when 'internacional' then c.phone_number ~ '^\+[1-9][0-9]{7,14}$' and c.phone_number !~ '^\+55'
            when 'invalido' then c.phone_number is not null
              and c.phone_number !~ '^\+55[1-9][0-9](9[0-9]{8}|[2-8][0-9]{7})$'
              and not (c.phone_number ~ '^\+[1-9][0-9]{7,14}$' and c.phone_number !~ '^\+55')
            else true
          end)
     -- Contato › Comentário (10C): tem (ou não) disparo de comentário, repetido incluído
     and (case p_filtros ->> 'comentario'
            when 'com' then exists (
              select 1 from public.escale_disparos_de_comentario d
               where d.organization_id = c.organization_id and d.contact_id = c.id)
            when 'sem' then not exists (
              select 1 from public.escale_disparos_de_comentario d
               where d.organization_id = c.organization_id and d.contact_id = c.id)
            else true
          end)
     -- Negócio
     and (p_filtros -> 'negocio' is null or public.fn_escale_negocio_passa(c, p_filtros -> 'negocio'))
     -- Tags: grupos E/OU, sem caixa (5b)
     and (p_filtros -> 'tags' is null or public.fn_escale_tags_passam(c.tags, p_filtros -> 'tags'))
     -- Campos: grupos combinados por E ou OU
     and (p_filtros -> 'campos' is null or (
            case when coalesce(p_filtros #>> '{campos,combinar}', 'ou') = 'ou'
              then exists (
                select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g
                 where public.fn_escale_grupo_passa(c, g))
              else not exists (
                select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g
                 where not public.fn_escale_grupo_passa(c, g))
            end))
$$;

revoke all on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) from public, anon;
grant execute on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
