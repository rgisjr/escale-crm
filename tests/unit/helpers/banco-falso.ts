import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Um Supabase falso para os testes da caixa de comentários (Fase 10A): cada consulta vira uma
 * `Chamada` registrada e o `responder` devolve o que a tabela "tem". A cadeia é a do PostgREST
 * (select/insert/update/eq/in/is/not/lt/gte/order/limit/single/maybeSingle) e é aguardável.
 */
export interface Chamada {
  tabela: string;
  operacao: "select" | "insert" | "update" | "delete";
  valores?: Record<string, unknown>;
  filtros: Array<[string, string, unknown]>;
}
export type Resposta = { data: unknown; error: { code?: string; message: string } | null };

export function bancoFalso(responder: (c: Chamada) => Resposta | undefined) {
  const chamadas: Chamada[] = [];
  const rpcs: Array<{ nome: string; args: unknown }> = [];
  const admin = {
    rpc: async (nome: string, args: unknown) => {
      rpcs.push({ nome, args });
      return { data: "conv-1", error: null };
    },
    from: (tabela: string) => {
      const chamada: Chamada = { tabela, operacao: "select", filtros: [] };
      const resolver = (): Resposta => responder(chamada) ?? { data: [], error: null };
      const cadeia: Record<string, unknown> = {};
      const registrar = (operacao: Chamada["operacao"]) => (valores?: Record<string, unknown>) => {
        chamada.operacao = operacao;
        chamada.valores = valores;
        if (!chamadas.includes(chamada)) chamadas.push(chamada);
        return cadeia;
      };
      cadeia.select = () => {
        if (!chamadas.includes(chamada)) chamadas.push(chamada);
        return cadeia;
      };
      cadeia.insert = registrar("insert");
      cadeia.update = registrar("update");
      cadeia.delete = registrar("delete");
      for (const op of ["eq", "in", "is", "not", "lt", "gte", "neq"]) {
        cadeia[op] = (coluna: string, a: unknown, b?: unknown) => {
          chamada.filtros.push([op, coluna, op === "is" || op === "not" ? (b ?? a) : a]);
          return cadeia;
        };
      }
      for (const op of ["order", "limit"]) cadeia[op] = () => cadeia;
      cadeia.single = async () => {
        const r = resolver();
        return Array.isArray(r.data) ? { data: r.data[0] ?? null, error: r.error } : r;
      };
      cadeia.maybeSingle = cadeia.single;
      cadeia.then = (ok: (r: unknown) => unknown, ko?: (e: unknown) => unknown) =>
        Promise.resolve(resolver()).then(ok, ko);
      return cadeia;
    },
  } as unknown as SupabaseClient;
  return { admin, chamadas, rpcs };
}
