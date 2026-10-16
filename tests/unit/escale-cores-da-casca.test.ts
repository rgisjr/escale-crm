import { describe, expect, it } from "vitest";

import {
  COR_DO_ICONE_DA_VISUALIZACAO,
  CORES_DOS_ICONES_DA_CLINT,
  corDoIconeNaCasca,
} from "@/lib/escale/origens/cores-da-casca";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";

describe("as cores dos ícones de grupo na casca (V3)", () => {
  it("as 22 cores do IconPicker da Clint, na ordem do bundle", () => {
    expect(CORES_DOS_ICONES_DA_CLINT).toHaveLength(22);
    expect(CORES_DOS_ICONES_DA_CLINT[0]).toBe("#3D3A6C");
    expect(CORES_DOS_ICONES_DA_CLINT[21]).toBe("#E9F4FF");
  });

  it("todo tom da paleta vira uma cor da Clint, e tons diferentes não viram a mesma cor", () => {
    // `#5A5A5A` não está no IconPicker: é a cor do grupo "SAO" medida em 01-010.
    const daClint = [...CORES_DOS_ICONES_DA_CLINT, "#5A5A5A"];
    const traduzidas = PALETA_DE_ETIQUETAS.map(corDoIconeNaCasca);
    for (const [i, cor] of traduzidas.entries()) {
      expect(cor, `o tom ${PALETA_DE_ETIQUETAS[i]} ficou sem tradução`).not.toBe(PALETA_DE_ETIQUETAS[i]);
      expect(daClint).toContain(cor);
    }
    expect(new Set(traduzidas).size).toBe(PALETA_DE_ETIQUETAS.length);
  });

  it("aceita o tom em maiúsculas e devolve o próprio valor quando não conhece o tom", () => {
    expect(corDoIconeNaCasca("#FFE629")).toBe("#FFE073");
    expect(corDoIconeNaCasca("#123456")).toBe("#123456");
  });

  it("o quadradinho das visualizações é o cinza-escuro de 01-014", () => {
    expect(COR_DO_ICONE_DA_VISUALIZACAO).toBe("#4A4A4A");
  });
});
