/**
 * FORK ESCALE · 5D: a caixa "Ações" da tela de Automações quando ela vem DEPOIS de um Atraso, de um
 * ramo ou de uma resposta — roda as MESMAS ações do motor de regras (`getAction`), como o nó
 * `edit_lead_tag` já faz com `add_tag`. Nada de lógica copiada: o contexto é a linha inteira do negócio
 * mais recente do contato e o contato; `event` vai vazio de propósito.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { ActionExecutor } from "@/lib/automation/types";
import type { EventRow } from "@/lib/event-log/dispatcher";

export const TIPOS_DE_ACAO_NO_FLUXO = [
  "add_tag",
  "remove_tag",
  "create_or_move_lead",
  "assign_owner",
  "create_task",
  "apply_task_plan",
  "call_webhook",
] as const;
export type TipoDeAcaoNoFluxo = (typeof TIPOS_DE_ACAO_NO_FLUXO)[number];

export const acoesDaAutomacaoConfigSchema = z.strictObject({
  acoes: z
    .array(
      z.strictObject({
        type: z.enum(TIPOS_DE_ACAO_NO_FLUXO),
        config: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1)
    .max(10),
});
export type AcoesDaAutomacaoConfig = z.infer<typeof acoesDaAutomacaoConfigSchema>;

export interface DepsDasAcoes {
  admin: SupabaseClient;
  getAction: (type: string) => Pick<ActionExecutor, "type" | "execute"> | undefined;
  carregarContexto: (orgId: string, contactId: string) => Promise<Record<string, unknown>>;
}

export type ResultadoDasAcoes = { ok: boolean; falhas: string[] };

export async function executarAcoesDaAutomacao(
  deps: DepsDasAcoes,
  item: {
    organization_id: string;
    contact_id: string;
    enrollment_id: string;
    acoes: AcoesDaAutomacaoConfig["acoes"];
  },
): Promise<ResultadoDasAcoes> {
  const context = await deps.carregarContexto(item.organization_id, item.contact_id);
  const falhas: string[] = [];
  for (const [indice, acao] of item.acoes.entries()) {
    const executor = deps.getAction(acao.type);
    if (!executor) {
      falhas.push(`${acao.type}:acao_nao_registrada`);
      continue;
    }
    const resultado = await executor.execute(
      {
        admin: deps.admin,
        organizationId: item.organization_id,
        ruleId: `followup:${item.enrollment_id}`,
        ruleName: "Automação",
        event: {} as EventRow,
        context,
        requestId: `followup:${item.enrollment_id}:${indice}`,
        actionIndex: indice,
        ruleActions: item.acoes,
      },
      acao.config,
    );
    if (resultado.status === "failed") falhas.push(`${acao.type}:${resultado.error ?? "falhou"}`);
  }
  return { ok: falhas.length === 0, falhas };
}
