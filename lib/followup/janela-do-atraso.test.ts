// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { avancarEnrollmentAtivo, type AdminClient, type TickDeps } from "@/lib/followup/engine";
import { faixasDaJanela, instanteNaJanela } from "@/lib/followup/janela-do-atraso";
import type { FlowGraph } from "@/lib/followup/graph-schema";
import type { EnrollmentRow } from "@/lib/followup/node-handlers";

const SP = "America/Sao_Paulo";
const todos = [0, 1, 2, 3, 4, 5, 6];

describe("instanteNaJanela", () => {
  it("dentro da janela, o instante fica como está", () => {
    const t = new Date("2026-11-04T13:00:00Z");
    expect(instanteNaJanela(t, SP, { de: "08:00", ate: "19:00", dias: todos })).toEqual(t);
  });

  it("antes da janela, vai para a abertura do mesmo dia", () => {
    const t = new Date("2026-11-04T09:00:00Z");
    expect(instanteNaJanela(t, SP, { de: "08:00", ate: "09:00", dias: todos }).toISOString()).toBe(
      "2026-11-04T11:00:00.000Z",
    );
  });

  it("depois da janela, vai para a abertura do próximo dia permitido", () => {
    const t = new Date("2026-11-07T01:30:00Z");
    const seg = instanteNaJanela(t, SP, { de: "08:00", ate: "19:00", dias: [1, 2, 3, 4, 5] });
    expect(seg.toISOString()).toBe("2026-11-09T11:00:00.000Z");
  });

  it("janela que atravessa a meia-noite vira duas faixas", () => {
    expect(faixasDaJanela({ de: "22:00", ate: "06:00", dias: [1] })).toEqual([
      { diaDaSemana: 1, inicioMin: 1320, fimMin: 1440 },
      { diaDaSemana: 2, inicioMin: 0, fimMin: 360 },
    ]);
  });
});

describe("engine — fuso da janela do atraso", () => {
  it("lê o fuso da organização e o passa ao nó wait com janela", async () => {
    const agora = new Date("2026-11-04T15:00:00Z");
    const patches: Array<Record<string, unknown>> = [];
    const grafo = {
      nodes: [
        {
          id: "w1",
          type: "wait",
          label: "Atraso",
          position: { x: 0, y: 0 },
          config: {
            mode: "fixed",
            duration_ms: 60_000,
            immune_to_reply: true,
            janela: { de: "08:00", ate: "09:00", dias: [0, 1, 2, 3, 4, 5, 6] },
          },
        },
      ],
      edges: [],
    } as FlowGraph;
    const lerFusoDaOrganizacao = vi.fn(async () => "America/Sao_Paulo");
    const db = {
      loadFlowGraph: vi.fn(async () => grafo),
      loadLeadFacts: vi.fn(async () => ({ lead_stage: null, tags: [] })),
      loadEnrollmentEvents: vi.fn(async () => []),
      loadLastInboundBody: vi.fn(async () => null),
      loadFlowPointerName: vi.fn(async () => null),
      insertEnrollmentEvent: vi.fn(async () => ({ inserted: true })),
      updateEnrollment: vi.fn(async (_id: string, _org: string, patch: Record<string, unknown>) => {
        patches.push(patch);
      }),
      lerFusoDaOrganizacao,
    } as unknown as AdminClient;
    const enrollment = {
      id: "enr-1",
      organization_id: "org-1",
      pointer_id: "ptr-1",
      version_id: "ver-1",
      contact_id: "contact-1",
      conversation_id: null,
      current_node_id: "w1",
      status: "active",
      next_eval_at: agora.toISOString(),
      claimed_until: null,
      attempts: 0,
      max_attempts: 5,
      last_error: null,
      steps_taken: 0,
      outcome: null,
      cancel_reason: null,
      started_at: agora.toISOString(),
      completed_at: null,
      updated_at: agora.toISOString(),
    } as EnrollmentRow;
    const deps: TickDeps = { db, clock: () => agora, enqueueJob: async () => {} };

    await avancarEnrollmentAtivo(deps, enrollment);

    expect(lerFusoDaOrganizacao).toHaveBeenCalledWith("org-1");
    expect(patches.some((patch) => patch.next_eval_at === "2026-11-05T11:00:00.000Z")).toBe(true);
  });
});
