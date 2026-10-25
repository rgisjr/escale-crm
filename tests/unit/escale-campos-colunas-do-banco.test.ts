import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { excluirCampo, lerCatalogo } from "@/lib/escale/campos/banco";
import { OBJETOS_DE_CAMPO } from "@/lib/escale/campos/regras";

/**
 * As colunas que o catálogo pede a cada tabela existem nela, no baseline que o banco instala.
 * O catálogo do negócio (`crm_campos_do_negocio`, 9006) não tem `padrao`, que só o de contato e
 * empresa (`crm_campos_do_crm`, 9104) tem: pedir a coluna derrubava a aba Negócio com 42703.
 */
const ORG = "aaaaaaaa-0000-4000-8000-0000000000aa";
const BASELINE = readFileSync(join(process.cwd(), "supabase/baseline.sql"), "utf8");

function colunasDoBaseline(tabela: string): Set<string> {
  const colunas = new Set<string>();
  const criar = BASELINE.match(new RegExp(`create table if not exists public\\.${tabela} \\(([\\s\\S]*?)\\n\\);`));
  for (const linha of criar?.[1]?.split("\n") ?? []) {
    const nome = linha.match(/^\s+([a-z_]+)\s/)?.[1];
    if (nome && nome !== "constraint") colunas.add(nome);
  }
  for (const m of BASELINE.matchAll(new RegExp(`alter table public\\.${tabela} add column if not exists ([a-z_]+)`, "g"))) colunas.add(m[1]!);
  return colunas;
}

/** Banco falso que guarda, por tabela, as colunas de cada `select`. */
function bancoQueAnota() {
  const pedidas: Array<{ tabela: string; colunas: string[] }> = [];
  const cadeia = (resultado: unknown): Record<string, unknown> => {
    const c: Record<string, unknown> = {};
    for (const m of ["eq", "order", "limit"]) c[m] = () => c;
    c.maybeSingle = async () => resultado;
    c.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(resultado).then(ok, ko);
    return c;
  };
  const sb = {
    from: (tabela: string) => ({
      select: (colunas: string) => {
        pedidas.push({ tabela, colunas: colunas.split(",").map((s) => s.trim()) });
        const linha = { id: "c1", chave: "x", definicao: { type: "text", label: "X" }, posicao: 0 };
        return cadeia({ data: tabela === "crm_grupos_de_campos" ? [] : [linha], error: null });
      },
      delete: () => cadeia({ error: null }),
    }),
  };
  return { sb: sb as never, pedidas };
}

describe("catálogo de campos × colunas do banco", () => {
  it.each(OBJETOS_DE_CAMPO)("lerCatalogo(%s) só pede colunas que existem", async (objeto) => {
    const { sb, pedidas } = bancoQueAnota();
    await lerCatalogo(sb, ORG, objeto);
    for (const { tabela, colunas } of pedidas) {
      const existentes = colunasDoBaseline(tabela);
      expect(existentes.size, `tabela ${tabela} no baseline`).toBeGreaterThan(0);
      expect(colunas.filter((c) => !existentes.has(c)), `colunas pedidas a ${tabela}`).toEqual([]);
    }
  });

  it("excluir um campo do negócio lê só colunas que existem", async () => {
    const { sb, pedidas } = bancoQueAnota();
    await excluirCampo(sb, ORG, "negocio", "c1");
    const doNegocio = pedidas.filter((p) => p.tabela === "crm_campos_do_negocio");
    expect(doNegocio.length).toBeGreaterThan(0);
    const existentes = colunasDoBaseline("crm_campos_do_negocio");
    for (const { colunas } of doNegocio) expect(colunas.filter((c) => !existentes.has(c))).toEqual([]);
  });

  it("campo do negócio nunca é padrão", async () => {
    const { sb } = bancoQueAnota();
    const { campos } = await lerCatalogo(sb, ORG, "negocio");
    expect(campos[0]?.padrao).toBe(false);
  });
});
