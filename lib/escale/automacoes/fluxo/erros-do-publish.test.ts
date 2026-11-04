// @vitest-environment node
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/types";
import type { Desenho } from "@/lib/automation/desenho-da-regra";
import { compilar } from "@/lib/escale/automacoes/fluxo/compilar";
import { problemasAntesDoPublish, problemasDoPublish, problemasDoServidor, TEXTO_DA_RECUSA_DO_PUBLISH } from "@/lib/escale/automacoes/fluxo/erros-do-publish";

describe("problemasDoPublish", () => {
  it("leva o erro do nó para a caixa da tela (resposta da mensagem e ação agrupada)", () => {
    expect(
      problemasDoPublish([
        { node_id: "msg__resposta", code: "unreachable_node", message: "x" },
        { node_id: "acao-1__2", code: "max_steps_exceeded", message: "y" },
      ]),
    ).toEqual([
      { caixa: "msg", mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.unreachable_node },
      { caixa: "acao-1", mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.max_steps_exceeded },
    ]);
  });

  it("o nó de fim e o erro sem nó viram aviso geral", () => {
    expect(
      problemasDoPublish([
        { node_id: "fim", code: "no_end_path", message: "x" },
        { node_id: null, code: "no_trigger", message: "O fluxo precisa de exatamente um nó trigger." },
      ]),
    ).toEqual([
      { caixa: null, mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.no_end_path },
      { caixa: null, mensagem: "O fluxo precisa de exatamente um nó trigger." },
    ]);
  });

  it("código sem texto próprio usa a mensagem do validador; repetido não duplica", () => {
    const erro = { node_id: "move", code: "etapa_destino_ausente" as const, message: "Escolha a etapa de destino." };
    expect(problemasDoPublish([erro, erro])).toEqual([{ caixa: "move", mensagem: "Escolha a etapa de destino." }]);
  });
});

describe("problemasDoServidor", () => {
  it("lê a lista de erros do 422 do publish", () => {
    const err = new ApiError(422, "validation_failed", { errors: [{ node_id: "espera", code: "cycle_without_wait", message: "x" }] }, "req-1");
    expect(problemasDoServidor(err)).toEqual([{ caixa: "espera", mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.cycle_without_wait }]);
  });

  it("lê os problemas do compilador do servidor", () => {
    const err = new ApiError(422, "validation_failed", { problemas: [{ caixa: "acao-1__2", mensagem: "O atraso mínimo é de 30 segundos." }] }, "req-1");
    expect(problemasDoServidor(err)).toEqual([{ caixa: "acao-1", mensagem: "O atraso mínimo é de 30 segundos." }]);
  });

  it("devolve null para o que não é recusa com lista (o toast de sempre continua)", () => {
    expect(problemasDoServidor(new ApiError(409, "state_conflict", undefined, "req-1"))).toBeNull();
    expect(problemasDoServidor(new ApiError(422, "validation_failed", undefined, "req-1"))).toBeNull();
    expect(problemasDoServidor(new ApiError(422, "validation_failed", { errors: [{ lixo: 1 }] }, "req-1"))).toBeNull();
    expect(problemasDoServidor(new Error("rede"))).toBeNull();
  });
});

describe("problemasAntesDoPublish", () => {
  const p = { x: 0, y: 0 };
  const tela = { fonte: null, data: { pipeline_id: "", campo: "", dias: "7" }, tempo: { dias: "7", direcao: "da_equipe" as const, proteger_pela_agenda: false }, criado: { pipeline_id: "", stage_id: "" }, tags: [] };
  const desenho: Desenho = {
    caixas: [
      { id: "gatilho", type: "gatilho", position: p, data: { kind: "gatilho", evento: "message.received", tela } },
      { id: "espera", type: "atraso", position: p, data: { kind: "atraso", quantidade: 1, unidade: "minutos", janela: null } },
    ],
    ligacoes: [{ id: "l1", source: "gatilho", target: "espera" }],
  };

  function grafo() {
    const r = compilar({ nome: "x", desenho, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error(JSON.stringify(r));
    return r.grafo;
  }

  it("o desenho certo não tem problema", () => {
    expect(problemasAntesDoPublish(grafo())).toEqual([]);
  });

  it("um passo solto é marcado na caixa dele", () => {
    const g = grafo();
    const solto = { id: "solta", type: "wait", label: "Atraso", position: p, config: { mode: "fixed", duration_ms: 60_000, immune_to_reply: true } };
    expect(problemasAntesDoPublish({ ...g, nodes: [...g.nodes, solto] } as typeof g)).toEqual([
      { caixa: "solta", mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.unreachable_node },
    ]);
  });
});
