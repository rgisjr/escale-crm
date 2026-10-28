import { describe, expect, it } from "vitest";

import {
  CORES_DO_PAINEL,
  COR_PADRAO,
  ICONES_DO_PAINEL,
  ICONE_PADRAO,
  NOMES_DOS_ICONES,
  corDoPainel,
  ehCorDoPainel,
  ehIconeDoPainel,
  iniciaisDoPainel,
} from "@/lib/escale/indicadores/paineis/aparencia";
import {
  ROTA_DA_LISTA_DE_PAINEIS,
  ROTA_DO_DESEMPENHO,
  ROTA_DO_EDITOR,
  rotaDoPainel,
} from "@/lib/escale/indicadores/rotas";

describe("aparência dos painéis (Fase 7B)", () => {
  it("tem as 22 cores do IconPicker da Clint, com a marca na 2ª posição", () => {
    expect(CORES_DO_PAINEL).toHaveLength(22);
    expect(CORES_DO_PAINEL[0]).toBe("#3D3A6C");
    expect(CORES_DO_PAINEL[1]).toBe("marca");
    expect(CORES_DO_PAINEL[21]).toBe("#E9F4FF");
    expect(COR_PADRAO).toBe("marca");
  });

  it("tem os 42 ícones na ordem da Clint, sem repetição", () => {
    expect(ICONES_DO_PAINEL).toHaveLength(42);
    expect(new Set(ICONES_DO_PAINEL).size).toBe(42);
    expect(ICONES_DO_PAINEL[0]).toBe("bookmark");
    expect(ICONES_DO_PAINEL[41]).toBe("alert-circle");
    expect(ICONES_DO_PAINEL[27]).toBe("briefcase");
    expect(ICONE_PADRAO).toBe("briefcase");
  });

  it("desenha a marca e as cores fora da paleta com a cor da organização", () => {
    expect(corDoPainel("marca")).toBe("var(--color-casca-marca)");
    expect(corDoPainel("#123456")).toBe("var(--color-casca-marca)");
    expect(corDoPainel("#FF4062")).toBe("#FF4062");
  });

  it("reconhece cor e ícone da paleta", () => {
    expect(ehCorDoPainel("#FF4062")).toBe(true);
    expect(ehCorDoPainel("#000000")).toBe(false);
    expect(ehIconeDoPainel("nenhum")).toBe(true);
    expect(ehIconeDoPainel("briefcase")).toBe(true);
    expect(ehIconeDoPainel("chart-bar")).toBe(false);
    expect(ehIconeDoPainel(3)).toBe(false);
  });

  it("tira as iniciais das duas primeiras palavras", () => {
    expect(iniciaisDoPainel("Visão geral")).toBe("VG");
    expect(iniciaisDoPainel("Gerência")).toBe("G");
    expect(iniciaisDoPainel("funil de vendas b2b")).toBe("FD");
    expect(iniciaisDoPainel("  ")).toBe("");
  });

  it("dá nome em português aos 42 ícones e ao sem ícone", () => {
    expect(Object.keys(NOMES_DOS_ICONES)).toHaveLength(43);
    expect(NOMES_DOS_ICONES.briefcase).toBe("Maleta");
    expect(NOMES_DOS_ICONES.nenhum).toBe("Sem ícone");
  });
});

describe("rotas de Indicadores", () => {
  it("monta as rotas da lista, do painel, do editor e do desempenho", () => {
    expect(ROTA_DA_LISTA_DE_PAINEIS).toBe("/app/metrics");
    expect(rotaDoPainel("p 1")).toBe("/app/metrics/p%201");
    expect(ROTA_DO_EDITOR).toBe("/app/metrics/explorar");
    expect(ROTA_DO_DESEMPENHO).toBe("/app/ai/desempenho");
  });
});
