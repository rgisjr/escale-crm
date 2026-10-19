import { z } from "zod";

import { IDS_MAX, type Selecao } from "@/lib/escale/contatos/selecao";

import { enxugarFiltrosDoPainel, temCriterios, type FiltrosDoPainel } from "./filtros-da-fila";

/**
 * AS AÇÕES EM MASSA DA FILA (fork Escale, Fase 3D; B8; Clint `up`/`cp` de
 * `index-YQu0gzVE`): Alterar status, atendente, setor e a tag do contato. Até
 * `LIMITE_IMEDIATO` conversas a rota executa na hora; acima, o consumidor do
 * `event_log` faz em lotes (migration 9204).
 */
export const ACOES_DA_FILA = [
  "status",
  "atendente",
  "setor",
  "incluir_tag",
  "remover_tag",
] as const;
export type AcaoDaFila = (typeof ACOES_DA_FILA)[number];
/** A ordem da Clint (c27). */
export const STATUS_DA_ACAO = ["em_aberto", "fechado", "em_espera"] as const;
export type StatusDaAcao = (typeof STATUS_DA_ACAO)[number];
export const ROTULO_DO_STATUS_DA_ACAO: Readonly<Record<StatusDaAcao, string>> = {
  em_aberto: "Em aberto",
  fechado: "Fechado",
  em_espera: "Em espera",
};
export const LIMITE_IMEDIATO = 50;
export const CONVERSAS_POR_ACAO_MAX = 100_000;
export const EVENTO_DA_MASSA_DA_FILA = "conversas.acao_em_massa_requested";

const uuid = z.string().uuid();
const tag = z.string().trim().min(1).max(40);

export const alvoDaFilaSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("ids"), ids: z.array(uuid).min(1).max(IDS_MAX) }).strict(),
  z
    .object({
      tipo: z.literal("filtro"),
      f: z.string().max(16384).optional(),
      q: z.string().max(200).optional(),
      quantidade: z.number().int().min(1).max(CONVERSAS_POR_ACAO_MAX).nullable(),
      excluidos: z.array(uuid).max(IDS_MAX),
    })
    .strict(),
]);
export type AlvoDaFila = z.infer<typeof alvoDaFilaSchema>;

export const pedidoDaFilaSchema = z.discriminatedUnion("acao", [
  z
    .object({
      acao: z.literal("status"),
      alvo: alvoDaFilaSchema,
      parametros: z.object({ status: z.enum(STATUS_DA_ACAO) }).strict(),
    })
    .strict(),
  z
    .object({
      acao: z.literal("atendente"),
      alvo: alvoDaFilaSchema,
      parametros: z.object({ user_id: uuid.nullable() }).strict(),
    })
    .strict(),
  z
    .object({
      acao: z.literal("setor"),
      alvo: alvoDaFilaSchema,
      parametros: z.object({ setor_id: uuid }).strict(),
    })
    .strict(),
  z
    .object({
      acao: z.literal("incluir_tag"),
      alvo: alvoDaFilaSchema,
      parametros: z.object({ tag }).strict(),
    })
    .strict(),
  z
    .object({
      acao: z.literal("remover_tag"),
      alvo: alvoDaFilaSchema,
      parametros: z.object({ tag }).strict(),
    })
    .strict(),
]);
export type PedidoDaFila = z.infer<typeof pedidoDaFilaSchema>;

export type EstadoDaAcaoDaFila = "preparando" | "na_fila" | "processando" | "concluida" | "falhou";
export interface ResumoDaAcaoDaFila {
  id: string;
  acao: AcaoDaFila;
  status: EstadoDaAcaoDaFila;
  total: number;
  feitos: number;
  falhas: number;
}
export const acaoRodando = (s: EstadoDaAcaoDaFila): boolean =>
  s === "preparando" || s === "na_fila" || s === "processando";

/** A seleção vira o alvo: no modo "todos", vai o filtro (nunca a lista de ids). */
export function alvoDaSelecaoDaFila(
  s: Selecao,
  consulta: { painel: FiltrosDoPainel; busca?: string },
): AlvoDaFila {
  if (s.tipo === "ids") return { tipo: "ids", ids: [...s.ids] };
  const enxuto = enxugarFiltrosDoPainel(consulta.painel);
  const q = consulta.busca?.trim();
  return {
    tipo: "filtro",
    ...(temCriterios(enxuto) ? { f: JSON.stringify(enxuto) } : {}),
    ...(q ? { q } : {}),
    quantidade: s.quantidade,
    excluidos: [...s.excluidos],
  };
}

/** "1 conversa selecionada" / "{n} conversas selecionadas" (`label.tPluralSelectedConversation`), número brasileiro. */
export function textoDasSelecionadas(n: number, t: (texto: string) => string): string {
  return n === 1
    ? t("1 conversa selecionada")
    : t("{n} conversas selecionadas").replace("{n}", n.toLocaleString("pt-BR"));
}
