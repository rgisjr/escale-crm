import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_AGENT_A, GOV_ORG, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * CRIAÇÃO DE NEGÓCIO POR DISPOSITIVO (fork Escale, migration 9205) — prova contra
 * Postgres real: só admin grava a configuração, todo membro lê; a RPC não cria
 * quando o contato já tem negócio na origem, cria na origem/etapa e põe as tags
 * no contato (minúsculas, sem `cliente`); só o service role executa. `pnpm test:db`.
 */
const SESSAO = "e5ca1e00-9205-4000-8000-0000000000a1";
const CT = "e5ca1e00-9205-4000-8000-0000000000c1";
const ORIGEM = "e5ca1e00-9205-4000-8000-0000000000e1";
const ETAPA = "e5ca1e00-9205-4000-8000-0000000000e2";
const nascer = () =>
  `select public.fn_escale_nascer_negocio_do_dispositivo('${GOV_ORG}', '${CT}', '${ORIGEM}', '${ETAPA}', 'Novo', 'whatsapp', '{}'::jsonb, array['VIP', 'cliente', ' vip '])`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_leads where contact_id = '${CT}';
    delete from public.crm_criacao_de_negocio where channel_session_id = '${SESSAO}';
    insert into public.channel_sessions (id, organization_id, waha_session_name, webhook_secret_encrypted)
      values ('${SESSAO}', '${GOV_ORG}', 'criacao-9205', '\\x00'::bytea) on conflict (id) do nothing;
    insert into public.contacts (id, organization_id, display_name, tags) values ('${CT}', '${GOV_ORG}', 'Criacao Nove', array['lead'])
      on conflict (id) do update set tags = array['lead'];
    insert into public.crm_pipelines (id, organization_id, name, slug) values ('${ORIGEM}', '${GOV_ORG}', 'Criação 9205', 'criacao-9205') on conflict (id) do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values ('${ETAPA}', '${GOV_ORG}', '${ORIGEM}', 'Entrada', 'entrada', 1000) on conflict (id) do nothing;
  `);
});

describe("crm_criacao_de_negocio", () => {
  it("admin grava; atendente lê e não grava", () => {
    expect(writeCountAs(GOV_ADMIN, `insert into public.crm_criacao_de_negocio (channel_session_id, organization_id, ligado) values ('${SESSAO}', '${GOV_ORG}', true)`)).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_criacao_de_negocio where channel_session_id = '${SESSAO}'`)).toBe(1);
    expect(writeCountAs(GOV_AGENT_A, `update public.crm_criacao_de_negocio set ligado = false where channel_session_id = '${SESSAO}'`)).toBe(0);
  });
});

describe("fn_escale_nascer_negocio_do_dispositivo", () => {
  it("cria na origem e etapa, com as tags no contato; a segunda vez não cria", () => {
    const id = sql(`${nascer()};`).trim();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(sql(`select stage_id from public.crm_leads where id = '${id}';`).trim()).toBe(ETAPA);
    expect(sql(`select array_to_string(tags, ',') from public.contacts where id = '${CT}';`).trim()).toBe("lead,vip");
    expect(sql(`${nascer()};`).trim()).toBe("");
  });

  it("só o service role executa", () => {
    expect(() => countAs(GOV_ADMIN, `select count(*) from (${nascer()}) x`)).toThrow();
  });
});
