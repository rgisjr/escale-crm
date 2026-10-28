import { z } from "zod";

import { ehCorDoPainel, ehIconeDoPainel } from "./aparencia";
import { PAPEIS_DO_PAINEL } from "./regras";

/** O corpo do PATCH de um painel (fork Escale, Fase 7B): só os campos que mudaram. */
export const edicaoDoPainelSchema = z
  .object({
    nome: z.string().trim().min(1).max(80),
    cor: z.string().refine(ehCorDoPainel),
    icone: z.string().refine(ehIconeDoPainel),
    permissoesUsuarios: z.array(z.string().uuid()).max(500),
    permissoesPapeis: z.array(z.enum(PAPEIS_DO_PAINEL)).max(3),
  })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0);

export type CorpoDaEdicao = z.infer<typeof edicaoDoPainelSchema>;

/** O corpo do POST de painéis: vazio, ou só o nome (fase 7D). */
export const nomeDoPainelSchema = z.object({ nome: z.string().trim().min(1).max(80) }).partial().strict();
