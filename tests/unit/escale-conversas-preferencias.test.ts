import { describe, expect, it } from "vitest";

import {
  PREFERENCIAS_PADRAO,
  gravacaoSchema,
  lerPreferencias,
} from "@/lib/escale/conversas/preferencias";
import { VISUALIZACAO_PADRAO } from "@/lib/escale/conversas/visualizacao";

describe("preferências de Conversas (9201)", () => {
  it("sem linhas vale o padrão; linha fora da forma vale o padrão daquela chave", () => {
    expect(lerPreferencias([])).toEqual(PREFERENCIAS_PADRAO);
    const lidas = lerPreferencias([
      { chave: "secoes", valor: { notas: false } },
      { chave: "campos_do_negocio", valor: ["status", "crm:sdr"] },
      { chave: "visualizacao", valor: { campos: "x" } },
    ]);
    expect(lidas.secoes.notas).toBe(false);
    expect(lidas.secoes.contato).toBe(true);
    expect(lidas.campos_do_negocio).toEqual(["status", "crm:sdr"]);
    expect(lidas.visualizacao).toEqual(VISUALIZACAO_PADRAO);
  });

  it("a gravação é validada pela chave", () => {
    expect(gravacaoSchema.safeParse({ chave: "secoes", valor: { notas: false } }).success).toBe(
      true,
    );
    expect(gravacaoSchema.safeParse({ chave: "secoes", valor: { inventada: false } }).success).toBe(
      false,
    );
    expect(
      gravacaoSchema.safeParse({
        chave: "visualizacao",
        valor: {
          ...VISUALIZACAO_PADRAO,
          campos: {
            ...VISUALIZACAO_PADRAO.campos,
            setor: true,
            tags: true,
            empresa: true,
            tempoSemResposta: true,
          },
        },
      }).success,
    ).toBe(false);
    expect(
      gravacaoSchema.safeParse({ chave: "campos_do_negocio", valor: ["status"] }).success,
    ).toBe(true);
    expect(gravacaoSchema.safeParse({ chave: "outra", valor: {} }).success).toBe(false);
  });
});
