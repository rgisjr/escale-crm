// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { actionConfigSchema } from "@/lib/followup/graph-schema";
import { validateFlowForPublish } from "@/lib/followup/validate-publish";
import type { FlowGraph } from "@/lib/followup/graph-schema";
import { avancarEnrollmentAtivo, type AdminClient, type TickDeps } from "@/lib/followup/engine";
import type { EnrollmentRow } from "@/lib/followup/node-handlers";

const NOW = new Date("2026-10-08T17:03:00.000Z");
const ORG = "org-1";
const ATIVO = "11111111-1111-4111-8111-111111111111";
const pos = { x: 0, y: 0 };

describe("nó steps: enfileiramento", () => {
  it("renderiza {{canal.*}} e a volta nos textos e mantém var:<chave> da mídia", async () => {
    const payloads: Array<Record<string, unknown>> = [];
    const grafo = {
      nodes: [
        {
          id: "action-1",
          type: "action",
          config: {
            mode: "steps",
            passos: [
              { tipo: "midia", asset: "var:bv1" },
              { tipo: "texto", texto: "PIX {{canal.pix_chave}} (volta {{volta}})" },
            ],
          },
        },
      ],
      edges: [],
    } as unknown as FlowGraph;
    const db = {
      loadFlowGraph: vi.fn(async () => grafo),
      loadLeadFacts: vi.fn(async () => ({ lead_stage: null, tags: [] })),
      loadRenderContext: vi.fn(async () => ({ canal: { pix_chave: "519" } })),
      loadEnrollmentEvents: vi.fn(async () => [
        { node_id: "repeat-1", idempotency_key: "repeat-1:2", event_type: "node_advanced", payload: { repeat_index: 2, repeat_total: 3 } },
      ]),
      loadLastInboundBody: vi.fn(async () => null),
      loadFlowPointerName: vi.fn(async () => null),
      insertEnrollmentEvent: vi.fn(async () => ({ inserted: true })),
      updateEnrollment: vi.fn(async () => {}),
    } as unknown as AdminClient;
    const deps: TickDeps = {
      db,
      clock: () => NOW,
      enqueueJob: async (job) => {
        payloads.push(job.payload as unknown as Record<string, unknown>);
      },
    };
    const enrollment = {
      id: "enr-1", organization_id: ORG, pointer_id: "ptr-1", version_id: "ver-1", contact_id: "contact-1",
      conversation_id: null, current_node_id: "action-1", status: "active", next_eval_at: NOW.toISOString(),
      claimed_until: null, attempts: 0, max_attempts: 5, last_error: null, steps_taken: 3, outcome: null,
      cancel_reason: null, started_at: NOW.toISOString(), completed_at: null, updated_at: NOW.toISOString(),
    } as EnrollmentRow;
    await avancarEnrollmentAtivo(deps, enrollment);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]!.fixed_steps).toEqual([
      { tipo: "midia", asset: "var:bv1" },
      { tipo: "texto", texto: "PIX 519 (volta 2)" },
    ]);
  });
});

describe("nó steps: schema", () => {
  it("aceita áudio do número + texto e recusa lista vazia", () => {
    const ok = actionConfigSchema.safeParse({
      mode: "steps",
      passos: [{ tipo: "midia", asset: "var:bv1" }, { tipo: "texto", texto: "oi" }],
    });
    expect(ok.success).toBe(true);
    expect(actionConfigSchema.safeParse({ mode: "steps", passos: [] }).success).toBe(false);
  });
});

describe("nó steps: publicação confere a biblioteca de mídia", () => {
  const grafo = (asset: string): FlowGraph =>
    ({
      nodes: [
        { id: "t1", type: "trigger", label: "t1", position: pos, config: {} },
        {
          id: "a1",
          type: "action",
          label: "a1",
          position: pos,
          config: { mode: "steps", passos: [{ tipo: "midia", asset }, { tipo: "texto", texto: "oi" }] },
        },
        { id: "e1", type: "end", label: "e1", position: pos, config: { outcome: "exhausted" } },
      ],
      edges: [
        { id: "t1-a1", source: "t1", target: "a1", condition: { type: "always" } },
        { id: "a1-e1", source: "a1", target: "e1", condition: { type: "always" } },
      ],
    }) as unknown as FlowGraph;
  const codigos = (r: ReturnType<typeof validateFlowForPublish>) => (r.ok ? [] : r.errors.map((e) => e.code));

  it("arquivo que não existe na organização → ativo_inexistente", () => {
    const r = validateFlowForPublish(grafo(ATIVO), { ativos: { ids: new Set(), chaves: new Set() } });
    expect(codigos(r)).toContain("ativo_inexistente");
  });
  it("var:<chave> sem nenhuma linha dessa chave → ativo_inexistente", () => {
    const r = validateFlowForPublish(grafo("var:bv1"), { ativos: { ids: new Set(), chaves: new Set(["bv2"]) } });
    expect(codigos(r)).toContain("ativo_inexistente");
  });
  it("arquivo e variável existentes passam; sem contexto a conferência não roda", () => {
    expect(codigos(validateFlowForPublish(grafo(ATIVO), { ativos: { ids: new Set([ATIVO]), chaves: new Set() } }))).not.toContain("ativo_inexistente");
    expect(codigos(validateFlowForPublish(grafo("var:bv1"), { ativos: { ids: new Set(), chaves: new Set(["bv1"]) } }))).not.toContain("ativo_inexistente");
    expect(codigos(validateFlowForPublish(grafo("var:bv9")))).not.toContain("ativo_inexistente");
  });
});
