import { describe, expect, it } from "vitest";

import { quantidadeDigitada, selecaoDaEtapa } from "@/lib/escale/quadro/selecao";

const ETAPA = ["a", "b", "c", "d"];

describe("selecaoDaEtapa (o 'Selecione N' da Clint)", () => {
  it("marca os N primeiros na ordem da tela e não mexe nas outras etapas", () => {
    expect([...selecaoDaEtapa(ETAPA, new Set(["x"]), 2)].sort()).toEqual(["a", "b", "x"]);
  });

  it("um N novo troca a seleção da etapa, não soma", () => {
    expect([...selecaoDaEtapa(ETAPA, new Set(["a", "b", "c"]), 1)]).toEqual(["a"]);
  });

  it("N maior que a etapa marca a etapa toda; 0 ou negativo desmarca a etapa", () => {
    expect(selecaoDaEtapa(ETAPA, new Set(), 99).size).toBe(4);
    expect([...selecaoDaEtapa(ETAPA, new Set(["a", "x"]), 0)]).toEqual(["x"]);
    expect([...selecaoDaEtapa(ETAPA, new Set(["a"]), -3)]).toEqual([]);
  });
  it("N decimal marca o inteiro de baixo; NaN desmarca a etapa", () => {
    expect([...selecaoDaEtapa(ETAPA, new Set(), 2.9)]).toEqual(["a", "b"]);
    expect([...selecaoDaEtapa(ETAPA, new Set(["a", "x"]), Number.NaN)]).toEqual(["x"]);
  });
});

describe("quantidadeDigitada (o texto do campo vira um inteiro dentro da etapa)", () => {
  it("inteiro válido passa; decimal vira o inteiro de baixo", () => {
    expect(quantidadeDigitada("3", 7)).toBe(3);
    expect(quantidadeDigitada("2.5", 7)).toBe(2);
  });

  it("vazio, inválido e negativo viram 0", () => {
    expect(quantidadeDigitada("", 7)).toBe(0);
    expect(quantidadeDigitada("abc", 7)).toBe(0);
    expect(quantidadeDigitada("-3", 7)).toBe(0);
  });

  it("acima do total limita ao total, inclusive notação científica", () => {
    expect(quantidadeDigitada("99", 7)).toBe(7);
    expect(quantidadeDigitada("1e9", 7)).toBe(7);
    expect(quantidadeDigitada("5", 0)).toBe(0);
  });
});
