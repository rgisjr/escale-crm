import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { REENQUADRAR_O_FLUXO, ZOOM_DO_FLUXO } from "@/components/escale/automacoes/fluxo/zoom";

const raiz = join(__dirname, "..", "..");
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

const CANVAS = [
  "components/escale/automacoes/fluxo/CanvasDoFluxo.tsx",
  "components/escale/automacoes/fluxo/insights/CanvasDosInsights.tsx",
];

describe("zoom do fluxo igual ao da Clint (07-013, 07-026)", () => {
  it("usa os limites da Clint: 0,25 a 1,15", () => {
    expect(ZOOM_DO_FLUXO).toEqual({ minZoom: 0.25, maxZoom: 1.15 });
  });

  it("reenquadra como o botão da Clint, sem padding próprio", () => {
    expect(REENQUADRAR_O_FLUXO).toEqual({ duration: 500 });
  });

  it.each(CANVAS)("%s enquadra com o padrão do React Flow, sem fitViewOptions", (arquivo) => {
    const codigo = ler(arquivo);
    expect(codigo).toContain("{...ZOOM_DO_FLUXO}");
    expect(codigo).not.toMatch(/fitViewOptions/);
    expect(codigo).not.toMatch(/minZoom=|maxZoom=/);
  });

  it("o botão Reorganizar usa o mesmo enquadramento", () => {
    const codigo = ler("components/escale/automacoes/fluxo/TelaDoFluxo.tsx");
    expect(codigo).toContain("fitView(REENQUADRAR_O_FLUXO)");
    expect(codigo).not.toMatch(/padding:\s*0\.2/);
  });
});
