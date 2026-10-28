/** Os corpos das rotas que gravam gráfico (fork Escale, Fase 7D). A pergunta ainda passa por `validarPergunta` na rota. */
import { z } from "zod";

import { opcoesDoGraficoSchema } from "../graficos/opcoes";
import { TIPOS_PRINCIPAIS } from "../graficos/tipos";
import { perguntaSchema } from "../pergunta";

const base = {
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().trim().max(140).nullable().optional(),
  /** A 7E amplia para os 16 tipos. */
  tipo: z.enum(TIPOS_PRINCIPAIS),
  pergunta: perguntaSchema,
  opcoes: opcoesDoGraficoSchema,
};

export const novoGraficoSchema = z.object({ painelId: z.string().uuid(), ...base }).strict();
export const edicaoDoGraficoSchema = z
  .object({ painelId: z.string().uuid(), ...base })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0);

/** S15 (provisório: a Clint não revela o tamanho do gráfico novo). */
export const TAMANHO_DO_NOVO = { w: 12, h: 8 } as const;
