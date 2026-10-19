import { z } from "zod";

import { VISOES_DE_CONTATOS } from "@/lib/escale/contatos/regras";
import { IDS_MAX } from "@/lib/escale/contatos/selecao";

/** AS AÇÕES EM MASSA DA LISTA DE CONTATOS (fork Escale, Fase 2B; migration 9103; Clint `bulk_params`). */
export const ACOES_EM_MASSA = [
  "criar_negocios",
  "incluir_tag",
  "remover_tag",
  "exportar",
  "excluir",
  "alterar_campo",
  "limpar_campo",
] as const;
export type AcaoEmMassa = (typeof ACOES_EM_MASSA)[number];
export const EVENTO_DA_ACAO_EM_MASSA = "contatos.acao_em_massa_requested";
export const BUCKET_DAS_EXPORTACOES = "exportacoes-das-listas";
export const CONTATOS_POR_ACAO_MAX = 100_000;

const uuid = z.string().uuid();
const tag = z.string().trim().min(1).max(40);
/** Fase 2C: a chave de um campo do catálogo do contato (nunca os links). */
const chaveDoCampo = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).refine((c) => !c.startsWith("link_"));

const alvoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("ids"), ids: z.array(uuid).min(1).max(IDS_MAX) }).strict(),
  z
    .object({
      tipo: z.literal("filtro"),
      q: z.string().max(200).optional(),
      v: z.enum(VISOES_DE_CONTATOS),
      f: z.string().max(16384).optional(),
      quantidade: z.number().int().min(1).max(CONTATOS_POR_ACAO_MAX).nullable(),
      excluidos: z.array(uuid).max(IDS_MAX),
    })
    .strict(),
]);

const base = { lista: z.literal("contatos"), alvo: alvoSchema };

export const pedidoDeAcaoSchema = z.discriminatedUnion("acao", [
  z
    .object({
      ...base,
      acao: z.literal("criar_negocios"),
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
  z
    .object({ ...base, acao: z.literal("incluir_tag"), parametros: z.object({ tag }).strict() })
    .strict(),
  z
    .object({ ...base, acao: z.literal("remover_tag"), parametros: z.object({ tag }).strict() })
    .strict(),
  z.object({ ...base, acao: z.literal("exportar"), parametros: z.object({}).strict() }).strict(),
  z.object({ ...base, acao: z.literal("excluir"), parametros: z.object({}).strict() }).strict(),
  z
    .object({
      ...base,
      acao: z.literal("alterar_campo"),
      parametros: z.object({ chave: chaveDoCampo, valor: z.unknown() }).strict(),
    })
    .strict(),
  z
    .object({ ...base, acao: z.literal("limpar_campo"), parametros: z.object({ chave: chaveDoCampo }).strict() })
    .strict(),
]);
export type PedidoDeAcao = z.infer<typeof pedidoDeAcaoSchema>;

/** Os status do banco (9103). Os de aprovação só existem na exportação (Q4). */
export type StatusDaAcao =
  | "preparando"
  | "aguardando_aprovacao"
  | "na_fila"
  | "processando"
  | "concluida"
  | "falhou"
  | "recusada";
/** O que a tela vê: o do banco, ou "expirada" (pedido de exportação que passou de 7 dias sem decisão). */
export type StatusVisivel = StatusDaAcao | "expirada";
/** O pedido de exportação vence em 7 dias (Q4), contados de `created_at`, sem cron. */
export const VALIDADE_DO_PEDIDO_MS = 7 * 24 * 60 * 60 * 1000;

export function statusVisivel(
  status: StatusDaAcao,
  criadaEm: string,
  agora: number,
): StatusVisivel {
  return status === "aguardando_aprovacao" &&
    agora - new Date(criadaEm).getTime() >= VALIDADE_DO_PEDIDO_MS
    ? "expirada"
    : status;
}

/** Um pedido de exportação de outra pessoa, para o admin decidir (Q4). */
export type PedidoParaAprovar = {
  id: string;
  solicitante_id: string;
  total: number;
  created_at: string;
};

export type ResumoDaAcao = {
  id: string;
  acao: AcaoEmMassa;
  status: StatusVisivel;
  total: number;
  feitos: number;
  falhas: number;
  tem_arquivo: boolean;
  created_at: string;
};

/** O `GET /api/v1/acoes-em-massa`: as minhas e, para o admin, os pedidos que esperam a decisão dele. */
export type AcoesDaPessoa = { minhas: ResumoDaAcao[]; para_aprovar: PedidoParaAprovar[] };
