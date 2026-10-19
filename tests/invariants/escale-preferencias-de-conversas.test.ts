import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  tableExists,
  writeCountAs,
} from "./gov-helpers";

/**
 * PREFERÊNCIAS DE CONVERSAS (fork Escale, migration 9201) — prova contra
 * Postgres real: cada pessoa só vê e escreve as suas, uma linha por chave, a
 * chave é fechada, viewer escreve (é preferência de tela), e a FK da pessoa
 * barra quem não é membro. Roda via `pnpm test:db` (fim da Frente C).
 */
const T = "public.crm_preferencias_de_conversas";
const OUTRA_ORG = "e5ca1e00-9201-4000-8000-0000000000b1";
const VIZINHO = "e5ca1e00-9201-4000-8000-0000000000b2";
const minhas = (quem: string) => `select count(*) from ${T} where user_id = '${quem}'`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from ${T} where organization_id in ('${GOV_ORG}', '${OUTRA_ORG}');
    insert into auth.users (id, email) values ('${VIZINHO}', 'prefs-vizinho@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', 'prefs-vizinha', 'Prefs Vizinha', 'Vizinha') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${VIZINHO}', '${OUTRA_ORG}', 'admin', now()) on conflict do nothing;
  `);
});

describe("crm_preferencias_de_conversas", () => {
  it("existe, com RLS", () => {
    expect(tableExists("crm_preferencias_de_conversas")).toBe(true);
    expect(sql(`select relrowsecurity from pg_class where oid = '${T}'::regclass;`).trim()).toBe(
      "t",
    );
  });

  it("a pessoa grava a sua e só vê a sua; a outra pessoa e o vizinho veem zero", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'secoes', '{"notas": false}')`,
      ),
    ).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from ${T}`)).toBe(1);
    expect(countAs(GOV_AGENT_B, `select count(*) from ${T}`)).toBe(0);
    expect(countAs(VIZINHO, `select count(*) from ${T}`)).toBe(0);
  });

  it("ninguém grava em nome de outra pessoa", () => {
    expect(writeCountAs(
        GOV_AGENT_B,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'visualizacao', '{}')`,
      )).toBe(0);
    expect(
      writeCountAs(GOV_AGENT_B, `update ${T} set valor = '{}' where user_id = '${GOV_AGENT_A}'`),
    ).toBe(0);
  });

  it("uma linha por chave; chave fora da lista é recusada; viewer escreve", () => {
    expect(() =>
      writeCountAs(
        GOV_AGENT_A,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'secoes', '{}')`,
      ),
    ).toThrow(/uq_crm_preferencias_de_conversas_pessoa/);
    expect(() =>
      writeCountAs(
        GOV_AGENT_A,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'inventada', '{}')`,
      ),
    ).toThrow(/chave_valida/);
    expect(
      writeCountAs(
        GOV_VIEWER,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_VIEWER}', 'visualizacao', '{}')`,
      ),
    ).toBe(1);
    expect(countAs(GOV_VIEWER, minhas(GOV_VIEWER))).toBe(1);
  });

  it("a FK da pessoa barra quem não é membro da organização", () => {
    expect(() =>
      sql(
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${VIZINHO}', 'secoes', '{}');`,
      ),
    ).toThrow(/crm_preferencias_de_conversas_pessoa_fk/);
  });
});
