import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as tipos from "@/lib/escale/capa/tipos";

/** FORK ESCALE · Fase 1F-a: os campos são do CRM; nenhum campo escolhido é "de outra origem". */
const RAIZ = join(__dirname, "..", "..");
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8");

describe("Personalizar cards com os campos do CRM", () => {
  it("não existe mais o campo 'de outra origem'", () => {
    expect("camposDeOutraOrigem" in tipos).toBe(false);
    const janela = ler("components/escale/capa/JanelaPersonalizarCards.tsx");
    expect(janela).not.toContain("de outra origem");
    expect(janela).not.toContain("sufixo");
    expect(ler("lib/i18n/dicionario.ts")).not.toContain('"de outra origem"');
  });

  it("o campo apagado do CRM continua sendo solto", () => {
    expect(typeof tipos.limparCamposSemOrigem).toBe("function");
    expect(ler("components/escale/capa/JanelaPersonalizarCards.tsx")).toContain(
      "limparCamposSemOrigem(",
    );
  });
});
