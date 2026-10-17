-- manifest: **Configurações da origem (fork Escale, Fase 1F).** Dois gatilhos em `crm_leads`, os dois definer e fechados a anon/authenticated, que leem chaves novas do `settings` da origem (`crm_pipelines.settings`): `trg_escale_lead_nasce_na_moeda_da_origem` (BEFORE INSERT) faz o negócio novo nascer na moeda da origem (`escale_moeda`) quando quem criou mandou a moeda da organização ou nada; `trg_escale_tags_padrao_no_contato` (AFTER INSERT) põe no CONTATO do negócio novo as tags padrão da origem (`escale_tags_padrao`), na régua do app (minúsculas, sem espaço nas pontas, até 40 caracteres), sem a tag de sistema `cliente`, e emite `contact.tag_added` no formato do app. Valem para todo caminho de criação (tela, captação, importação, API, MCP, automação, agente, retomada, transferência e o negócio que nasce da conversa). Falhar ao etiquetar não derruba a criação do negócio. Sem tabela nova.
-- 9007: configurações da origem (fork Escale).

-- ── A MOEDA DA ORIGEM ──────────────────────────────────────────────────────
-- Quem cria o negócio manda a moeda da organização (`createLeadHandler`,
-- `fn_nascer_lead_da_conversa`) ou nada. Com `escale_moeda` na origem, o negócio
-- novo nasce nela. Uma moeda DIFERENTE da da organização foi escolha explícita
-- (MCP, clone de um negócio que já estava em outra moeda) e fica como veio.
-- Moeda fora da forma ISO não é aplicada: a CHECK `crm_leads_currency_iso`
-- derrubaria a criação inteira por causa de uma configuração.
--
-- `crm_leads.currency` tem DEFAULT 'BRL'; por isso, na hora do gatilho, "omitida"
-- e "BRL explícita" são a mesma coisa. Numa organização em BRL, um BRL explícito
-- é indistinguível de moeda omitida e ganha a moeda da origem. Numa organização
-- que NÃO é BRL, a moeda omitida chega como 'BRL' (o default), que é diferente
-- da da organização: foi lida como escolha e fica 'BRL'. O app deve mandar a
-- moeda explicitamente.
create or replace function public.fn_escale_lead_nasce_na_moeda_da_origem()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_moeda text;
  v_da_organizacao text;
begin
  select p.settings ->> 'escale_moeda' into v_moeda
    from public.crm_pipelines p
   where p.id = new.pipeline_id
     and p.organization_id = new.organization_id;
  if v_moeda is null or v_moeda !~ '^[A-Z]{3}$' then
    return new;
  end if;

  select o.currency into v_da_organizacao
    from public.organizations o
   where o.id = new.organization_id;

  if new.currency is null or new.currency = coalesce(v_da_organizacao, 'BRL') then
    new.currency := v_moeda;
  end if;
  return new;
end
$fn$;

revoke all on function public.fn_escale_lead_nasce_na_moeda_da_origem() from public, anon, authenticated;

drop trigger if exists trg_escale_lead_nasce_na_moeda_da_origem on public.crm_leads;
create trigger trg_escale_lead_nasce_na_moeda_da_origem
  before insert on public.crm_leads
  for each row execute function public.fn_escale_lead_nasce_na_moeda_da_origem();

-- ── AS TAGS PADRÃO VÃO PARA O CONTATO ──────────────────────────────────────
-- A Escale não tem tag de negócio na casca: a tag padrão da origem é do
-- CONTATO, e entra por qualquer caminho que crie negócio. A régua é a de
-- `lib/contacts/tag-normalizada.ts` (minúsculas, aparada, 40 caracteres), e a
-- comparação com o que o contato já tem usa a mesma régua, para não duplicar
-- "VIP" e "vip". A aparação é a do `trim()` do JavaScript (espaço, tab, CR, LF,
-- FF e VT, este como \x0b: o Postgres não conhece \v e o leria como a letra v),
-- não só o espaço do `btrim` puro. Só elemento de texto vira tag
-- (número, objeto, nulo e lista dentro da lista são ignorados), e entram no
-- máximo 10 tags padrão por origem (decisão F4): depois de normalizar, tirar o
-- repetido e tirar `cliente`, ficam as 10 primeiras na ordem original.
--
-- `cliente` fica de fora: é a etiqueta que a agenda põe e tira sozinha
-- (`fn_recalcular_cliente_do_contato`), e pô-la por aqui faria o sistema ler
-- que a equipe tomou conta dela (`client_tag_by_system`).
--
-- Anonimizado e mesclado não recebem escrita derivada (a mesma guarda da
-- agenda), e a trava `for no key update` é a que o UPDATE toma de qualquer
-- jeito — não conflita com o `for key share` das FKs que apontam para contacts.
--
-- O evento sai no formato do app (`added_tags` + `tags`), sem `service_origin`
-- (o `emit_event` carimba sozinho) e sem `caused_by_rule`: a automação "quando
-- um contato ganhar uma tag" TEM de ver este evento.
--
-- TUDO o que mexe no contato fica dentro de um bloco com `exception`: etiquetar
-- é consequência, e uma falha aqui (contato sendo anonimizado, trava ocupada)
-- não pode derrubar a criação do negócio em nenhum dos caminhos.
create or replace function public.fn_escale_tags_padrao_no_contato()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_bruto jsonb;
  v_padrao text[];
  v_tags text[];
  v_novas text[];
