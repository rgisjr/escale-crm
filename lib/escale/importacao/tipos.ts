/** O pedido, a resolução e o que a tela lê das importações (fork Escale, Fase 2F). */
import { z } from "zod";

import { COLUNAS_MAX, type StatusDoNegocio } from "./linhas";
import { ACOES, MOTIVOS, NIVEIS, TIPOS_DE_IMPORTACAO, type ColunaMapeada, type Motivo, type TipoDeImportacao } from "./regras";
import type { StatusDaImportacao, StatusDaLinha } from "./textos";
import type { Detalhe, Resolucoes } from "./classificar";

export const PAGINA_DA_LISTA = 20;
const uuid = z.string().uuid();

export const configuracaoSchema = z
  .object({
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    origemId: uuid.nullable().default(null),
    etapaId: uuid.nullable().default(null),
    status: z.enum(["open", "won", "lost"]).default("open"),
    motivoDePerda: z.string().trim().min(1).max(500).nullable().default(null),
  })
  .strict();
export type Configuracao = z.infer<typeof configuracaoSchema> & { status: StatusDoNegocio };

export const pedidoDeImportacaoSchema = z
  .object({
    tipo: z.enum(TIPOS_DE_IMPORTACAO),
    nivel: z.enum([...NIVEIS, "personalizado"]),
    decisoes: z.partialRecord(z.enum(MOTIVOS), z.enum(ACOES)),
    mapeamento: z
      .array(z.object({ csv: z.string().max(200), para: z.string().min(1).max(80) }).strict())
      .min(1)
      .max(COLUNAS_MAX),
    configuracao: configuracaoSchema,
  })
  .strict()
  .refine((p) => p.tipo === "contato" || (p.configuracao.origemId !== null && p.configuracao.etapaId !== null), {
    path: ["configuracao"],
  });
export type PedidoDeImportacao = z.infer<typeof pedidoDeImportacaoSchema>;

export const resolucaoSchema = z
  .object({
    acao: z.enum(ACOES),
    dados: z
      .object({
        origemId: uuid.optional(),
        etapaId: uuid.optional(),
        sobrescrever: z.array(z.string().max(80)).max(200).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const loteSchema = z.object({ motivo: z.enum(MOTIVOS), acao: z.enum(ACOES) }).strict();

export interface ImportacaoLida {
  id: string;
  user_id: string;
  tipo: TipoDeImportacao;
  arquivo: string;
  nivel: string;
  status: StatusDaImportacao;
  total: number;
  importadas: number;
  revisar: number;
  puladas: number;
  erros: number;
  avisos: number;
  codigo_do_erro: string | null;
  linhas_apagadas_em: string | null;
  mapeamento: ColunaMapeada[];
  configuracao: Configuracao;
  origem_nome: string | null;
  created_at: string;
  concluida_em: string | null;
}

export interface LinhaLida {
  id: string;
  numero: number;
  status: StatusDaLinha;
  motivo: Motivo | null;
  normalizado: Record<string, unknown>;
  detalhe: Detalhe;
  resolucoes: Resolucoes;
  mensagem: string | null;
  com_aviso: boolean;
}
