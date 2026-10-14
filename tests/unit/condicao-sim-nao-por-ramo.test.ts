/**
 * Condição "Sim/Não" (`branching` ausente ou `combined`) ligada por RAMO.
 *
 * O grafo v2 deixa a aresta citar a saída pelo id estável do ramo
 * (`{ type: 'branch', branch_id: 'true' | 'false' }`), e as duas portas que
 * leem o grafo antes do motor aceitam essa grafia para a condição Sim/Não:
 * `branchIdForCondition` (tela) e `validateFlowForPublish` (publicação). Só o
 * motor procurava a grafia v1 (`cond_result`): o fluxo publicava, aparecia
 * "Ativo" e cada inscrição parava no nó com
 * `condition node "x" has no matching edge for result true` até esgotar as
 * tentativas (medido numa instalação real em 13/10/2026).
 *
 * A regra: a condição Sim/Não sai pela aresta do ramo quando ela existe, e pela
 * grafia v1 quando não — as duas grafias que a publicação aceita, o motor roda.
 */
import { describe, expect, it } from "vitest";

import { processNode, type EnrollmentRow, type LeadFacts } from "@/lib/followup/node-handlers";
import { flowGraphSchema } from "@/lib/followup/graph-schema";
import { validateFlowForPublish } from "@/lib/followup/validate-publish";

const ETAPA_CERTA = "11111111-1111-4111-8111-111111111111";

function grafo(saidas: "ramo" | "v1") {
  const sim = saidas === "ramo" ? { type: "branch", branch_id: "true" } : { type: "cond_result", value: true };
  const nao = saidas === "ramo" ? { type: "branch", branch_id: "false" } : { type: "cond_result", value: false };
  return flowGraphSchema.parse({
    nodes: [
      { id: "gatilho", type: "trigger", label: "Silêncio", position: { x: 0, y: 0 }, config: {} },
      {
        id: "etapa",
        type: "condition",
        label: "Na etapa certa?",
        position: { x: 0, y: 100 },
        config: { combinator: "or", checks: [{ field: "lead_stage", op: "eq", value: ETAPA_CERTA }] },
      },
      { id: "sim", type: "end", label: "Sim", position: { x: 0, y: 200 }, config: { outcome: "converted" } },
      { id: "nao", type: "end", label: "Não", position: { x: 200, y: 200 }, config: { outcome: "custom" } },
    ],
    edges: [
      { id: "e1", source: "gatilho", target: "etapa", priority: 0, condition: { type: "always" } },
      { id: "e2", source: "etapa", target: "sim", priority: 0, condition: sim },
      { id: "e3", source: "etapa", target: "nao", priority: 1, condition: nao },
    ],
  });
}

const enrollment = { id: "e1", current_node_id: "etapa", steps_taken: 1 } as unknown as EnrollmentRow;

function lead(stage: string): LeadFacts {
  return { lead_stage: stage, tags: [], contact_name: "Cliente", custom_fields: {} } as LeadFacts;
}

function rodaCondicao(saidas: "ramo" | "v1", stage: string) {
  const g = grafo(saidas);
  const node = g.nodes.find((n) => n.id === "etapa")!;
  return processNode({ node, edges: g.edges, enrollment, lead: lead(stage), clock: () => new Date() });
}

describe("condição Sim/Não ligada por ramo", () => {
  it("a publicação aceita as saídas por ramo (é o que deixou o fluxo travado ir ao ar)", () => {
    expect(validateFlowForPublish(grafo("ramo")).ok).toBe(true);
  });

  it("sai pelo ramo 'true' quando a regra passa", () => {
    expect(rodaCondicao("ramo", ETAPA_CERTA)).toMatchObject({ kind: "advance", next_node_id: "sim" });
  });

  it("sai pelo ramo 'false' quando a regra não passa", () => {
    expect(rodaCondicao("ramo", "outra-etapa")).toMatchObject({ kind: "advance", next_node_id: "nao" });
  });

  it("controle: a grafia v1 (cond_result) continua roteando igual", () => {
    expect(rodaCondicao("v1", ETAPA_CERTA)).toMatchObject({ kind: "advance", next_node_id: "sim" });
    expect(rodaCondicao("v1", "outra-etapa")).toMatchObject({ kind: "advance", next_node_id: "nao" });
  });
});
