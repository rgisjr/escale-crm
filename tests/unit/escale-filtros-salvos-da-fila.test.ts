import { describe, expect, it } from "vitest";

import {
  enxugarCriterios,
  filtrosDasLinhas,
  novoFiltroSchema,
} from "@/lib/escale/listas/filtros-salvos";

describe("filtros salvos por lista (N11)", () => {
  it("a lista 'conversas' valida pelo painel da fila e enxuga como ele", () => {
    const novo = novoFiltroSchema.parse({
      lista: "conversas",
      nome: "Em espera e suspensas",
      compartilhado: false,
      criterios: { conversas: { status: ["em_espera"], marcas: ["suspensas"], atendentes: [] } },
    });
    expect(enxugarCriterios(novo)).toEqual({
      conversas: { marcas: ["suspensas"], status: ["em_espera"] },
    });
    expect(
      novoFiltroSchema.safeParse({
        lista: "conversas",
        nome: "x",
        compartilhado: false,
        criterios: { telefone: "com" },
      }).success,
    ).toBe(false);
    expect(
      novoFiltroSchema.safeParse({
        lista: "contatos",
        nome: "x",
        compartilhado: false,
        criterios: { telefone: "com" },
      }).success,
    ).toBe(true);
  });

  it("as linhas leem os critérios pela lista; o que não vale vira vazio", () => {
    const linhas = [
      {
        id: "1",
        user_id: "u",
        nome: "A",
        compartilhado: false,
        criterios: { canais: ["c0000000-0000-4000-8000-000000000001"] },
      },
      { id: "2", user_id: "outro", nome: "B", compartilhado: true, criterios: { telefone: "com" } },
    ];
    const lidos = filtrosDasLinhas(linhas, "u", "conversas");
    expect(lidos[0]).toMatchObject({
      meu: true,
      criterios: { canais: ["c0000000-0000-4000-8000-000000000001"] },
    });
    expect(lidos[1]).toMatchObject({ meu: false, criterios: {} });
    expect(filtrosDasLinhas(linhas, "u")[1]!.criterios).toEqual({ telefone: "com" });
  });
});
