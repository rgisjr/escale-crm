import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_CONTACT_1,
  GOV_CONTACT_2,
  GOV_CONTACT_3,
  GOV_MANAGER,
  GOV_ORG,
  GOV_PIPELINE,
  GOV_STAGE,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * CONFIGURAÇÕES DA ORIGEM (fork Escale, migration 9007) — prova contra Postgres
 * real: as tags padrão da origem chegam ao CONTATO do negócio novo (na régua do
 * app, sem `cliente`, sem repetir), com UM `contact.tag_added`; e o negócio novo
 * nasce na moeda da origem só quando veio na da organização.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const FUNIL_TAGS = "e5ca1e00-9007-4000-8000-000000000001";
const ETAPA_TAGS = "e5ca1e00-9007-4000-8000-000000000002";
const FUNIL_USD = "e5ca1e00-9007-4000-8000-000000000003";
const ETAPA_USD = "e5ca1e00-9007-4000-8000-000000000004";
const L_TAGS_1 = "e5ca1e00-9007-4000-8000-000000000011";
const L_TAGS_2 = "e5ca1e00-9007-4000-8000-000000000012";
const L_SEM_CONTATO = "e5ca1e00-9007-4000-8000-000000000013";
const L_SEM_TAGS = "e5ca1e00-9007-4000-8000-000000000014";
const L_SESSAO = "e5ca1e00-9007-4000-8000-000000000015";
const L_BRL = "e5ca1e00-9007-4000-8000-000000000021";
const L_EUR = "e5ca1e00-9007-4000-8000-000000000022";
const L_FUNIL_SEM_MOEDA = "e5ca1e00-9007-4000-8000-000000000023";

const tagsDo = (contato: string) =>
  lastLine(sql(`select array_to_string(coalesce(tags, '{}'), '|') from public.contacts where id = '${contato}';`));

const eventosDeTag = (contato: string) =>
  lastLine(
    sql(`
      select count(*)::int from public.event_log
       where event_type = 'contact.tag_added'
         and entity_id = '${contato}'
         and payload -> 'added_tags' @> '["vip"]'::jsonb;
    `),
  );

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.crm_pipelines (id, organization_id, name, slug, settings)
      values ('${FUNIL_TAGS}', '${GOV_ORG}', 'Funil com tags (9007)', 'escale-9007-tags',
              '{"fields": [], "lost_reasons": [], "escale_tags_padrao": ["  Lead Instagram ", "VIP", "cliente", "vip", ""]}'::jsonb),
             ('${FUNIL_USD}', '${GOV_ORG}', 'Funil em dólar (9007)', 'escale-9007-usd',
              '{"fields": [], "lost_reasons": [], "escale_moeda": "USD"}'::jsonb)
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position)
      values ('${ETAPA_TAGS}', '${GOV_ORG}', '${FUNIL_TAGS}', 'Entrada', 'entrada-9007-tags', 1),
             ('${ETAPA_USD}', '${GOV_ORG}', '${FUNIL_USD}', 'Entrada', 'entrada-9007-usd', 1)
      on conflict do nothing;
    update public.contacts set tags = '{"Quente"}' where id = '${GOV_CONTACT_2}';
  `);
});

describe("tags padrão da origem vão para o contato (9007)", () => {
  it("o negócio novo põe as tags no contato, na régua do app, sem `cliente` e sem repetir", () => {
    sql(`
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id)
        values ('${L_TAGS_1}', '${GOV_ORG}', '${FUNIL_TAGS}', '${ETAPA_TAGS}', 'Primeiro', '${GOV_CONTACT_2}')
        on conflict do nothing;
    `);
    expect(tagsDo(GOV_CONTACT_2)).toBe("Quente|lead instagram|vip");
  });

  it("e anuncia UMA vez, no formato do app", () => {
    expect(eventosDeTag(GOV_CONTACT_2)).toBe("1");
  });

  it("um segundo negócio do mesmo contato não repete tag nem evento", () => {
    sql(`
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id)
        values ('${L_TAGS_2}', '${GOV_ORG}', '${FUNIL_TAGS}', '${ETAPA_TAGS}', 'Segundo', '${GOV_CONTACT_2}')
        on conflict do nothing;
    `);
    expect(tagsDo(GOV_CONTACT_2)).toBe("Quente|lead instagram|vip");
    expect(eventosDeTag(GOV_CONTACT_2)).toBe("1");
  });

  it("negócio sem contato nasce normalmente", () => {
    const out = sql(`
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title)
        values ('${L_SEM_CONTATO}', '${GOV_ORG}', '${FUNIL_TAGS}', '${ETAPA_TAGS}', 'Sem contato')
        on conflict do nothing;
      select count(*)::int from public.crm_leads where id = '${L_SEM_CONTATO}';
    `);
    expect(lastLine(out)).toBe("1");
  });

  it("a origem sem tags padrão não mexe no contato", () => {
    const antes = tagsDo(GOV_CONTACT_3);
    sql(`
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id)
        values ('${L_SEM_TAGS}', '${GOV_ORG}', '${GOV_PIPELINE}', '${GOV_STAGE}', 'Sem tags', '${GOV_CONTACT_3}')
        on conflict do nothing;
    `);
    expect(tagsDo(GOV_CONTACT_3)).toBe(antes);
  });

  it("vale também quando quem cria é a sessão de um gerente (RLS ligada)", () => {
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', false);
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id)
        values ('${L_SESSAO}', '${GOV_ORG}', '${FUNIL_TAGS}', '${ETAPA_TAGS}', 'Pela sessão', '${GOV_CONTACT_1}')
        on conflict do nothing;
      reset role;
    `);
    const tags = tagsDo(GOV_CONTACT_1).split("|");
    expect(tags).toContain("lead instagram");
    expect(tags).toContain("vip");
  });
});

describe("moeda da origem no negócio novo (9007)", () => {
  const moedaDe = (lead: string) =>
    lastLine(sql(`select coalesce(currency, '-') from public.crm_leads where id = '${lead}';`));

  it("o negócio que veio na moeda da organização nasce na moeda da origem", () => {
    sql(`
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, currency)
        values ('${L_BRL}', '${GOV_ORG}', '${FUNIL_USD}', '${ETAPA_USD}', 'Em real', 'BRL')
        on conflict do nothing;
    `);
    expect(moedaDe(L_BRL)).toBe("USD");
  });

  it("moeda diferente da da organização foi escolha e fica", () => {
    sql(`
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, currency)
        values ('${L_EUR}', '${GOV_ORG}', '${FUNIL_USD}', '${ETAPA_USD}', 'Em euro', 'EUR')
        on conflict do nothing;
    `);
    expect(moedaDe(L_EUR)).toBe("EUR");
  });

  it("origem sem moeda não muda nada", () => {
    sql(`
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, currency)
        values ('${L_FUNIL_SEM_MOEDA}', '${GOV_ORG}', '${GOV_PIPELINE}', '${GOV_STAGE}', 'Funil comum', 'BRL')
        on conflict do nothing;
    `);
    expect(moedaDe(L_FUNIL_SEM_MOEDA)).toBe("BRL");
  });
});
