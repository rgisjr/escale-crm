import { z } from "zod";

import { IDS_MAX, type Selecao } from "@/lib/escale/contatos/selecao";

import { textoDosFiltrosDeDestinatarios, type FiltrosDeDestinatarios } from "./filtros";

/**
 * O PEDIDO DAS AÇÕES EM MASSA DOS DETALHES (fork Escale, Fase 8C; N11). O alvo
 * é o da lista de contatos (2B): os marcados (até 1.000) ou o filtro menos os
 * desmarcados — nunca a lista inteira de ids.
 */
const uuid = z.string().uuid();
const tag = z.string().trim().min(1).max(40);

export const alvoDaCampanhaSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("ids"), ids: z.array(uuid).min(1).max(IDS_MAX) }).strict(),
  z
    .object({
      tipo: z.literal("filtro"),
      f: z.string().max(4096).optional(),
      excluidos: z.array(uuid).max(IDS_MAX),
    })
    .strict(),
]);
export type AlvoDaCampanha = z.infer<typeof alvoDaCampanhaSchema>;

export const pedidoDaCampanhaSchema = z.discriminatedUnion("acao", [
  z
    .object({
      acao: z.literal("incluir_tag"),
      alvo: alvoDaCampanhaSchema,
      parametros: z.object({ tag }).strict(),
    })
    .strict(),
  z
    .object({
      acao: z.literal("remover_tag"),
      alvo: alvoDaCampanhaSchema,
      parametros: z.object({ tag }).strict(),
    })
    .strict(),
  z
    .object({
      acao: z.literal("criar_negocios"),
      alvo: alvoDaCampanhaSchema,
      parametros: z
        .object({
          pipeline_id: uuid,
          stage_id: uuid,
          owner_user_id: uuid.nullable().optional(),
          valor_centavos: z.number().int().min(0).max(1e12).nullable().optional(),
        })
        .strict(),
    })
    .strict(),
  z.object({ acao: z.literal("nova_campanha"), alvo: alvoDaCampanhaSchema }).strict(),
  z.object({ acao: z.literal("tirar_da_lista"), alvo: alvoDaCampanhaSchema }).strict(),
]);
export type PedidoDaCampanha = z.infer<typeof pedidoDaCampanhaSchema>;

export type RespostaDaMassa =
  | { tipo: "acao_em_massa"; id: string; total: number; status: string }
  | { tipo: "campanha"; id: string }
  | { tipo: "lista"; tirados: number };

export function alvoDaSelecaoDaCampanha(
  selecao: Selecao,
  filtros: FiltrosDeDestinatarios,
): AlvoDaCampanha {
  if (selecao.tipo === "ids") return { tipo: "ids", ids: [...selecao.ids] };
  const f = textoDosFiltrosDeDestinatarios(filtros);
  return { tipo: "filtro", ...(f !== "{}" ? { f } : {}), excluidos: [...selecao.excluidos] };
}
