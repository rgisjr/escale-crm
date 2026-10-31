import { execFileSync } from "node:child_process";

import { beforeAll, describe, expect, it } from "vitest";

/**
 * VARIÁVEIS DO CANAL: isolamento entre organizações, escrita só de manager e
 * unicidade por (organização, canal, chave). Roda via `pnpm test:db`.
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

function lastLine(out: string): string {
  const lines = out.split("\n");
  return lines[lines.length - 1] ?? "";
}

function countAs(userId: string, query: string): number {
  const out = sql(`
    set role authenticated;
    select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
    ${query}
  `);
  const last = lastLine(out);
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

const ORG_A = "cafe0a01-0000-4000-8000-00000000000a";
const ORG_B = "cafe0a01-0000-4000-8000-00000000000b";
const AGENT_A = "cafe0a01-1111-4000-8000-00000000000a";
const MANAGER_A = "cafe0a01-1111-4000-8000-00000000000d";
const AGENT_B = "cafe0a01-1111-4000-8000-00000000000b";

beforeAll(() => {
  sql(`
    insert into auth.users (id, email) values
      ('${AGENT_A}', 'chvar-agent-a@invariant.test'),
      ('${MANAGER_A}', 'chvar-mgr-a@invariant.test'),
      ('${AGENT_B}', 'chvar-agent-b@invariant.test')
      on conflict (id) do nothing;

    insert into public.organizations (id, slug, legal_name, display_name) values
      ('${ORG_A}', 'chvar-inv-a', 'Chvar Invariant A', 'Chvar A'),
      ('${ORG_B}', 'chvar-inv-b', 'Chvar Invariant B', 'Chvar B')
      on conflict (id) do nothing;

    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${AGENT_A}', '${ORG_A}', 'agent', now()),
      ('${MANAGER_A}', '${ORG_A}', 'manager', now()),
      ('${AGENT_B}', '${ORG_B}', 'agent', now())
      on conflict do nothing;

    insert into public.channel_variables (organization_id, channel_session_id, chave, value_text) values
      ('${ORG_A}', null, 'pix_banco', 'Banco A'),
      ('${ORG_B}', null, 'pix_banco', 'Banco B')
      on conflict do nothing;
  `);
});

describe("channel_variables", () => {
  it("quem é da organização lê as variáveis dela", () => {
    expect(countAs(AGENT_A, `select count(*) from public.channel_variables where organization_id = '${ORG_A}';`)).toBeGreaterThan(0);
  });

  it("não lê as da organização vizinha", () => {
    expect(countAs(AGENT_A, `select count(*) from public.channel_variables where organization_id = '${ORG_B}';`)).toBe(0);
  });

  it("agent não consegue gravar", () => {
    expect(
      recusado(AGENT_A, `insert into public.channel_variables (organization_id, chave, value_text) values ('${ORG_A}', 'pix_nome', 'x');`),
    ).toBe(true);
  });

  it("manager consegue gravar", () => {
    expect(
      recusado(MANAGER_A, `insert into public.channel_variables (organization_id, chave, value_text) values ('${ORG_A}', 'pix_nome', 'Maria') on conflict do nothing;`),
    ).toBe(false);
  });

  it("o índice único recusa o padrão repetido da organização", () => {
    expect(
      recusado(null, `insert into public.channel_variables (organization_id, chave, value_text) values ('${ORG_A}', 'pix_banco', 'outro');`),
    ).toBe(true);
  });
});
