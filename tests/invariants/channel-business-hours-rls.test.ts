import { execFileSync } from "node:child_process";

import { beforeAll, describe, expect, it } from "vitest";

/**
 * HORÁRIO COMERCIAL DO CANAL: isolamento entre organizações, escrita só de manager e as constraints de
 * faixa. Roda via `pnpm test:db`.
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

const ORG_A = "cafe0b02-0000-4000-8000-00000000000a";
const ORG_B = "cafe0b02-0000-4000-8000-00000000000b";
const AGENT_A = "cafe0b02-1111-4000-8000-00000000000a";
const MANAGER_A = "cafe0b02-1111-4000-8000-00000000000d";
const AGENT_B = "cafe0b02-1111-4000-8000-00000000000b";
const CANAL_A = "cafe0b02-2222-4000-8000-00000000000a";
const CANAL_B = "cafe0b02-2222-4000-8000-00000000000b";

const INSERE = (org: string, canal: string, dia: number, ini: number, fim: number): string =>
  `insert into public.channel_business_hours (organization_id, channel_session_id, dia_da_semana, inicio_min, fim_min) values ('${org}', '${canal}', ${dia}, ${ini}, ${fim})`;

beforeAll(() => {
  sql(`
    insert into auth.users (id, email) values
      ('${AGENT_A}', 'chbh-agent-a@invariant.test'),
      ('${MANAGER_A}', 'chbh-mgr-a@invariant.test'),
      ('${AGENT_B}', 'chbh-agent-b@invariant.test')
      on conflict (id) do nothing;

    insert into public.organizations (id, slug, legal_name, display_name) values
      ('${ORG_A}', 'chbh-inv-a', 'Chbh Invariant A', 'Chbh A'),
      ('${ORG_B}', 'chbh-inv-b', 'Chbh Invariant B', 'Chbh B')
      on conflict (id) do nothing;

    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${AGENT_A}', '${ORG_A}', 'agent', now()),
      ('${MANAGER_A}', '${ORG_A}', 'manager', now()),
      ('${AGENT_B}', '${ORG_B}', 'agent', now())
      on conflict do nothing;

    insert into public.channel_sessions (id, organization_id, provider, display_name, phone_number, status)
    values
      ('${CANAL_A}', '${ORG_A}', 'waha', 'Canal A', '5511900000001', 'WORKING'),
      ('${CANAL_B}', '${ORG_B}', 'waha', 'Canal B', '5511900000002', 'WORKING')
    on conflict (id) do nothing;

    ${INSERE(ORG_A, CANAL_A, 1, 570, 1080)} on conflict do nothing;
    ${INSERE(ORG_B, CANAL_B, 1, 570, 1080)} on conflict do nothing;
  `);
});

describe("channel_business_hours", () => {
  it("quem é da organização lê a grade dela", () => {
    expect(countAs(AGENT_A, `select count(*) from public.channel_business_hours where organization_id = '${ORG_A}';`)).toBeGreaterThan(0);
  });
  it("não lê a da organização vizinha", () => {
    expect(countAs(AGENT_A, `select count(*) from public.channel_business_hours where organization_id = '${ORG_B}';`)).toBe(0);
  });
  it("agent não consegue gravar", () => {
    expect(recusado(AGENT_A, `${INSERE(ORG_A, CANAL_A, 2, 540, 600)};`)).toBe(true);
  });
  it("manager consegue gravar", () => {
    expect(recusado(MANAGER_A, `${INSERE(ORG_A, CANAL_A, 3, 540, 600)} on conflict do nothing;`)).toBe(false);
  });
  it("a faixa precisa terminar depois de começar", () => {
    expect(recusado(null, `${INSERE(ORG_A, CANAL_A, 4, 600, 600)};`)).toBe(true);
  });
  it("não aceita dia fora de 0 a 6", () => {
    expect(recusado(null, `${INSERE(ORG_A, CANAL_A, 7, 0, 60)};`)).toBe(true);
  });
  it("o canal tem de ser da mesma organização (FK composta)", () => {
    expect(recusado(null, `${INSERE(ORG_A, CANAL_B, 2, 0, 60)};`)).toBe(true);
  });
  it("o índice único recusa a mesma faixa repetida", () => {
    expect(recusado(null, `${INSERE(ORG_A, CANAL_A, 1, 570, 1000)};`)).toBe(true);
  });
});
