import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_CONTACT_1,
  GOV_CONV_UNASSIGNED,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  tableExists,
  writeCountAs,
} from "./gov-helpers";

/**
 * MIGRATION 9202 (fork Escale, Fase 3B) — prova contra Postgres real das três
 * tabelas: mensagens agendadas, pausas de automação e eventos da conversa.
 * Roda via `pnpm test:db` no fim da Frente C.
 */
const AG = "public.crm_mensagens_agendadas";
const PA = "public.crm_pausas_de_automacao";
const EV = "public.crm_eventos_da_conversa";
const VIZINHO = "e5ca1e00-9202-4000-8000-0000000000b2";
const OUTRA_ORG = "e5ca1e00-9202-4000-8000-0000000000b1";
const agendar = (quem: string, tipo = "texto") =>
  `insert into ${AG} (organization_id, conversation_id, contact_id, channel_session_id, tipo, corpo, enviar_em, criado_por)
   values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', '${GOV_CONTACT_1}', '${GOV_SESSION}', '${tipo}', 'Boa tarde', now() + interval '1 hour', '${quem}')`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from ${AG} where organization_id = '${GOV_ORG}';
    delete from ${PA} where organization_id = '${GOV_ORG}';
    delete from ${EV} where organization_id = '${GOV_ORG}';
    insert into auth.users (id, email) values ('${VIZINHO}', '9202-vizinho@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', '9202-vizinha', '9202 Vizinha', 'Vizinha') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${VIZINHO}', '${OUTRA_ORG}', 'admin', now()) on conflict do nothing;
  `);
});

describe("crm_mensagens_agendadas", () => {
  it("existe com RLS; o agente agenda a sua e todo agente+ da organização vê; o vizinho vê zero", () => {
    expect(tableExists("crm_mensagens_agendadas")).toBe(true);
    expect(writeCountAs(GOV_AGENT_A, agendar(GOV_AGENT_A))).toBe(1);
    expect(countAs(GOV_AGENT_B, `select count(*) from ${AG}`)).toBe(1);
    expect(countAs(GOV_MANAGER, `select count(*) from ${AG}`)).toBe(1);
    expect(countAs(VIZINHO, `select count(*) from ${AG}`)).toBe(0);
    expect(() => writeCountAs(GOV_AGENT_B, agendar(GOV_AGENT_A))).toThrow();
    expect(() => writeCountAs(GOV_VIEWER, agendar(GOV_VIEWER))).toThrow();
  });

  it("remover: o outro agente não; quem criou sim; o gerente sim; só pendente vira removida", () => {
    const id = sql(`select id from ${AG} where organization_id = '${GOV_ORG}' limit 1;`).trim();
    expect(
      writeCountAs(GOV_AGENT_B, `update ${AG} set status = 'removida' where id = '${id}'`),
    ).toBe(0);
    expect(() =>
      writeCountAs(GOV_AGENT_A, `update ${AG} set status = 'enviada' where id = '${id}'`),
    ).toThrow();
    expect(
      writeCountAs(GOV_AGENT_A, `update ${AG} set status = 'removida' where id = '${id}'`),
    ).toBe(1);
    expect(writeCountAs(GOV_AGENT_A, agendar(GOV_AGENT_A))).toBe(1);
    const id2 = sql(
      `select id from ${AG} where organization_id = '${GOV_ORG}' and status = 'pendente' limit 1;`,
    ).trim();
    expect(
      writeCountAs(GOV_MANAGER, `update ${AG} set status = 'removida' where id = '${id2}'`),
    ).toBe(1);
  });

  it("os CHECKs: tipo, status e conteúdo coerente", () => {
    expect(() => sql(agendar(GOV_AGENT_A, "audio") + ";")).toThrow(/tipo_valido/);
    expect(() =>
      sql(`insert into ${AG} (organization_id, conversation_id, contact_id, channel_session_id, tipo, corpo, template, enviar_em, criado_por)
           values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', '${GOV_CONTACT_1}', '${GOV_SESSION}', 'template', 'x', '{}', now(), '${GOV_AGENT_A}');`),
    ).toThrow(/conteudo/);
  });
});

describe("crm_pausas_de_automacao", () => {
  it("o agente pausa (user_id = ele), o outro agente vê e retoma (delete), o vizinho zero, uma por conversa", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `insert into ${PA} (conversation_id, organization_id, ate, user_id) values ('${GOV_CONV_UNASSIGNED}', '${GOV_ORG}', null, '${GOV_AGENT_A}')`,
      ),
    ).toBe(1);
    expect(() =>
      writeCountAs(
        GOV_AGENT_B,
        `insert into ${PA} (conversation_id, organization_id, ate, user_id) values ('${GOV_CONV_UNASSIGNED}', '${GOV_ORG}', null, '${GOV_AGENT_B}')`,
      ),
    ).toThrow(/pkey|duplicate/);
    expect(countAs(GOV_AGENT_B, `select count(*) from ${PA}`)).toBe(1);
    expect(countAs(VIZINHO, `select count(*) from ${PA}`)).toBe(0);
    expect(() =>
      writeCountAs(
        GOV_AGENT_B,
        `insert into ${PA} (conversation_id, organization_id, ate, user_id) values ('${GOV_CONV_UNASSIGNED}', '${GOV_ORG}', null, '${GOV_AGENT_A}')`,
      ),
    ).toThrow();
    expect(
      writeCountAs(
        GOV_AGENT_B,
        `delete from ${PA} where conversation_id = '${GOV_CONV_UNASSIGNED}'`,
      ),
    ).toBe(1);
  });
});

describe("crm_eventos_da_conversa", () => {
  it("o agente grava com o próprio id; quem vê a conversa vê o evento; o vizinho zero; tipo fechado", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `insert into ${EV} (organization_id, conversation_id, tipo, user_id) values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', 'espera', '${GOV_AGENT_A}')`,
      ),
    ).toBe(1);
    expect(() =>
      writeCountAs(
        GOV_AGENT_A,
        `insert into ${EV} (organization_id, conversation_id, tipo, user_id) values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', 'espera', '${GOV_AGENT_B}')`,
      ),
    ).toThrow();
    expect(() =>
      sql(
        `insert into ${EV} (organization_id, conversation_id, tipo, user_id) values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', 'inventado', null);`,
      ),
    ).toThrow(/tipo_valido/);
    expect(countAs(GOV_AGENT_B, `select count(*) from ${EV}`)).toBe(1);
    expect(countAs(VIZINHO, `select count(*) from ${EV}`)).toBe(0);
    // O sistema (service role) grava a espera removida sem pessoa.
    sql(
      `insert into ${EV} (organization_id, conversation_id, tipo, user_id) values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', 'espera_removida', null);`,
    );
    expect(countAs(GOV_AGENT_A, `select count(*) from ${EV} where tipo = 'espera_removida'`)).toBe(
      1,
    );
  });
});
