import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(__dirname, "..", "..", "app", "escale-tema.css"), "utf8");
const MARCA = "/* ─── FORK ESCALE · casca V3 (painel esquerdo de Negócios) ───";

/** As variáveis do primeiro bloco `seletor {` que aparece DEPOIS da marca da V3. */
function blocoDaV3(seletor: string): Record<string, string> {
  const inicio = CSS.indexOf(MARCA);
  if (inicio < 0) throw new Error("bloco da V3 não encontrado em app/escale-tema.css");
  const abre = CSS.indexOf(seletor + " {", inicio);
  if (abre < 0) throw new Error(`${seletor} não encontrado depois da marca da V3`);
  const corpo = CSS.slice(abre, CSS.indexOf("}", abre));
  return Object.fromEntries([...corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

describe("as cores do painel na casca (V3)", () => {
  it("o claro tem o cinza do hover, o Salvar verde-menta e o texto navy da Clint", () => {
    expect(blocoDaV3("body:has([data-escale-casca])")).toEqual({
      "--escale-painel-hover": "#f3f3f3",
      "--escale-salvar": "#35efb3",
      "--escale-salvar-texto": "#2f2c5d",
    });
  });

  it("o escuro redefine as mesmas três", () => {
    expect(Object.keys(blocoDaV3('[data-theme="dark"] body:has([data-escale-casca])')).sort()).toEqual([
      "--escale-painel-hover",
      "--escale-salvar",
      "--escale-salvar-texto",
    ]);
  });
});
