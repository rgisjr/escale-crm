import { z } from "zod";
import { CORES_DA_PASTA, ICONES_DA_PASTA } from "./pastas";

const nomeDaPasta = z.string().trim().min(1).max(60);

export const pastaSchema = z
  .object({ nome: nomeDaPasta, cor: z.enum(CORES_DA_PASTA).optional(), icone: z.enum(ICONES_DA_PASTA).optional() })
  .strict();

export const edicaoDaPastaSchema = z
  .object({ nome: nomeDaPasta.optional(), cor: z.enum(CORES_DA_PASTA).optional(), icone: z.enum(ICONES_DA_PASTA).optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0);

/** PUT …/{id}/organizacao: `pasta_id` null = "Sem pasta"; ausente = não mexe. */
export const organizacaoSchema = z
  .object({ pasta_id: z.string().uuid().nullable().optional(), forma: z.enum(["fluxo", "editor"]).optional() })
  .strict()
  .refine((v) => v.pasta_id !== undefined || v.forma !== undefined);

export const favoritaSchema = z.object({ favorita: z.boolean() }).strict();

export const loteSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).strict();
export const moverEmLoteSchema = loteSchema.extend({ pasta_id: z.string().uuid().nullable() }).strict();
