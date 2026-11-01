import { z } from "zod";

import type { AutomationRunStatus } from "@/hooks/webhooks/useAutomationRules";

import { desdeDoPeriodo } from "./regras";
import type { ReferenciaDeAcao, ResultadoDoPasso } from "./tipos";

export const POR_PAGINA_DAS_EXECUCOES = 10;

export const periodoSchema = z.enum(["7d", "30d", "90d", "tudo"]).default("30d");

const SITUACAO = "success|partial|failed|adiado";
const RESULTADO = "sucesso|erro|esperando";
const ACAO = "\\d{1,2}:[a-z_]{1,40}";
const lista = (item: string, max: number) => new RegExp(`^(${item})(,(${item})){0,${max - 1}}$`);

/** Query string da listagem e do CSV. As listas vêm separadas por vírgula; `passos` é `indice:tipo`. */
export const filtroDasExecucoesSchema = z
  .object({
    periodo: periodoSchema,
    situacoes: z.string().regex(lista(SITUACAO, 4)).optional(),
    passos: z.string().regex(lista(ACAO, 20)).optional(),
    resultados: z.string().regex(lista(RESULTADO, 3)).optional(),
    busca: z.string().max(80).optional(),
    pagina: z.coerce.number().int().min(1).max(10_000).default(1),
  })
  .strict();

export type FiltroDasExecucoesDaQuery = z.infer<typeof filtroDasExecucoesSchema>;

/** O que a RPC `fn_escale_execucoes_da_automacao` recebe (a rota monta; o banco lê). */
export interface PedidoDeExecucoes {
  desde: string | null;
  /** null = todas. Ignorado quando há `acoes`. */
  situacoes: AutomationRunStatus[] | null;
  acoes: ReferenciaDeAcao[] | null;
  resultados: ResultadoDoPasso[] | null;
  busca: string | null;
  limite: number;
  deslocamento: number;
}

const separar = (texto: string | undefined): string[] | null => (texto ? texto.split(",") : null);

export function pedidoDeExecucoes(
  f: FiltroDasExecucoesDaQuery,
  agora: Date,
  limite: number,
  deslocamento: number,
): PedidoDeExecucoes {
  const acoes = separar(f.passos)?.map((par) => {
    const [indice, tipo] = par.split(":");
    return { indice: Number(indice), tipo: tipo! };
  });
  return {
    desde: desdeDoPeriodo(f.periodo, agora),
    situacoes: separar(f.situacoes) as AutomationRunStatus[] | null,
    acoes: acoes ?? null,
    resultados: separar(f.resultados) as ResultadoDoPasso[] | null,
    busca: f.busca?.trim() ? f.busca.trim() : null,
    limite,
    deslocamento,
  };
}
