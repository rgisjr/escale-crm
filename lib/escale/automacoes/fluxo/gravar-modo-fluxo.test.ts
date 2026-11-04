// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { falhaDeEscrita } from "@/lib/api/resultado-de-escrita";
import {
  gravarAutomacaoEmModoFluxo,
  type DepsDaGravacao,
  type EntradaDaGravacao,
} from "@/lib/escale/automacoes/fluxo/gravar-modo-fluxo";
import type { FlowGraph } from "@/lib/followup/graph-schema";

const ORG = "11111111-1111-4111-8111-111111111111";
const PONTEIRO = "22222222-2222-4222-8222-222222222222";
const REGRA = "33333333-3333-4333-8333-333333333333";

const grafo = { nodes: [], edges: [] } as unknown as FlowGraph;
const regra = { name: "A", trigger_event: "message.received", conditions: [], trigger_config: {} };
const entrada = (ruleId: string | null): EntradaDaGravacao => ({
  organizationId: ORG,
  ruleId,
  regra,
  grafo,
  actor: { type: "user", id: "u1", role: "manager" },
  aprovadoPor: "Régis",
  requestId: "r1",
});

/** Um cliente mínimo: `from(tabela).select().eq()...maybeSingle()` devolve o que a tabela tem. */
function dbCom(tabelas: Record<string, unknown>): SupabaseClient {
  const consulta = (linha: unknown) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "delete"]) q[m] = () => q;
    q.maybeSingle = async () => ({ data: linha, error: null });
    return q;
  };
  return { from: (t: string) => consulta(tabelas[t] ?? null) } as unknown as SupabaseClient;
}

function deps(sobrescrever: Partial<DepsDaGravacao> = {}): DepsDaGravacao {
  return {
    criarFluxo: vi.fn(async () => ({ ok: true as const, dado: { id: PONTEIRO } })),
    salvarFluxo: vi.fn(async () => ({ ok: true as const, dado: { id: PONTEIRO } })),
    publicarFluxo: vi.fn(async () => ({ ok: true as const, dado: { versionId: "v1", pointer: {} } })),
    atualizarRegra: vi.fn(async () => ({ ok: true as const, dado: { id: REGRA } })),
    criarRegra: vi.fn(async () => ({ ok: true as const, dado: { id: REGRA } })),
    descartarFluxo: vi.fn(async () => undefined),
    ...sobrescrever,
  } as DepsDaGravacao;
}

const regraDoFluxo = { id: REGRA, actions: [{ type: "start_message_flow", config: { flow_pointer_id: PONTEIRO } }] };

describe("gravarAutomacaoEmModoFluxo", () => {
  it("primeira gravação: cria o ponteiro, salva, publica e grava a regra com start_message_flow", async () => {
    const d = deps();
    const db = dbCom({ automation_rules: { id: REGRA, actions: [] } });
    const r = await gravarAutomacaoEmModoFluxo(db, db, entrada(REGRA), d);
    expect(r).toEqual({ ok: true, dado: { ruleId: REGRA, pointerId: PONTEIRO, atualizadoEm: null } });
    expect(d.criarFluxo).toHaveBeenCalledOnce();
    expect(vi.mocked(d.criarFluxo).mock.calls[0]![1]).toMatchObject({ surface: "crm_automation" });
    expect(d.salvarFluxo).toHaveBeenCalledOnce();
    expect(d.publicarFluxo).toHaveBeenCalledOnce();
    expect(vi.mocked(d.atualizarRegra).mock.calls[0]![1].patch).toMatchObject({
      actions: [{ type: "start_message_flow", config: { flow_pointer_id: PONTEIRO } }],
    });
  });

  it("segunda gravação reusa o ponteiro (não chama criarFluxo)", async () => {
    const d = deps();
    const db = dbCom({ automation_rules: regraDoFluxo, followup_flow_pointers: { id: PONTEIRO } });
    const r = await gravarAutomacaoEmModoFluxo(db, db, entrada(REGRA), d);
    expect(r.ok).toBe(true);
    expect(d.criarFluxo).not.toHaveBeenCalled();
    expect(vi.mocked(d.salvarFluxo).mock.calls[0]![1].pointerId).toBe(PONTEIRO);
  });

  it("publicação recusada devolve os problemas e não toca na regra", async () => {
    const recusa = falhaDeEscrita("validation_failed", "Fluxo reprovado na validação de publish.", 422, { errors: [{ code: "x" }] });
    const d = deps({ publicarFluxo: vi.fn(async () => recusa) });
    const db = dbCom({ automation_rules: regraDoFluxo, followup_flow_pointers: { id: PONTEIRO } });
    const r = await gravarAutomacaoEmModoFluxo(db, db, entrada(REGRA), d);
    expect(r).toEqual(recusa);
    expect(d.atualizarRegra).not.toHaveBeenCalled();
    expect(d.descartarFluxo).not.toHaveBeenCalled();
  });

  it("automação nova: cria o ponteiro, publica e cria a regra; recusa na publicação descarta o ponteiro", async () => {
    const d = deps();
    const db = dbCom({});
    const r = await gravarAutomacaoEmModoFluxo(db, db, entrada(null), d);
    expect(r).toEqual({ ok: true, dado: { ruleId: REGRA, pointerId: PONTEIRO, atualizadoEm: null } });
    expect(vi.mocked(d.criarRegra).mock.calls[0]![1].dados.actions).toEqual([
      { type: "start_message_flow", config: { flow_pointer_id: PONTEIRO } },
    ]);

    const recusa = falhaDeEscrita("validation_failed", "x", 422);
    const d2 = deps({ publicarFluxo: vi.fn(async () => recusa) });
    await gravarAutomacaoEmModoFluxo(db, db, entrada(null), d2);
    expect(d2.descartarFluxo).toHaveBeenCalledWith(db, ORG, PONTEIRO);
    expect(d2.criarRegra).not.toHaveBeenCalled();
  });

  it("regra que não existe: 404, sem criar nada", async () => {
    const d = deps();
    const db = dbCom({});
    const r = await gravarAutomacaoEmModoFluxo(db, db, entrada(REGRA), d);
    expect(r).toMatchObject({ ok: false, status: 404 });
    expect(d.criarFluxo).not.toHaveBeenCalled();
  });
});

describe("conflito de versão", () => {
  it("versão velha recusa ANTES de criar, salvar ou publicar o fluxo", async () => {
    const d = deps();
    const db = dbCom({ automation_rules: { ...regraDoFluxo, updated_at: "2026-11-04T10:00:00Z" }, followup_flow_pointers: { id: PONTEIRO } });
    const r = await gravarAutomacaoEmModoFluxo(db, db, { ...entrada(REGRA), versaoDaRegra: "2026-11-04T09:00:00Z" }, d);
    expect(r).toMatchObject({ ok: false, status: 409, codigo: "state_conflict" });
    expect(d.salvarFluxo).not.toHaveBeenCalled();
    expect(d.publicarFluxo).not.toHaveBeenCalled();
  });
});
