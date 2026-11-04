// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { avancarEnrollmentAtivo, type AdminClient, type TickDeps } from "@/lib/followup/engine";
import type { FlowGraph } from "@/lib/followup/graph-schema";
import type { EnrollmentRow } from "@/lib/followup/node-handlers";

const NOW = new Date("2026-11-04T15:00:00Z");
const GRAFO = {
  nodes: [
    {
      id: "acoes-1",
      type: "acoes_da_automacao",
      label: "Ações",
      position: { x: 0, y: 0 },
      config: { acoes: [{ type: "add_tag", config: { tags: ["vip"] } }] },
    },
    { id: "fim", type: "end", label: "Fim", position: { x: 1, y: 0 }, config: { outcome: "custom" } },
  ],
  edges: [{ id: "e1", source: "acoes-1", target: "fim", condition: { type: "always" } }],
} as FlowGraph;

function enrollment(): EnrollmentRow {
  return {
    id: "enr-1",
    organization_id: "org-1",
    pointer_id: "ptr-1",
    version_id: "ver-1",
    contact_id: "contact-1",
    conversation_id: null,
    current_node_id: "acoes-1",
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

function db(inserted: boolean, executar: ReturnType<typeof vi.fn>): AdminClient {
  return {
    loadFlowGraph: vi.fn(async () => GRAFO),
    loadLeadFacts: vi.fn(async () => ({ lead_stage: null, tags: [] })),
    loadEnrollmentEvents: vi.fn(async () => [
      { node_id: "acoes-1", event_type: "node_advanced", idempotency_key: "acoes-1:0", payload: {} },
    ]),
    loadLastInboundBody: vi.fn(async () => null),
    loadFlowPointerName: vi.fn(async () => null),
    insertEnrollmentEvent: vi.fn(async () => ({ inserted })),
    updateEnrollment: vi.fn(async () => {}),
    executarAcoesDaAutomacao: executar,
  } as unknown as AdminClient;
}

describe("engine — acoes_da_automacao", () => {
  it("executa as ações uma vez após gravar o evento do passo", async () => {
    const executar = vi.fn(async () => ({ ok: true, falhas: [] }));
    const deps: TickDeps = { db: db(true, executar), clock: () => NOW, enqueueJob: async () => {} };

    await avancarEnrollmentAtivo(deps, enrollment());

    expect(executar).toHaveBeenCalledTimes(1);
    expect(executar).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: "org-1", contact_id: "contact-1", enrollment_id: "enr-1" }),
    );
  });

  it("replay do mesmo passo não executa as ações outra vez", async () => {
    const executar = vi.fn(async () => ({ ok: true, falhas: [] }));
    const deps: TickDeps = { db: db(false, executar), clock: () => NOW, enqueueJob: async () => {} };

    await avancarEnrollmentAtivo(deps, enrollment());

    expect(executar).not.toHaveBeenCalled();
  });
});
