import { z } from "zod";

import { normalizarTag, TAMANHO_MAXIMO_DA_TAG } from "@/lib/contacts/tag-normalizada";

export const DESCRICAO_MAX = 160;

/** O corpo do POST /api/v1/escale/tags: cor e descrição são DEFINIDAS (null apaga). */
export const gravarTagSchema = z.object({
  tag: z
    .string()
    .transform(normalizarTag)
    .pipe(z.string().min(1).max(TAMANHO_MAXIMO_DA_TAG)),
  cor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/)
    .nullable(),
  descricao: z
    .string()
    .trim()
    .max(DESCRICAO_MAX)
    .nullable()
    .transform((v) => (v === "" ? null : v)),
});

export type EntradaDeTag = {
  tag: string;
  cor?: string;
  descricao?: string;
  criada_em?: string;
  criada_por?: string;
};
