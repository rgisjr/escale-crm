// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { audit, publicar } = vi.hoisted(() => ({ audit: vi.fn(), publicar: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/instalacao/modulos", () => ({ moduloLigado: vi.fn(async () => true) }));
vi.mock("@/lib/followup/publish", () => ({ publishFollowupFlowVersion: publicar }));
vi.mock("@/lib/followup/etapas-citadas", () => ({ carregaEtapasCitadas: vi.fn(async () => ({ ok: true, etapas: new Map() })) }));
vi.mock("@/lib/followup/validate-publish", () => ({
  algumCanalExigeModeloForaDaJanela: () => false,
  proximosDoGrafo: () => [],
  validateFlowForPublish: () => ({ ok: true }),
}));

import { criarFluxo, publicarFluxo, salvarFluxo } from "@/lib/followup/escrita-de-fluxo";

const ORG = "11111111-1111-4111-8111-111111111111";
const FLUXO = "22222222-2222-4222-8222-222222222222";
const autor = { userId: "u1" };

/** Banco falso: `ponteiro` é a linha lida; `conexoes` volta para a leitura de canais. */
function banco(ponteiro: Record<string, unknown> | null) {
  const insercoes: Array<Record<string, unknown>> = [];
  const db = {
    from: (tabela: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is", "neq", "update"]) q[m] = () => q;
      q.insert = (v: Record<string, unknown>) => {
        insercoes.push(v);
        return q;
      };
      q.maybeSingle = async () => ({ data: ponteiro, error: null });
      q.single = async () => ({ data: { id: FLUXO, status: "active", ...insercoes.at(-1) }, error: null });
      q.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data: tabela === "channel_sessions" ? [] : [], error: null }).then(ok);
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, insercoes };
}

beforeEach(() => {
  audit.mockReset();
  publicar.mockReset();
  publicar.mockResolvedValue({ ok: true, version_id: "v1" });
});

describe("criarFluxo", () => {
  it("grava a organização do contexto e audita", async () => {
    const { db, insercoes } = banco(null);
    const r = await criarFluxo(db, { organizationId: ORG, nome: "Pós-teste", autor, requestId: "req" });
    expect(r.ok).toBe(true);
    expect(insercoes[0]).toMatchObject({ organization_id: ORG, name: "Pós-teste" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "followup_flow.created" }));
  });
});

describe("salvarFluxo", () => {
  it("fluxo de outra organização: not_found", async () => {
    const { db } = banco(null);
    const r = await salvarFluxo(db, { organizationId: ORG, pointerId: FLUXO, alteracoes: { name: "x" }, autor, requestId: "req" });
    expect(r).toMatchObject({ ok: false, codigo: "not_found", status: 404 });
  });
});

describe("publicarFluxo", () => {
  const entrada = { organizationId: ORG, pointerId: FLUXO, autor, requestId: "req" };

  it("sem rascunho, recusa com validation_failed e detalhes", async () => {
    const { db } = banco({ id: FLUXO, draft_graph: null, trigger_config: { kind: "manual" }, surface: "followup" });
    const r = await publicarFluxo(db, entrada);
    expect(r).toMatchObject({ ok: false, codigo: "validation_failed", status: 422 });
    expect(publicar).not.toHaveBeenCalled();
  });

  it("gatilho sem motor é recusado", async () => {
    const { db } = banco({ id: FLUXO, draft_graph: { nodes: [] }, trigger_config: { kind: "conversation_end" }, surface: "followup" });
    const r = await publicarFluxo(db, entrada);
    expect(r).toMatchObject({ ok: false, codigo: "trigger_kind_not_implemented" });
  });

  it("publica e, com aprovado_por, grava a auditoria do MCP", async () => {
    const { db } = banco({ id: FLUXO, draft_graph: { nodes: [] }, trigger_config: { kind: "manual" }, surface: "followup" });
    const r = await publicarFluxo(db, { ...entrada, aprovadoPor: "Régis" });
    expect(r.ok).toBe(true);
    const acoes = audit.mock.calls.map((c) => c[0].action);
    expect(acoes).toEqual(["followup_flow.published", "followup_flow.published_by_mcp"]);
    expect(audit.mock.calls[1]![0].metadata).toMatchObject({ aprovado_por: "Régis" });
  });

  it("sem aprovado_por (rota), só a auditoria de sempre", async () => {
    const { db } = banco({ id: FLUXO, draft_graph: { nodes: [] }, trigger_config: { kind: "manual" }, surface: "followup" });
    await publicarFluxo(db, entrada);
    expect(audit.mock.calls.map((c) => c[0].action)).toEqual(["followup_flow.published"]);
  });
});
