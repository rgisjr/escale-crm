// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { avancarEnrollmentAtivo, type AdminClient, type TickDeps } from "@/lib/followup/engine";
import type { FlowGraph } from "@/lib/followup/graph-schema";
import type { EnrollmentRow } from "@/lib/followup/node-handlers";

const NOW = new Date("2026-11-04T15:00:00Z");
const GRAFO = {
  nodes: [
    {
      id: "cond-1",
      type: "condicoes_da_automacao",
      label: "Condições",
      position: { x: 0, y: 0 },
      config: {
        grupos: [
          { id: "g1", modo: "todas", linhas: [{ field: "lead.tags", op: "contains", value: "vip" }] },
          { id: "g2", modo: "todas", linhas: [{ field: "lead.tags", op: "contains", value: "quente" }] },
        ],
      },
    },
    { id: "n1", type: "end", label: "G1", position: { x: 1, y: 0 }, config: { outcome: "custom" } },
    { id: "n2", type: "end", label: "G2", position: { x: 1, y: 1 }, config: { outcome: "custom" } },
    { id: "fora", type: "end", label: "Fora", position: { x: 1, y: 2 }, config: { outcome: "custom" } },
  ],
  edges: [
    { id: "e1", source: "cond-1", target: "n1", condition: { type: "branch", branch_id: "g1" } },
    { id: "e2", source: "cond-1", target: "n2", condition: { type: "branch", branch_id: "g2" } },
    { id: "ef", source: "cond-1", target: "fora", condition: { type: "always" } },
  ],
} as FlowGraph;

function enrollment(): EnrollmentRow {
  return {
    id: "enr-1",
    organization_id: "org-1",
    pointer_id: "ptr-1",
    version_id: "ver-1",
    contact_id: "contact-1",
    conversation_id: null,
    current_node_id: "cond-1",
    status: "active",
    next_eval_at: NOW.toISOString(),
    claimed_until: null,
    attempts: 0,
    max_attempts: 5,
    last_error: null,
    steps_taken: 0,
    outcome: null,
    cancel_reason: null,
    started_at: NOW.toISOString(),
    completed_at: null,
    updated_at: NOW.toISOString(),
  };
}

describe("engine — condicoes_da_automacao", () => {
  it("avalia os grupos no contexto do contato antes de processar o nó", async () => {
    const patches: Array<Record<string, unknown>> = [];
    const avaliarCondicoesDaAutomacao = vi.fn(async () => "g2");
    const db = {
      loadFlowGraph: vi.fn(async () => GRAFO),
      loadLeadFacts: vi.fn(async () => ({ lead_stage: null, tags: [] })),
      loadEnrollmentEvents: vi.fn(async () => []),
      loadLastInboundBody: vi.fn(async () => null),
      loadFlowPointerName: vi.fn(async () => null),
      insertEnrollmentEvent: vi.fn(async () => ({ inserted: true })),
      updateEnrollment: vi.fn(async (_id: string, _org: string, patch: Record<string, unknown>) => patches.push(patch)),
      avaliarCondicoesDaAutomacao,
    } as unknown as AdminClient;
    const deps: TickDeps = { db, clock: () => NOW, enqueueJob: async () => {} };

    await avancarEnrollmentAtivo(deps, enrollment());

    expect(avaliarCondicoesDaAutomacao).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: "org-1", contact_id: "contact-1" }),
    );
    expect(patches.some((patch) => patch.current_node_id === "n2")).toBe(true);
  });
});
