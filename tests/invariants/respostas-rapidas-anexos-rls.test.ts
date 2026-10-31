import { execFileSync } from "node:child_process";

import { beforeAll, describe, expect, it } from "vitest";

/**
 * ANEXO DA RESPOSTA RÁPIDA: isolamento entre organizações, escrita pela régua do template (compartilhada = gerente)
 * e o vínculo organização-template. Roda via `pnpm test:db`.
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

const ORG_A = "cafe0d04-0000-4000-8000-00000000000a";
const ORG_B = "cafe0d04-0000-4000-8000-00000000000b";
const AGENT_A = "cafe0d04-1111-4000-8000-00000000000a";
const MANAGER_A = "cafe0d04-1111-4000-8000-00000000000d";
const AGENT_B = "cafe0d04-1111-4000-8000-00000000000b";
const TPL_A = "cafe0d04-2222-4000-8000-00000000000a";
const TPL_A2 = "cafe0d04-2222-4000-8000-0000000000a2";
const TPL_B = "cafe0d04-2222-4000-8000-00000000000b";

const TEMPLATE = (id: string, org: string, atalho: string): string =>
  `insert into public.message_templates (id, organization_id, owner_user_id, title, shortcut, body) values ('${id}', '${org}', null, '${atalho}', '${atalho}', 'Olá')`;
const ANEXO = (tpl: string, org: string, asset: string): string =>
  `insert into public.crm_respostas_rapidas_anexos (template_id, organization_id, asset) values ('${tpl}', '${org}', '${asset}')`;

beforeAll(() => {
  sql(`
    insert into auth.users (id, email) values
      ('${AGENT_A}', 'rra-agent-a@invariant.test'),
      ('${MANAGER_A}', 'rra-mgr-a@invariant.test'),
      ('${AGENT_B}', 'rra-agent-b@invariant.test')
      on conflict (id) do nothing;

    insert into public.organizations (id, slug, legal_name, display_name) values
      ('${ORG_A}', 'rra-inv-a', 'Rra Invariant A', 'Rra A'),
      ('${ORG_B}', 'rra-inv-b', 'Rra Invariant B', 'Rra B')
      on conflict (id) do nothing;

    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${AGENT_A}', '${ORG_A}', 'agent', now()),
      ('${MANAGER_A}', '${ORG_A}', 'manager', now()),
      ('${AGENT_B}', '${ORG_B}', 'agent', now())
      on conflict do nothing;

    ${TEMPLATE(TPL_A, ORG_A, "rra-a")} on conflict do nothing;
    ${TEMPLATE(TPL_A2, ORG_A, "rra-a2")} on conflict do nothing;
    ${TEMPLATE(TPL_B, ORG_B, "rra-b")} on conflict do nothing;
    ${ANEXO(TPL_A, ORG_A, "var:bv1")} on conflict do nothing;
    ${ANEXO(TPL_B, ORG_B, "var:bv1")} on conflict do nothing;
  `);
});

describe("crm_respostas_rapidas_anexos", () => {
  it("quem é da organização lê o anexo da resposta dela", () => {
    expect(countAs(AGENT_A, `select count(*) from public.crm_respostas_rapidas_anexos where organization_id = '${ORG_A}';`)).toBeGreaterThan(0);
  });
  it("não lê o da organização vizinha", () => {
    expect(countAs(AGENT_A, `select count(*) from public.crm_respostas_rapidas_anexos where organization_id = '${ORG_B}';`)).toBe(0);
  });
  it("agent não grava anexo em resposta compartilhada", () => {
    expect(recusado(AGENT_A, `${ANEXO(TPL_A2, ORG_A, "var:bv2")};`)).toBe(true);
  });
  it("manager grava anexo em resposta compartilhada", () => {
    expect(recusado(MANAGER_A, `${ANEXO(TPL_A2, ORG_A, "var:bv2")} on conflict do nothing;`)).toBe(false);
  });
  it("o organization_id do anexo tem de ser o do template", () => {
    expect(recusado(MANAGER_A, `${ANEXO(TPL_B, ORG_A, "var:bv3")};`)).toBe(true);
  });
  it("asset fora do formato (uuid ou var:<chave>) é recusado", () => {
    expect(recusado(null, `${ANEXO(TPL_A2, ORG_A, "../x")};`)).toBe(true);
  });
});
