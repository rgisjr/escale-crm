/** Tipos dos modelos de painel (fork Escale, Fase 7F). */
import type { z } from "zod";

import type { LayoutDoGrafico } from "../graficos/tipos";
import type { CorDoPainel, IconeDoPainel } from "../paineis/aparencia";
import type { perguntaDoDivisorSchema, perguntaSchema } from "../pergunta";

export const MODELOS_IDS = ["conversao-de-vendas", "atendimentos", "produtividade-por-usuario", "campanhas-de-whatsapp"] as const;
export type IdDoModeloDoSistema = (typeof MODELOS_IDS)[number];

export interface GraficoDoModelo {
  /** Chave estável dentro do modelo (teste de unicidade). */
  chave: string;
  /** Chave do dicionário (pt); a rota grava `t(nome)`. */
  nome: string;
  descricao?: string;
  tipo: string;
  layout: LayoutDoGrafico;
  /** Entrada do schema (com defaults); validada no teste e na rota. */
  pergunta: z.input<typeof perguntaSchema> | z.input<typeof perguntaDoDivisorSchema>;
  /** Parcial: o que não vier fica no padrão de `opcoesComPadrao`. */
  opcoes: Record<string, unknown>;
}
export interface ModeloDoSistema {
  id: IdDoModeloDoSistema;
  nome: string;
  cor: CorDoPainel;
  icone: IconeDoPainel;
  graficos: readonly GraficoDoModelo[];
}
export type ModeloNaLista =
  | { origem: "sistema"; id: IdDoModeloDoSistema; nome: string; cor: string; icone: string; graficos: number }
  | { origem: "organizacao"; id: string; nome: string; cor: string; icone: string; graficos: number; criadoEm: string };

export const GRAFICOS_POR_MODELO_MAX = 30;
