import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * FORK ESCALE · Frente V: as colunas que `lib/variaveis` lê existem no banco.
 *
 * O cliente dessas leituras é tipado como `any` (serve o service role e a
 * sessão), então um nome de coluna errado só aparecia em produção: foi o
 * `organizations.name` que a revisão achou (a tabela tem `display_name` e
 * `legal_name`). Esta cerca lê cada `.from("t").select("a, b")` dos arquivos e
 * confere contra o `Row` de `lib/database.types.ts`.
 */
const RAIZ = process.cwd();
const ARQUIVOS = ["lib/variaveis/fontes.ts", "lib/variaveis/fontes-da-conversa.ts"];
const TIPOS = readFileSync(join(RAIZ, "lib/database.types.ts"), "utf8");

function colunasDoRow(tabela: string): Set<string> | null {
  const inicio = TIPOS.indexOf(`\n      ${tabela}: {\n        Row: {`);
  if (inicio < 0) return null;
  const fim = TIPOS.indexOf("\n        }", inicio + 10);
  const bloco = TIPOS.slice(inicio, fim);
  return new Set([...bloco.matchAll(/^\s{10}(\w+)\??:/gm)].map((m) => m[1]!));
}

describe("as colunas lidas por lib/variaveis existem", () => {
  for (const arquivo of ARQUIVOS) {
    const fonte = readFileSync(join(RAIZ, arquivo), "utf8");
    const leituras = [...fonte.matchAll(/\.from\("(\w+)"\)\s*\.select\(\s*"([^"]+)"/g)];
    it(`${arquivo} lê alguma tabela`, () => expect(leituras.length).toBeGreaterThan(0));
    for (const [, tabela, colunas] of leituras) {
      it(`${arquivo}: ${tabela} (${colunas})`, () => {
        const existentes = colunasDoRow(tabela!);
        expect(existentes, `tabela ${tabela} fora de database.types.ts`).not.toBeNull();
        const faltam = colunas!
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c && !existentes!.has(c));
        expect(faltam).toEqual([]);
      });
    }
  }
});
