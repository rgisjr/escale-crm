import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_AGENT_B, GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * CAPA DO CARD (fork Escale, migration 9005) — prova contra Postgres real: só a
 * pessoa lê e escreve a sua preferência, qualquer papel grava a própria, ninguém
 * escreve a de outra pessoa (nem o gerente), uma por pessoa, e os CHECKs e a FK.
 * Roda via `pnpm test:db`.
 */
const ORG_B = "e5ca1e00-9005-4000-8000-000000000001";
const USER_B = "e5ca1e00-9005-4000-8000-000000000002";
const C_DA_ANA = "e5ca1e00-9005-4000-8000-000000000021";
const CAPA = `'{"itens":{}}'::jsonb`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'escale-capas-b@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-capas-b', 'Escale Capas Org B', 'Escale CB') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    delete from public.crm_capas_do_card where organization_id in ('${GOV_ORG}', '${ORG_B}');
    insert into public.crm_capas_do_card (id, organization_id, user_id, capa)
      values ('${C_DA_ANA}', '${GOV_ORG}', '${GOV_AGENT_A}', ${CAPA});
  `);
});

const visto = (id: string) => `select count(*) from public.crm_capas_do_card where id = '${id}';`;

describe("crm_capas_do_card", () => {
  it("só a dona lê (controle positivo); outra pessoa, o gerente e o vizinho não", () => {
    expect(countAs(GOV_AGENT_A, visto(C_DA_ANA))).toBe(1);
    expect(countAs(GOV_AGENT_B, visto(C_DA_ANA))).toBe(0);
    expect(countAs(GOV_MANAGER, visto(C_DA_ANA))).toBe(0);
    expect(countAs(USER_B, visto(C_DA_ANA))).toBe(0);
  });

  it("qualquer papel grava e muda a própria (viewer, controle positivo)", () => {
    sql(`delete from public.crm_capas_do_card where organization_id = '${GOV_ORG}' and user_id = '${GOV_VIEWER}';`);
    expect(writeCountAs(GOV_VIEWER, `insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_VIEWER}', ${CAPA})`)).toBe(1);
    expect(writeCountAs(GOV_VIEWER, `update public.crm_capas_do_card set capa = '{}'::jsonb where organization_id = '${GOV_ORG}' and user_id = '${GOV_VIEWER}'`)).toBe(1);
    sql(`delete from public.crm_capas_do_card where organization_id = '${GOV_ORG}' and user_id = '${GOV_VIEWER}';`);
  });

  it("ninguém grava, muda ou apaga a de outra pessoa — nem o gerente, nem de outra organização", () => {
    expect(writeCountAs(GOV_AGENT_B, `insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_AGENT_A}', ${CAPA})`)).toBe(0);
    expect(writeCountAs(GOV_MANAGER, `update public.crm_capas_do_card set capa = '{}'::jsonb where id = '${C_DA_ANA}'`)).toBe(0);
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_capas_do_card where id = '${C_DA_ANA}'`)).toBe(0);
    expect(writeCountAs(USER_B, `insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${USER_B}', ${CAPA})`)).toBe(0);
    expect(sql(`select count(*) from public.crm_capas_do_card where id = '${C_DA_ANA}';`)).toBe("1");
  });

  it("uma por pessoa, a capa é objeto de até 4 KB, e a FK recusa quem não é membro e apaga em cascata", () => {
    expect(() => sql(`insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_AGENT_A}', ${CAPA});`)).toThrow(/uq_crm_capas_do_card_pessoa/);
    expect(() => sql(`insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_VIEWER}', '[]'::jsonb);`)).toThrow(/crm_capas_do_card_capa_objeto/);
    expect(() => sql(`insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_VIEWER}', jsonb_build_object('x', repeat('a', 5000)));`)).toThrow(/crm_capas_do_card_capa_tamanho/);
    expect(() => sql(`insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${USER_B}', ${CAPA});`)).toThrow(/crm_capas_do_card_pessoa_fk/);
    expect(sql(`select confdeltype from pg_constraint where conname = 'crm_capas_do_card_pessoa_fk';`)).toBe("c");
  });
});
