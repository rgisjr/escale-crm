import { z } from "zod";

/**
 * O desenho da tela como o cliente manda (FORK ESCALE · 5D; reusado pelo rascunho). Aqui só a
 * forma e o tamanho: o que cada caixa diz é conferido por quem compila ou publica.
 */
export const desenhoSchema = z.object({
  caixas: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        type: z.enum(["gatilho", "condicoes", "acao", "atraso"]),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.looseObject({ kind: z.enum(["gatilho", "condicoes", "acao", "atraso"]) }),
      }),
    )
    .min(1)
    .max(80),
  ligacoes: z
    .array(z.object({ id: z.string().min(1).max(80), source: z.string().min(1), target: z.string().min(1), saida: z.string().max(80).optional() }))
    .max(160),
});