begin
  if new.contact_id is null then
    return null;
  end if;

  select p.settings -> 'escale_tags_padrao' into v_bruto
    from public.crm_pipelines p
   where p.id = new.pipeline_id
     and p.organization_id = new.organization_id;
  if v_bruto is null or jsonb_typeof(v_bruto) <> 'array' then
    return null;
  end if;

  select coalesce(array_agg(t.tag order by t.primeira), '{}'::text[]) into v_padrao
    from (
      select x.tag, min(x.ordem) as primeira
        from (
          select left(lower(btrim(e.valor #>> '{}', E' \t\r\n\f\x0b')), 40) as tag, e.ordem
            from jsonb_array_elements(v_bruto) with ordinality as e(valor, ordem)
           where jsonb_typeof(e.valor) = 'string'
        ) x
       where x.tag <> '' and x.tag <> 'cliente'
       group by x.tag
       order by min(x.ordem)
       limit 10
    ) t;
  if cardinality(v_padrao) = 0 then
    return null;
  end if;

  begin
    select coalesce(c.tags, '{}'::text[]) into v_tags
      from public.contacts c
     where c.organization_id = new.organization_id
       and c.id = new.contact_id
       and c.is_anonymized = false
       and c.is_merged_into is null
     for no key update;
    if not found then
      return null;
    end if;

    select coalesce(array_agg(p.tag order by p.ordem), '{}'::text[]) into v_novas
      from unnest(v_padrao) with ordinality as p(tag, ordem)
     where not exists (
       select 1
         from unnest(v_tags) as atual(tag)
        where left(lower(btrim(atual.tag, E' \t\r\n\f\x0b')), 40) = p.tag
     );
    if cardinality(v_novas) = 0 then
      return null;
    end if;

    update public.contacts
       set tags = v_tags || v_novas,
           updated_at = now()
     where organization_id = new.organization_id
       and id = new.contact_id;

    perform public.emit_event(
      'contact.tag_added',
      'contact',
      new.contact_id,
      jsonb_build_object('added_tags', to_jsonb(v_novas), 'tags', to_jsonb(v_tags || v_novas)),
      jsonb_build_object('actor_type', 'system', 'actor_id', 'trg_escale_tags_padrao_no_contato'),
      new.organization_id
    );
  exception when others then
    raise warning 'fn_escale_tags_padrao_no_contato: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end
$fn$;

revoke all on function public.fn_escale_tags_padrao_no_contato() from public, anon, authenticated;

drop trigger if exists trg_escale_tags_padrao_no_contato on public.crm_leads;
create trigger trg_escale_tags_padrao_no_contato
  after insert on public.crm_leads
  for each row execute function public.fn_escale_tags_padrao_no_contato();

comment on function public.fn_escale_lead_nasce_na_moeda_da_origem() is
  'Fork Escale (9007): o negócio novo nasce na moeda da origem (crm_pipelines.settings.escale_moeda) quando veio com a moeda da organização ou sem moeda. Definer, fechada a anon/authenticated.';
comment on function public.fn_escale_tags_padrao_no_contato() is
  'Fork Escale (9007): põe no contato do negócio novo as tags padrão da origem (crm_pipelines.settings.escale_tags_padrao), normalizadas, sem cliente, e emite contact.tag_added. Falha vira warning e não derruba o insert. Definer, fechada a anon/authenticated.';

notify pgrst, 'reload schema';
