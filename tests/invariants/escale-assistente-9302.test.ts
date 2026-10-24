import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  countAs,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * ASSISTENTE DE CAMPANHA (fork Escale, migration 9302) — o público resolvido no
 * banco: ids, filtro da 2B com os N primeiros e os desmarcados, avulsos, sem
 * repetir, menos os removidos, só da organização; a página com o total; os
 * motivos de quem ficou fora; atendente não vê nada. Roda via `pnpm test:db`.
 */
const C1 = "e5ca1e00-9302-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9302-4000-8000-0000000000c2";
const C3 = "e5ca1e00-9302-4000-8000-0000000000c3";
const FORA = "e5ca1e00-9302-4000-8000-0000000000f1";
const CAMPANHA = "e5ca1e00-9302-4000-8000-0000000000a1";

const publico = (json: object) => `'${JSON.stringify(json)}'::jsonb`;
const contar = (p: object) =>
  `select count(*) from public.fn_escale_contatos_do_publico('${GOV_ORG}', ${publico(p)})`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.campaigns where id = '${CAMPANHA}';
    delete from public.contacts where id::text like 'e5ca1e00-9302-%';
    insert into public.contacts (id, organization_id, display_name, last_activity_at) values
      ('${C1}', '${GOV_ORG}', 'Publicotres Um', now()),
      ('${C2}', '${GOV_ORG}', 'Publicotres Dois', now() - interval '1 day'),
      ('${C3}', '${GOV_ORG}', 'Publicotres Tres', now() - interval '2 days');
  `);
});

describe("fn_escale_contatos_do_publico", () => {
  it("ids marcados, sem os de fora da organização", () => {
    expect(
      countAs(
        GOV_MANAGER,
        contar({ selecao: { tipo: "ids", ids: [C1, FORA] }, avulsos: [], removidos: [] }),
      ),
    ).toBe(1);
  });

  it("o filtro da 2B: os N primeiros menos os desmarcados", () => {
    const filtro = {
      tipo: "filtro",
      visao: "todos",
      padrao: "publicotres",
      digitos: null,
      cpf_hash: null,
      filtros: { fuso: "UTC" },
    };
    expect(
      countAs(
        GOV_MANAGER,
        contar({
          selecao: { ...filtro, quantidade: null, excluidos: [] },
          avulsos: [],
          removidos: [],
        }),
      ),
    ).toBe(3);
    expect(
      countAs(
        GOV_MANAGER,
        contar({
          selecao: { ...filtro, quantidade: 2, excluidos: [C1] },
          avulsos: [],
          removidos: [],
        }),
      ),
    ).toBe(1);
  });

  it("avulsos sem repetir e removidos de fora", () => {
    expect(
      countAs(
        GOV_MANAGER,
        contar({ selecao: { tipo: "ids", ids: [C1] }, avulsos: [C1, C2, C3], removidos: [C3] }),
      ),
    ).toBe(2);
  });

  it("a página traz o total e respeita a ordem (seleção antes dos avulsos)", () => {
    const p = publico({ selecao: { tipo: "ids", ids: [C2] }, avulsos: [C1], removidos: [] });
    expect(
      sql(
        `select contact_id || ':' || total from public.fn_escale_pagina_do_publico('${GOV_ORG}', ${p}, 1, 0);`,
      ).trim(),
    ).toBe(`${C2}:2`);
  });

  it("atendente não vê o público", () => {
    expect(
      countAs(
        GOV_AGENT_A,
        contar({ selecao: { tipo: "ids", ids: [C1, C2] }, avulsos: [], removidos: [] }),
      ),
    ).toBe(0);
  });
});

describe("fn_escale_fora_da_lista", () => {
  it("conta os excluídos por motivo", () => {
    sql(`
      insert into public.campaigns (id, organization_id, name, channel_session_id, base_legal, audience_filter)
        values ('${CAMPANHA}', '${GOV_ORG}', 'Prova 9302', '${GOV_SESSION}', 'consent', '{}'::jsonb);
      insert into public.campaign_recipients (organization_id, campaign_id, contact_id, status, eligibility_status, exclusion_reason) values
        ('${GOV_ORG}', '${CAMPANHA}', '${C1}', 'skipped', 'excluded', 'sem_telefone'),
        ('${GOV_ORG}', '${CAMPANHA}', '${C2}', 'skipped', 'excluded', 'sem_telefone'),
        ('${GOV_ORG}', '${CAMPANHA}', '${C3}', 'skipped', 'excluded', 'duplicado');
    `);
    expect(
      sql(
        `select string_agg(motivo || '=' || quantidade, ',') from public.fn_escale_fora_da_lista('${GOV_ORG}', '${CAMPANHA}');`,
      ).trim(),
    ).toBe("sem_telefone=2,duplicado=1");
  });

  it("as três são invoker", () => {
    expect(
      sql(
        `select count(*) from pg_proc where proname in ('fn_escale_contatos_do_publico','fn_escale_pagina_do_publico','fn_escale_fora_da_lista') and prosecdef;`,
      ).trim(),
    ).toBe("0");
  });
});
