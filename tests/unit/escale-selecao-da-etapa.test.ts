import { describe, expect, it } from "vitest";

import { selecaoDaEtapa } from "@/lib/escale/quadro/selecao";

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
});
