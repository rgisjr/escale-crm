import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PERMISSOES_DE_CONVERSAS } from "@/lib/escale/conversas/permissoes";

/**
 * O papel padrão das chaves editáveis mora em dois lugares: o TS (a tela) e
 * fn_crm_papel_padrao (o banco, migration 9203). Este teste lê a migration e
 * exige os dois iguais — senão a tela mostraria ligado o que o banco nega.
 */
describe("espelho do papel padrão (TS × fn_crm_papel_padrao)", () => {
  it("cada chave editável tem o mesmo papel padrão nos dois", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    const arquivo = readdirSync(dir).find((f) => f.includes("_9203_"));
    expect(arquivo).toBeDefined();
    const sql = readFileSync(join(dir, arquivo!), "utf8");
    const corpo = sql.slice(
      sql.indexOf("fn_crm_papel_padrao(p_chave text)"),
      sql.indexOf("else 'admin'"),
    );
    const doBanco = new Map(
      [...corpo.matchAll(/when '([A-Z_]+)' then '([a-z]+)'/g)].map((m) => [m[1], m[2]]),
    );
    const editaveis = PERMISSOES_DE_CONVERSAS.filter((p) => p.modo === "editavel");
    expect(doBanco.size).toBe(editaveis.length);
    for (const p of editaveis)
      expect([p.chave, doBanco.get(p.chave)]).toEqual([p.chave, p.papelPadrao]);
  });
});
