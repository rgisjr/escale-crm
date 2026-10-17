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

/**
 * BORDAS (9007): o teto de 10 tags, só texto vira tag, "VIP" x "vip", `cliente`,
 * configuração torta, contato anonimizado/mesclado, falha ao etiquetar e moeda
 * fora da forma ISO. Cada caso tem a SUA origem e o SEU contato: os arquivos de
 * invariante rodam em paralelo no mesmo banco.
 */
const id = (grupo: number, n: number) => `e5ca1e00-9007-4000-8000-${String(grupo * 100 + n).padStart(12, "0")}`;
const funil = (n: number) => id(1, n);
const etapa = (n: number) => id(2, n);
const lead = (n: number) => id(3, n);
const contato = (n: number) => id(4, n);

const criarOrigem = (n: number, settings: Record<string, unknown>) => {
  const json = JSON.stringify({ fields: [], lost_reasons: [], ...settings });
  sql(`
    insert into public.crm_pipelines (id, organization_id, name, slug, settings)
      values ('${funil(n)}', '${GOV_ORG}', 'Funil borda 9007 ${n}', 'escale-9007-borda-${n}', '${json}'::jsonb)
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position)
      values ('${etapa(n)}', '${GOV_ORG}', '${funil(n)}', 'Entrada', 'entrada-9007-borda-${n}', 1)
      on conflict do nothing;
  `);
};

const criarContato = (n: number, colunas = "", valores = "") => {
  sql(`
    insert into public.contacts (id, organization_id, display_name${colunas})
      values ('${contato(n)}', '${GOV_ORG}', 'Contato borda 9007 ${n}'${valores})
      on conflict do nothing;
  `);
};

const criarNegocio = (n: number, origem: number, paraContato: number | null, moeda?: string) => {
  const colunaContato = paraContato === null ? "" : ", contact_id";
  const valorContato = paraContato === null ? "" : `, '${contato(paraContato)}'`;
  const colunaMoeda = moeda === undefined ? "" : ", currency";
  const valorMoeda = moeda === undefined ? "" : `, '${moeda}'`;
  sql(`
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title${colunaContato}${colunaMoeda})
      values ('${lead(n)}', '${GOV_ORG}', '${funil(origem)}', '${etapa(origem)}', 'Negócio borda ${n}'${valorContato}${valorMoeda})
      on conflict do nothing;
  `);
};

const negociosCriados = (n: number) =>
  lastLine(sql(`select count(*)::int from public.crm_leads where id = '${lead(n)}';`));

/** Cada `contact.tag_added` do contato, na ordem, como lista de `added_tags`. */
const anuncios = (n: number): string[][] =>
  JSON.parse(
    lastLine(
      sql(`
        select coalesce(jsonb_agg(payload -> 'added_tags' order by created_at, id), '[]'::jsonb)::text
          from public.event_log
         where event_type = 'contact.tag_added' and entity_id = '${contato(n)}';
      `),
    ),
  ) as string[][];

const tagsDaquele = (n: number) => tagsDo(contato(n));

