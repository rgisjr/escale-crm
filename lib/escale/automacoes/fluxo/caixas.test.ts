// @vitest-environment node
import { describe, expect, it } from "vitest";

import { msDoAtraso, saidasDaCaixa } from "@/lib/escale/automacoes/fluxo/caixas";

describe("msDoAtraso", () => {
  it("converte quantidade e unidade", () => {
    expect(msDoAtraso({ quantidade: 30, unidade: "segundos" })).toBe(30_000);
    expect(msDoAtraso({ quantidade: 3, unidade: "minutos" })).toBe(180_000);
    expect(msDoAtraso({ quantidade: 2, unidade: "horas" })).toBe(7_200_000);
    expect(msDoAtraso({ quantidade: 1, unidade: "dias" })).toBe(86_400_000);
  });
});

describe("saidasDaCaixa", () => {
  const pos = { x: 0, y: 0 };
  it("WhatsApp com botões e tempo de resposta: Próximo passo, um por botão e Não respondeu", () => {
    const caixa = {
      id: "w1", type: "acao" as const, position: pos,
      data: { kind: "acao" as const, acao: { type: "send_whatsapp_message", config: {
        passos: [{ tipo: "interativo", interativo: { tipo: "botoes", corpo: "?", botoes: [{ id: "a", titulo: "A" }, { id: "b", titulo: "B" }] } }],
        tempo_de_resposta: { quantidade: 15, unidade: "minutos" },
      } } },
    };
    expect(saidasDaCaixa(caixa)).toEqual(["proximo", "botao:a", "botao:b", "nao_respondeu"]);
  });
  it("Condições em grupos: um por grupo e 'nenhuma'", () => {
    const caixa = { id: "c1", type: "condicoes" as const, position: pos, data: { kind: "condicoes" as const, linhas: [], grupos: [
      { id: "g1", modo: "todas" as const, linhas: [] }, { id: "g2", modo: "todas" as const, linhas: [] },
    ] } };
    expect(saidasDaCaixa(caixa)).toEqual(["grupo:g1", "grupo:g2", "nenhuma"]);
  });
  it("Atraso e Ações: só Próximo passo", () => {
    const atraso = { id: "a1", type: "atraso" as const, position: pos, data: { kind: "atraso" as const, quantidade: 1, unidade: "minutos" as const, janela: null } };
    expect(saidasDaCaixa(atraso)).toEqual(["proximo"]);
  });
});
