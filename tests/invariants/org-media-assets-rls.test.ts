import { execFileSync } from "node:child_process";

import { beforeAll, describe, expect, it } from "vitest";

/**
 * REPOSITÓRIO DE MÍDIA (org_media_assets): isolamento entre organizações, escrita só de manager e a variável de
 * canal que aponta para um ativo (FK composta + valor-ou-ativo). Roda via `pnpm test:db`.
 */
const container = process.env.TEST_DB_CONTAINER;
if (!container) {
  throw new Error("TEST_DB_CONTAINER not set — rode esta suíte via `pnpm test:db` (scripts/test-db.sh)");
}
const containerName: string = container;

function sql(script: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", containerName, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tA", "-f", "-"],
    { input: script, encoding: "utf8" },
  ).trim();
}

function countAs(userId: string, query: string): number {
  const out = sql(`
    set role authenticated;
    select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
    ${query}
  `);
  const last = out.split("\n").at(-1) ?? "";
  if (!/^\d+$/.test(last)) throw new Error(`saída inesperada do psql: ${out}`);
  return Number(last);
}

/** `true` se o comando foi recusado (RLS ou constraint). */
function recusado(userId: string | null, comando: string): boolean {
  try {
    sql(`
      ${userId ? `set role authenticated; select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);` : ""}
      ${comando}
    `);
    return false;
  } catch {
    return true;
  }
}

const ORG_A = "cafe0c03-0000-4000-8000-00000000000a";
const ORG_B = "cafe0c03-0000-4000-8000-00000000000b";
const AGENT_A = "cafe0c03-1111-4000-8000-00000000000a";
const MANAGER_A = "cafe0c03-1111-4000-8000-00000000000d";
const AGENT_B = "cafe0c03-1111-4000-8000-00000000000b";
const ATIVO_A = "cafe0c03-3333-4000-8000-00000000000a";
const ATIVO_B = "cafe0c03-3333-4000-8000-00000000000b";

const INSERE_ATIVO = (id: string, org: string): string =>
  `insert into public.org_media_assets (id, organization_id, nome, mime, size_bytes, storage_path) values ('${id}', '${org}', 'bv.ogg', 'audio/ogg', 10, '${org}/assets/${id}/bv.ogg')`;
const INSERE_VARIAVEL = (org: string, chave: string, valor: string | null, ativo: string | null): string =>
  `insert into public.channel_variables (organization_id, chave, value_text, asset_id) values ('${org}', '${chave}', ${valor === null ? "null" : `'${valor}'`}, ${ativo === null ? "null" : `'${ativo}'`})`;

beforeAll(() => {
  sql(`
    insert into auth.users (id, email) values
      ('${AGENT_A}', 'oma-agent-a@invariant.test'),
      ('${MANAGER_A}', 'oma-mgr-a@invariant.test'),
      ('${AGENT_B}', 'oma-agent-b@invariant.test')
      on conflict (id) do nothing;

    insert into public.organizations (id, slug, legal_name, display_name) values
      ('${ORG_A}', 'oma-inv-a', 'Oma Invariant A', 'Oma A'),
      ('${ORG_B}', 'oma-inv-b', 'Oma Invariant B', 'Oma B')
      on conflict (id) do nothing;

    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${AGENT_A}', '${ORG_A}', 'agent', now()),
      ('${MANAGER_A}', '${ORG_A}', 'manager', now()),
      ('${AGENT_B}', '${ORG_B}', 'agent', now())
      on conflict do nothing;

    ${INSERE_ATIVO(ATIVO_A, ORG_A)} on conflict do nothing;
    ${INSERE_ATIVO(ATIVO_B, ORG_B)} on conflict do nothing;
  `);
});

describe("org_media_assets", () => {
  it("quem é da organização lê os ativos dela", () => {
    expect(countAs(AGENT_A, `select count(*) from public.org_media_assets where organization_id = '${ORG_A}';`)).toBeGreaterThan(0);
  });
  it("não lê os da organização vizinha", () => {
    expect(countAs(AGENT_A, `select count(*) from public.org_media_assets where organization_id = '${ORG_B}';`)).toBe(0);
  });
  it("agent não insere", () => {
    expect(recusado(AGENT_A, `${INSERE_ATIVO("cafe0c03-3333-4000-8000-0000000000a1", ORG_A)};`)).toBe(true);
  });
  it("manager insere", () => {
    expect(recusado(MANAGER_A, `${INSERE_ATIVO("cafe0c03-3333-4000-8000-0000000000a2", ORG_A)} on conflict do nothing;`)).toBe(false);
  });
});

describe("channel_variables.asset_id", () => {
  it("variável que aponta para ativo da mesma organização é aceita", () => {
    expect(recusado(null, `${INSERE_VARIAVEL(ORG_A, "bv_ok", null, ATIVO_A)};`)).toBe(false);
  });
  it("ativo de OUTRA organização é recusado (FK composta)", () => {
    expect(recusado(null, `${INSERE_VARIAVEL(ORG_A, "bv_cruzada", null, ATIVO_B)};`)).toBe(true);
  });
  it("valor e ativo juntos são recusados", () => {
    expect(recusado(null, `${INSERE_VARIAVEL(ORG_A, "bv_dupla", "x", ATIVO_A)};`)).toBe(true);
  });
  it("nem valor nem ativo também é recusado", () => {
    expect(recusado(null, `${INSERE_VARIAVEL(ORG_A, "bv_vazia", null, null)};`)).toBe(true);
  });
});