describe("bordas das tags padrão (9007)", () => {
  it("passa de 10 tags padrão distintas: o contato recebe só as 10 primeiras", () => {
    const doze = Array.from({ length: 12 }, (_, i) => `tag${String(i + 1).padStart(2, "0")}`);
    // `cliente` e o repetido saem ANTES do corte: o teto vale para o que sobra.
    criarOrigem(1, { escale_tags_padrao: ["Cliente", "TAG01", ...doze] });
    criarContato(1);
    criarNegocio(1, 1, 1);
    expect(tagsDaquele(1)).toBe(doze.slice(0, 10).join("|"));
    expect(anuncios(1)).toEqual([doze.slice(0, 10)]);
  });

  it("só texto vira tag: número, objeto, booleano, nulo e lista são ignorados", () => {
    criarOrigem(2, { escale_tags_padrao: ["primeira", 42, { a: "objeto" }, true, null, ["lista"], "Segunda"] });
    criarContato(2);
    criarNegocio(2, 2, 2);
    expect(negociosCriados(2)).toBe("1");
    expect(tagsDaquele(2)).toBe("primeira|segunda");
    expect(anuncios(2)).toEqual([["primeira", "segunda"]]);
  });

  it("apara tab, quebra de linha, FF e VT como o trim() do JavaScript, e não come a letra v", () => {
    criarOrigem(6, { escale_tags_padrao: ["\t Vivo \u000b", "\f vip \r\n", "\u000b\u000b"] });
    criarContato(6);
    criarNegocio(6, 6, 6);
    expect(tagsDaquele(6)).toBe("vivo|vip");
    expect(anuncios(6)).toEqual([["vivo", "vip"]]);
  });

  it("o contato que já tem VIP não ganha vip nem evento", () => {
    criarOrigem(3, { escale_tags_padrao: ["vip"] });
    criarContato(3, ", tags", `, '{"VIP"}'`);
    criarNegocio(3, 3, 3);
    expect(negociosCriados(3)).toBe("1");
    expect(tagsDaquele(3)).toBe("VIP");
    expect(anuncios(3)).toEqual([]);
  });

  it("o contato que já é `cliente` continua assim, sem repetir nem anunciar `cliente`", () => {
    criarOrigem(4, { escale_tags_padrao: ["cliente", "extra"] });
    criarContato(4, ", tags", `, '{"cliente"}'`);
    criarNegocio(4, 4, 4);
    expect(tagsDaquele(4)).toBe("cliente|extra");
    expect(anuncios(4)).toEqual([["extra"]]);
  });

  it.each([
    ["texto solto", "vip", 10],
    ["objeto", { vip: true }, 11],
    ["nulo", null, 12],
    ["número", 7, 13],
  ])("`escale_tags_padrao` que não é lista (%s): o negócio nasce e nada é adicionado", (_nome, valor, n) => {
    criarOrigem(n, { escale_tags_padrao: valor });
    criarContato(n);
    criarNegocio(n, n, n);
    expect(negociosCriados(n)).toBe("1");
    expect(tagsDaquele(n)).toBe("");
    expect(anuncios(n)).toEqual([]);
  });

  it("contato anonimizado não recebe tag nem evento, e o negócio nasce", () => {
    criarOrigem(5, { escale_tags_padrao: ["vip"] });
    criarContato(20, ", is_anonymized, anonymized_at", ", true, now()");
    criarNegocio(20, 5, 20);
    expect(negociosCriados(20)).toBe("1");
    expect(tagsDaquele(20)).toBe("");
    expect(anuncios(20)).toEqual([]);
  });

  it("contato mesclado em outro não recebe tag nem evento, e o negócio nasce", () => {
    criarOrigem(5, { escale_tags_padrao: ["vip"] });
    criarContato(21);
    criarContato(22, ", is_merged_into, merged_at", `, '${contato(21)}', now()`);
    criarNegocio(22, 5, 22);
    expect(negociosCriados(22)).toBe("1");
    expect(tagsDaquele(22)).toBe("");
    expect(anuncios(22)).toEqual([]);
  });

  it("falhar ao gravar as tags no contato não derruba o negócio (e nada é anunciado)", () => {
    criarOrigem(5, { escale_tags_padrao: ["vip"] });
    criarContato(30);
    // O gatilho que quebra o UPDATE nasce e morre dentro da transação: os
    // outros arquivos de invariante nunca o veem.
    const out = sql(`
      begin;
      create function public.fn_prova_9007_quebra_contato() returns trigger
        language plpgsql as $f$ begin raise exception 'prova 9007: UPDATE de contato recusado'; end $f$;
      create trigger trg_prova_9007_quebra_contato before update on public.contacts
        for each row when (old.id = '${contato(30)}') execute function public.fn_prova_9007_quebra_contato();
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id)
        values ('${lead(30)}', '${GOV_ORG}', '${funil(5)}', '${etapa(5)}', 'Negócio com falha', '${contato(30)}');
      select (select count(*) from public.crm_leads where id = '${lead(30)}')::text
             || '/' || (select coalesce(array_to_string(tags, '|'), '') from public.contacts where id = '${contato(30)}')
             || '/' || (select count(*) from public.event_log
                         where event_type = 'contact.tag_added' and entity_id = '${contato(30)}')::text;
      rollback;
    `);
    // psql imprime o `ROLLBACK` por último: a linha da prova é a anterior.
    expect(out.split("\n").filter((linha) => /^\d+\/.*\/\d+$/.test(linha))).toEqual(["1//0"]);
    expect(negociosCriados(30)).toBe("0");
  });
});

describe("moeda fora da forma ISO não é aplicada (9007)", () => {
  const moedaDoNegocio = (n: number) =>
    lastLine(sql(`select coalesce(currency, '-') from public.crm_leads where id = '${lead(n)}';`));

  it.each([
    ["minúscula", "usd", 40],
    ["curta", "US", 41],
  ])("`escale_moeda` %s: o negócio nasce e fica na moeda que veio", (_nome, moeda, n) => {
    criarOrigem(n, { escale_moeda: moeda });
    criarNegocio(n, n, null, "BRL");
    expect(negociosCriados(n)).toBe("1");
    expect(moedaDoNegocio(n)).toBe("BRL");
  });
});
