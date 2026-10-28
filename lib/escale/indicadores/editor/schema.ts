/** Os corpos das rotas que gravam gráfico (fork Escale, Fase 7D). A pergunta ainda passa por `validarPergunta` na rota. */
import { z } from "zod";

import { opcoesDoGraficoSchema } from "../graficos/opcoes";
import { TIPOS_DE_GRAFICO } from "../graficos/tipos";
import { perguntaDoDivisorSchema, perguntaSchema } from "../pergunta";

const base = {
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().trim().max(140).nullable().optional(),
  /** Os 16 tipos (7E). */
  tipo: z.enum(TIPOS_DE_GRAFICO),
  /** O Divisor (T15) manda `{ divisor: true }`; os outros, a pergunta. */
  pergunta: z.union([perguntaSchema, perguntaDoDivisorSchema]),
  opcoes: opcoesDoGraficoSchema,
};

const dizDivisor = (o: { tipo?: string; pergunta?: unknown }): boolean =>
  o.tipo === undefined || o.pergunta === undefined || (o.tipo === "divisor") === (typeof o.pergunta === "object" && o.pergunta !== null && "divisor" in o.pergunta);

export const novoGraficoSchema = z
  .object({ painelId: z.string().uuid(), ...base })
  .strict()
  .refine(dizDivisor, "O Divisor usa pergunta { divisor: true }; os outros tipos, a pergunta.");
export const edicaoDoGraficoSchema = z
  .object({ painelId: z.string().uuid(), ...base })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0)
  .refine(dizDivisor, "O Divisor usa pergunta { divisor: true }; os outros tipos, a pergunta.");

/** S15 (provisório: a Clint não revela o tamanho do gráfico novo). */
export const TAMANHO_DO_NOVO = { w: 12, h: 8 } as const;

/** T15: o tamanho do Divisor (a largura toda, duas linhas). */
export { TAMANHO_DO_DIVISOR } from "../graficos/tipos";
