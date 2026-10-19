import { vi } from "vitest";

type Linha = Record<string, unknown>;
export interface Escrita {
  tabela: string;
  op: "insert" | "update" | "upsert" | "delete";
  valores?: unknown;
  filtros: Array<[string, unknown]>;
}

/**
 * Um Supabase de mentira por tabela (fork Escale, testes da Fase 3): leitura
 * devolve as linhas de `tabelas[nome]`; escrita fica em `escritas` com os
 * filtros usados. `opcoes.erros[tabela]` faz a PRÓXIMA escrita nessa tabela
 * falhar com o código dado (ex.: `23505`, `42501`). `opcoes.rpc` responde as RPCs.
 */
export function bancoPorTabela(
  tabelas: Record<string, Linha[]>,
  opcoes: {
    erros?: Record<string, { code: string; message: string }>;
    rpc?: (nome: string, args: unknown) => unknown;
  } = {},
) {
  const escritas: Escrita[] = [];
  const erros = { ...(opcoes.erros ?? {}) };
  const from = vi.fn((tabela: string) => {
    const dados = tabelas[tabela] ?? [];
    const filtros: Array<[string, unknown]> = [];
    let pendente: Omit<Escrita, "tabela" | "filtros"> | null = null;
    const cadeia: Record<string, unknown> = {};
    for (const m of [
      "select",
      "order",
      "limit",
      "range",
      "not",
      "gt",
      "gte",
      "lte",
      "lt",
      "or",
      "ilike",
      "is",
    ])
      cadeia[m] = vi.fn(() => cadeia);
    for (const m of ["eq", "in", "neq"])
      cadeia[m] = vi.fn((col: string, val: unknown) => {
        filtros.push([`${m}:${col}`, val]);
        return cadeia;
      });
    cadeia.insert = vi.fn((valores: unknown) => {
      pendente = { op: "insert", valores };
      return cadeia;
    });
    cadeia.update = vi.fn((valores: unknown) => {
      pendente = { op: "update", valores };
      return cadeia;
    });
    cadeia.upsert = vi.fn((valores: unknown) => {
      pendente = { op: "upsert", valores };
      return cadeia;
    });
    cadeia.delete = vi.fn(() => {
      pendente = { op: "delete" };
      return cadeia;
    });
    const fechar = (): { code: string; message: string } | null => {
      if (!pendente) return null;
      escritas.push({ tabela, ...pendente, filtros: [...filtros] });
      pendente = null;
      const erro = erros[tabela] ?? null;
      delete erros[tabela];
      return erro;
    };
    const resposta = (unica: boolean) => {
      const erro = fechar();
      if (erro) return { data: null, error: erro, count: null };
      return { data: unica ? (dados[0] ?? null) : dados, error: null, count: dados.length };
    };
    cadeia.maybeSingle = vi.fn(async () => resposta(true));
    cadeia.single = vi.fn(async () => resposta(true));
    cadeia.then = (ok: (r: unknown) => unknown) => Promise.resolve(resposta(false)).then(ok);
    return cadeia;
  });
  const rpc = vi.fn(async (nome: string, args: unknown) =>
    opcoes.rpc ? opcoes.rpc(nome, args) : { data: [{ id: "x" }], error: null },
  );
  return { db: { from, rpc }, escritas };
}
