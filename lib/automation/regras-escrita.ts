import type { SupabaseClient } from "@supabase/supabase-js";

import type { Actor } from "@/lib/api/handlers/types";
import { falhaDeEscrita, type ResultadoDeEscrita } from "@/lib/api/resultado-de-escrita";
import { audit } from "@/lib/audit";
import { autoriaDaMudanca } from "@/lib/operacao/autoria";
import {
  acoesQueFechamLaco,
  MENSAGEM_DA_VERSAO_VELHA,
  MENSAGEM_DO_LACO_DE_LEAD,
  type CreateAutomationRuleInput,
  type UpdateAutomationRuleInput,
} from "@/lib/schemas/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptRuleActionSecrets } from "@/lib/webhooks/secrets";

/** A linha de `automation_rules` como o PostgREST a devolve. */
export type RegraGravada = Record<string, unknown> & { id: string };

const MENSAGEM_SEM_CHAVE_DE_CIFRA =
  "Não foi possível guardar o segredo do webhook com segurança: a chave de cifra desta instalação não está ativa. Quem administra o servidor resolve rodando o update.sh, que gera e ativa a chave.";

async function fonteDaOrganizacaoExiste(
  db: SupabaseClient,
  organizationId: string,
  fonteId: unknown,
): Promise<ResultadoDeEscrita<null>> {
  if (typeof fonteId !== "string") return { ok: true, dado: null };
  const { data, error } = await db
    .from("webhook_sources")
    .select("id")
    .eq("id", fonteId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) return falhaDeEscrita("internal_error", error.message, 500);
  if (!data) return falhaDeEscrita("invalid_request", "A fonte escolhida não pertence a esta empresa.", 422);
  return { ok: true, dado: null };
}

/**
 * Cria uma regra. `is_active` NUNCA entra: a regra nasce desligada (default do banco).
 * `db` é o client da sessão (rota) ou o admin (MCP); `organizationId` vem sempre de fonte confiável.
 */
export async function criarRegra(
  db: SupabaseClient,
  entrada: {
    organizationId: string;
    criadoPorUserId: string | null;
    requestId: string;
    dados: CreateAutomationRuleInput;
  },
): Promise<ResultadoDeEscrita<RegraGravada>> {
  const { organizationId, dados } = entrada;
  // Secrets de call_webhook nunca ficam em claro no jsonb (migration 0041).
  const acoesSeguras = await encryptRuleActionSecrets(createAdminClient(), dados.actions);
  if (acoesSeguras === null) {
    return falhaDeEscrita(
      "encryption_unavailable",
      `${MENSAGEM_SEM_CHAVE_DE_CIFRA} Enquanto isso, você pode criar a ação sem segredo.`,
      422,
    );
  }
  const fonte = await fonteDaOrganizacaoExiste(db, organizationId, dados.trigger_config?.webhook_source_id);
  if (!fonte.ok) return fonte;

  const { data: criada, error } = await db
    .from("automation_rules")
    .insert({
      organization_id: organizationId,
      created_by_user_id: entrada.criadoPorUserId,
      name: dados.name,
      trigger_event: dados.trigger_event,
      conditions: dados.conditions,
      actions: acoesSeguras,
      // O gatilho de data do funil (#989) guarda funil, campo e N; os demais gravam o objeto vazio.
      trigger_config: dados.trigger_config ?? {},
    })
    .select("*")
    .single();
  if (error || !criada) {
    return falhaDeEscrita("internal_error", error?.message ?? "automation_rule_insert_failed", 500);
  }

  void audit({
    action: "automation.rule_created",
    actorUserId: entrada.criadoPorUserId,
    organizationId,
    resourceType: "automation_rule",
    resourceId: (criada as RegraGravada).id,
    requestId: entrada.requestId,
    metadata: { name: dados.name, trigger_event: dados.trigger_event },
  });
  return { ok: true, dado: criada as RegraGravada };
}

/** Atualiza campos da regra (`is_active` só passa pelo `patch` na rota; a ferramenta MCP o recusa). */
export async function atualizarRegra(
  db: SupabaseClient,
  entrada: {
    organizationId: string;
    regraId: string;
    requestId: string;
    actor: Actor;
    patch: UpdateAutomationRuleInput;
  },
): Promise<ResultadoDeEscrita<RegraGravada>> {
  const { organizationId, regraId, patch: pedido } = entrada;
  const { data: existente, error: erroDeLeitura } = await db
    .from("automation_rules")
    .select("id, trigger_event, trigger_config, actions")
    .eq("id", regraId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (erroDeLeitura) return falhaDeEscrita("internal_error", erroDeLeitura.message, 500);
  if (!existente) return falhaDeEscrita("not_found", "Regra não encontrada.", 404);

  // O PATCH parcial (só o gatilho, ou só as ações) monta o laço de #1528 pela porta do lado.
  const gravada = existente as { trigger_event: string; actions: { type: string }[] | null };
  if (
    (pedido.trigger_event !== undefined || pedido.actions !== undefined) &&
    acoesQueFechamLaco(pedido.trigger_event ?? gravada.trigger_event, pedido.actions ?? gravada.actions ?? [])
      .length
  ) {
    return falhaDeEscrita("invalid_request", MENSAGEM_DO_LACO_DE_LEAD, 400);
  }
  const fonte = await fonteDaOrganizacaoExiste(db, organizationId, pedido.trigger_config?.webhook_source_id);
  if (!fonte.ok) return fonte;

  const { versao_lida: versaoLida, ...campos } = pedido;
  const patch: Record<string, unknown> = {
    ...campos,
    updated_at: new Date().toISOString(),
    ...autoriaDaMudanca(entrada.actor),
  };
  if (pedido.actions !== undefined) {
    const acoesSeguras = await encryptRuleActionSecrets(createAdminClient(), pedido.actions);
    if (acoesSeguras === null) return falhaDeEscrita("encryption_unavailable", MENSAGEM_SEM_CHAVE_DE_CIFRA, 422);
    patch.actions = acoesSeguras;
  }

  // Com a versão lida, o UPDATE só casa se a linha ainda for aquela (checagem e escrita são um comando).
  let escrita = db.from("automation_rules").update(patch).eq("id", regraId).eq("organization_id", organizationId);
  if (versaoLida !== undefined) escrita = escrita.eq("updated_at", versaoLida);
  const { data: atualizada, error: erroDeEscrita } = await escrita.select("*").maybeSingle();
  if (erroDeEscrita) return falhaDeEscrita("internal_error", erroDeEscrita.message, 500);
  if (!atualizada) {
    return versaoLida !== undefined
      ? falhaDeEscrita("state_conflict", MENSAGEM_DA_VERSAO_VELHA, 409)
      : falhaDeEscrita("not_found", "Regra não encontrada.", 404);
  }

  const { actions: _acoesComSegredo, ...auditavel } = campos;
  void audit({
    action: "automation.rule_updated",
    actorUserId: entrada.actor.type === "user" ? entrada.actor.id : null,
    organizationId,
    resourceType: "automation_rule",
    resourceId: regraId,
    requestId: entrada.requestId,
    // actions fora do audit: config de call_webhook carrega secret plaintext no input.
    metadata: { ...auditavel, ...(pedido.actions !== undefined ? { actions_changed: true } : {}) },
  });
  return { ok: true, dado: atualizada as RegraGravada };
}
