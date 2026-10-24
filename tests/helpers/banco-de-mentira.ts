/**
 * Um Supabase de mentira para os testes da 8B: cada `from(tabela)` vira uma
 * consulta encadeável que anota a operação, os filtros e os dados, e devolve as
 * linhas configuradas para a tabela; `rpc(nome)` devolve o configurado. Difere
 * do `bancoPorTabela` da Fase 3 (`tests/helpers/supabase-por-tabela.ts`) num
 * ponto que os testes da 8B precisam: a resposta pode depender da operação e
 * dos filtros (o insert devolve o id, o update devolve os marcados).
 */
export type Filtro = [string, string, unknown];
export interface Chamada {
  tabela: string;
  op: "select" | "insert" | "update" | "delete";
  dados?: unknown;
  filtros: Filtro[];
}
type Linhas = unknown[] | ((c: Chamada) => unknown[]);
type Resposta = { data: unknown; error: { message: string; code?: string } | null };

export function bancoDeMentira(
  config: {
    tabelas?: Record<string, Linhas>;
    rpc?: Record<string, (args: Record<string, unknown>) => Resposta>;
    erroNaTabela?: Record<string, string>;
  } = {},
) {
  const chamadas: Chamada[] = [];
  const rpcs: Array<{ nome: string; args: Record<string, unknown> }> = [];

  function from(tabela: string) {
    const c: Chamada = { tabela, op: "select", filtros: [] };
    const linhas = (): unknown[] => {
      const t = config.tabelas?.[tabela];
      return typeof t === "function" ? t(c) : (t ?? []);
    };
    const resposta = () => {
      if (!chamadas.includes(c)) chamadas.push(c);
      const erro = config.erroNaTabela?.[tabela];
      if (erro) return { data: null, error: { message: erro }, count: null };
      const l = linhas();
      return { data: l, error: null, count: l.length };
    };
    const q: Record<string, unknown> = {};
    const filtro = (nome: string) => (coluna: string, valor?: unknown) => {
      c.filtros.push([nome, coluna, valor]);
      return q;
    };
    for (const f of [
      "eq",
      "neq",
      "in",
      "is",
      "not",
      "gt",
      "gte",
      "lt",
      "lte",
      "or",
      "contains",
      "overlaps",
      "ilike",
    ]) {
      q[f] = filtro(f);
    }
    q.select = () => q;
    q.order = () => q;
    q.limit = () => q;
    q.range = () => q;
    q.insert = (dados: unknown) => {
      c.op = "insert";
      c.dados = dados;
      return q;
    };
    q.update = (dados: unknown) => {
      c.op = "update";
      c.dados = dados;
      return q;
    };
    q.delete = () => {
      c.op = "delete";
      return q;
    };
    const uma = () => {
      const r = resposta();
      return Promise.resolve({
        data: Array.isArray(r.data) ? (r.data[0] ?? null) : null,
        error: r.error,
      });
    };
    q.maybeSingle = uma;
    q.single = uma;
    q.then = (ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) =>
      Promise.resolve(resposta()).then(ok, erro);
    return q;
  }

  async function rpc(nome: string, args: Record<string, unknown>): Promise<Resposta> {
    rpcs.push({ nome, args });
    return config.rpc?.[nome]?.(args) ?? { data: null, error: null };
  }

  return { chamadas, rpcs, db: { from, rpc } };
}

/** As chamadas de uma tabela e operação, para o `expect`. */
export const chamadasDe = (chamadas: Chamada[], tabela: string, op: Chamada["op"]) =>
  chamadas.filter((c) => c.tabela === tabela && c.op === op);
