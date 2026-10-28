import { describe, expect, it } from "vitest";

import { Parametros, camposDoPainelSql, condicaoSql, tagsDoPainelSql } from "@/lib/escale/indicadores/motor/condicoes";
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

describe("tagsDoPainelSql", () => {
  it("usa a régua da lista de contatos (9102) com o filtro inteiro em jsonb", () => {
    const p = new Parametros("o", "f");
    const tags = { combinar: "ou" as const, grupos: [{ modo: "e" as const, condicoes: [{ op: "possui" as const, tag: "vip" }] }] };
    expect(tagsDoPainelSql("b.tags", tags, p)).toBe("public.fn_escale_tags_passam(b.tags, $3::jsonb)");
    expect(p.valores[2]).toBe(JSON.stringify(tags));
  });

  it("tag com aspa vai só no parâmetro", () => {
    const p = new Parametros("o", "f");
    const sql = tagsDoPainelSql("b.tags", { combinar: "e", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "a'b" }] }] }, p);
    expect(sql).not.toContain("a'b");
    expect(String(p.valores[2])).toContain("a'b");
  });
});

describe("camposDoPainelSql", () => {
  const cond = (alvo: "contato" | "negocio" | "empresa", chave: string, extra = {}) => ({
    alvo,
    chave,
    tipo: "texto" as const,
    op: "contem" as const,
    valor: "@x",
    padrao: "@x",
    ...extra,
  });
  const valorDe = (alvo: string, chave: string) =>
    alvo === "empresa" ? null : alvo === "contato" && chave === "email" ? "to_jsonb(c.email)" : `(c.custom_fields -> '${chave}')`;

  it("cada condição vira fn_escale_passa_condicao com a condição inteira em jsonb", () => {
    const p = new Parametros("o", "f");
    const r = camposDoPainelSql({ combinar: "e", grupos: [{ modo: "e", condicoes: [cond("contato", "email")] }] }, valorDe, p);
    expect(r).toEqual({ sql: "(public.fn_escale_passa_condicao(to_jsonb(c.email), $3::jsonb))", ignorado: false });
    expect(JSON.parse(String(p.valores[2]))).toMatchObject({ chave: "email", op: "contem" });
  });

  it("junta grupos com `combinar` e condições com o modo do grupo", () => {
    const p = new Parametros("o", "f");
    const grupos = [
      { modo: "ou" as const, condicoes: [cond("contato", "email"), cond("contato", "email")] },
      { modo: "e" as const, condicoes: [cond("contato", "email")] },
    ];
    const e = camposDoPainelSql({ combinar: "e", grupos }, valorDe, p).sql ?? "";
    expect(e).toMatch(/^\(\(.* or .*\) and \(.*\)\)$/);
    expect(camposDoPainelSql({ combinar: "ou", grupos }, valorDe, new Parametros("o", "f")).sql).toMatch(/\) or \(/);
  });

  it("ignora a condição de um objeto que o assunto não tem", () => {
    const p = new Parametros("o", "f");
    expect(camposDoPainelSql({ combinar: "e", grupos: [{ modo: "e", condicoes: [cond("empresa", "cidade")] }] }, valorDe, p)).toEqual({
      sql: null,
      ignorado: true,
    });
    expect(p.valores).toHaveLength(2);
  });
});
