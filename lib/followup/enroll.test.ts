import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

import { enrollFollowupFlow } from "./enroll";
import { flowGraphSchema } from "./graph-schema";

vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const ORG = "22222222-2222-4222-8222-222222222222";
const POINTER = "33333333-3333-4333-8333-333333333333";
const CONTACT = "44444444-4444-4444-8444-444444444444";
const VERSION = "55555555-5555-4555-8555-555555555555";

const GRAPH = flowGraphSchema.parse({
  nodes: [
    { id: "t1", type: "trigger", label: "t1", position: { x: 0, y: 0 }, config: {} },
    { id: "e1", type: "end", label: "e1", position: { x: 0, y: 0 }, config: { outcome: "exhausted" } },
  ],
  edges: [{ id: "edge1", source: "t1", target: "e1", priority: 0, condition: { type: "always" } }],
});

type Row = Record<string, unknown>;

function fakeDb(pointer: Row, inscricoes: Row[] = []) {
  const tables: Record<string, Row[]> = {
    followup_flow_pointers: [pointer],
    contacts: [{ id: CONTACT, organization_id: ORG }],
    followup_flow_versions: [{ id: VERSION, organization_id: ORG, graph: GRAPH }],
    followup_enrollments: [...inscricoes],
    ai_agents: [],
    ai_agent_versions: [],
  };
  return {
    rpc: async () => ({ data: { organization_id: ORG, contact_id: CONTACT, conversation_id: "conv-1", service_revision: 1, demanda_id: null, demanda_revision: null, status: "open", demanda_fechada_em: null }, error: null }),
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      let mode: "select" | "insert" = "select";
      let payload: Row | undefined;
      const b = {
        select() {
          return b;
        },
        limit() {
          return b;
        },
        insert(obj: Row) {
          mode = "insert";
          payload = obj;
          expect(obj).not.toHaveProperty("next_eval_at");
          return b;
        },
        eq(col: string, val: unknown) {
          filters.push([col, val]);
          return b;
        },
        async maybeSingle() {
          const list = tables[table]!.filter((row) => filters.every(([k, v]) => row[k] === v));
          return { data: list[0] ?? null, error: null };
        },
        async single() {
          if (mode === "insert") {
            const row = { id: randomUUID(), ...payload };
            tables[table]!.push(row);
            return { data: row, error: null };
          }
          const list = tables[table]!.filter((row) => filters.every(([k, v]) => row[k] === v));
          return { data: list[0] ?? null, error: null };
        },
      };
      return b;
    },
  };
}

describe("enrollFollowupFlow", () => {
  it("inscreve contato em fluxo ativo publicado", async () => {
    const db = fakeDb({
      id: POINTER,
      organization_id: ORG,
      status: "active",
      active_version_id: VERSION,
    });
    const result = await enrollFollowupFlow(db as never, {
      organizationId: ORG,
      pointerId: POINTER,
      contactId: CONTACT,
      actorUserId: null,
      requestId: "r1",
    });
    expect(result.ok).toBe(true);
  });

  it("recusa fluxo que não está publicado", async () => {
    const db = fakeDb({
      id: POINTER,
      organization_id: ORG,
      status: "draft",
      active_version_id: null,
    });
    const result = await enrollFollowupFlow(db as never, {
      organizationId: ORG,
      pointerId: POINTER,
      contactId: CONTACT,
      actorUserId: null,
      requestId: "r1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("flow_not_active");
  });

  it("recusa roteiro de atendimento — ele começa na conversa, não por inscrição", async () => {
    const db = fakeDb({
      id: POINTER,
      organization_id: ORG,
      status: "active",
      active_version_id: VERSION,
      surface: "atendimento",
    });
    const result = await enrollFollowupFlow(db as never, {
      organizationId: ORG,
      pointerId: POINTER,
      contactId: CONTACT,
      actorUserId: null,
      requestId: "r1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("flow_not_enrollable");
  });

  const esperando = { id: "enr-0", organization_id: ORG, pointer_id: POINTER, contact_id: CONTACT, status: "dormente" };
  const entrada = { organizationId: ORG, pointerId: POINTER, contactId: CONTACT, actorUserId: null, requestId: "r1" };

  it("automação: recusa o contato que já espera num Atraso desta automação", async () => {
    const db = fakeDb({ id: POINTER, organization_id: ORG, status: "active", active_version_id: VERSION, surface: "crm_automation" }, [esperando]);
    const result = await enrollFollowupFlow(db as never, entrada);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("conflict");
  });

  it("automação: inscreve quando não há ninguém esperando", async () => {
    const db = fakeDb({ id: POINTER, organization_id: ORG, status: "active", active_version_id: VERSION, surface: "crm_automation" });
    expect((await enrollFollowupFlow(db as never, entrada)).ok).toBe(true);
  });

  it("follow-up: a inscrição dormente NÃO barra (a cadência longa libera o slot de propósito)", async () => {
    const db = fakeDb({ id: POINTER, organization_id: ORG, status: "active", active_version_id: VERSION, surface: "followup" }, [esperando]);
    expect((await enrollFollowupFlow(db as never, entrada)).ok).toBe(true);
  });
});
