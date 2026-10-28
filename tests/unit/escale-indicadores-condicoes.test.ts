import { describe, expect, it } from "vitest";

import { Parametros, condicaoSql, tagsSql } from "@/lib/escale/indicadores/motor/condicoes";
import type { Condicao } from "@/lib/escale/indicadores/pergunta";

const rodar = (expr: string, tipo: Parameters<typeof condicaoSql>[1], c: Condicao) => {
  const p = new Parametros("org", "fuso");
  return { sql: condicaoSql(expr, tipo, c, p), values: p.valores.slice(2) };
};

describe("condicaoSql", () => {
  it("texto", () => {
    expect(rodar("x", "texto", { campo: "a.b", op: "igual_a", valor: "v" })).toEqual({ sql: "x = $3", values: ["v"] });
    expect(rodar("x", "texto", { campo: "a.b", op: "igual_a", valor: ["v", "w"] })).toEqual({ sql: "x = any($3::text[])", values: [["v", "w"]] });
    expect(rodar("x", "texto", { campo: "a.b", op: "diferente_de", valor: "v" }).sql).toBe("(x is null or x <> all($3::text[]))");
    expect(rodar("x", "texto", { campo: "a.b", op: "comeca_com", valor: "ab" })).toEqual({ sql: "x ilike $3 escape '\\'", values: ["ab%"] });
    expect(rodar("x", "texto", { campo: "a.b", op: "termina_com", valor: "ab" }).values).toEqual(["%ab"]);
    expect(rodar("x", "texto", { campo: "a.b", op: "nao_contem", valor: "ab" }).sql).toBe("(x is null or not (x ilike $3 escape '\\'))");
    expect(rodar("x", "texto", { campo: "a.b", op: "vazio" }).sql).toBe("(x is null or x::text = '')");
    expect(rodar("x", "texto", { campo: "a.b", op: "nao_vazio" }).sql).toBe("(x is not null and x::text <> '')");
  });

  it("escapa %, _ e \ no contém", () => {
    expect(rodar("x", "texto", { campo: "a.b", op: "contem", valor: "50%_\\" }).values).toEqual(["%50\\%\\_\\\\%"]);
  });

  it("número", () => {
    expect(rodar("x", "numero", { campo: "a.b", op: "igual_a", valor: 5 })).toEqual({ sql: "x = $3::numeric", values: ["5"] });
    expect(rodar("x", "numero", { campo: "a.b", op: "maior_que", valor: 5 }).sql).toBe("x > $3::numeric");
    expect(rodar("x", "numero", { campo: "a.b", op: "menor_ou_igual_a", valor: 5 }).sql).toBe("x <= $3::numeric");
    expect(rodar("x", "numero", { campo: "a.b", op: "diferente_de", valor: 5 }).sql).toBe("(x is null or x <> $3::numeric)");
    expect(rodar("x", "numero", { campo: "a.b", op: "vazio" }).sql).toBe("x is null");
  });

  it("data", () => {
    expect(rodar("x", "data", { campo: "a.b", op: "igual_a", valor: "2026-01-01" }).sql).toBe("x::date = $3::date");
    expect(rodar("x", "data", { campo: "a.b", op: "maior_ou_igual_a", valor: "2026-01-01" }).sql).toBe("x::date >= $3::date");
    expect(rodar("x", "data", { campo: "a.b", op: "diferente_de", valor: "2026-01-01" }).sql).toBe("(x is null or x::date <> $3::date)");
  });

  it("booleano", () => {
    expect(rodar("x", "booleano", { campo: "a.b", op: "igual_a", valor: true })).toEqual({ sql: "x = $3::boolean", values: ["true"] });
    expect(rodar("x", "booleano", { campo: "a.b", op: "diferente_de", valor: true }).sql).toBe("coalesce(x, false) <> $3::boolean");
  });

  it("recusa operador que não serve ao tipo", () => {
    expect(() => rodar("x", "booleano", { campo: "a.b", op: "contem", valor: "a" })).toThrow();
    expect(() => rodar("x", "numero", { campo: "a.b", op: "contem", valor: "a" })).toThrow();
  });
});

describe("tagsSql", () => {
  const rodarTags = (t: Parameters<typeof tagsSql>[1]) => {
    const p = new Parametros("o", "f");
    return { sql: tagsSql("b.tags", t, p), values: p.valores.slice(2) };
  };
  it("cobre as quatro formas", () => {
    expect(rodarTags({ modo: "qualquer_tag", valores: [], operador: "ou" }).sql).toBe("coalesce(cardinality(b.tags), 0) > 0");
    expect(rodarTags({ modo: "sem_tag", valores: [], operador: "ou" }).sql).toBe("coalesce(cardinality(b.tags), 0) = 0");
    expect(rodarTags({ modo: "lista", valores: ["a"], operador: "ou" })).toEqual({ sql: "b.tags && $3::text[]", values: [["a"]] });
    expect(rodarTags({ modo: "lista", valores: ["a"], operador: "e" }).sql).toBe("b.tags @> $3::text[]");
    expect(rodarTags({ modo: "lista", valores: [], operador: "e" }).sql).toBeNull();
  });
});
