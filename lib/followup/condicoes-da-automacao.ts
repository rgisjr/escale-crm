/**
 * FORK ESCALE · 5D: o passo Condições da Clint (07-025, E19) dentro do fluxo — grupos "Corresponde a
 * todas / qualquer condição", cada um com a sua saída, e "Não corresponde a nenhuma condição". As
 * linhas são as MESMAS da regra (`evaluateConditions`, com "Horário atual"), para a tela ter uma
 * verdade só.
 */
import { z } from "zod";

import {
  evaluateConditions,
  type RelogioDasCondicoes,
  type RuleCondition,
} from "@/lib/automation/conditions";
import { declaredBranchIdSchema } from "@/lib/followup/ramos";

const linhaSchema = z.strictObject({
  field: z.string().min(1).max(120),
  op: z.enum(["eq", "neq", "contains", "depois_de", "antes_de", "entre"]),
  value: z.string().max(500),
});

export const condicoesDaAutomacaoConfigSchema = z
  .strictObject({
    grupos: z
      .array(
        z.strictObject({
          id: declaredBranchIdSchema,
          modo: z.enum(["todas", "qualquer"]),
          linhas: z.array(linhaSchema).min(1).max(10),
        }),
      )
      .min(1)
      .max(10),
  })
  .refine((config) => new Set(config.grupos.map((grupo) => grupo.id)).size === config.grupos.length, {
    message: "grupos[].id must be unique within the node",
    path: ["grupos"],
  });
export type CondicoesDaAutomacaoConfig = z.infer<typeof condicoesDaAutomacaoConfigSchema>;

export function grupoQueCasou(
  grupos: CondicoesDaAutomacaoConfig["grupos"],
  context: Record<string, unknown>,
  relogio: RelogioDasCondicoes,
): string | null {
  for (const grupo of grupos) {
    const linhas = grupo.linhas as RuleCondition[];
    const casou =
      grupo.modo === "todas"
        ? evaluateConditions(linhas, context, relogio)
        : linhas.some((linha) => evaluateConditions([linha], context, relogio));
    if (casou) return grupo.id;
  }
  return null;
}
