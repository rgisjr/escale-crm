import type { SupabaseClient } from "@supabase/supabase-js";

import { audit } from "@/lib/audit";
import { CHAVE_DE_VARIAVEL, CHAVES_RESERVADAS } from "@/lib/canais/variaveis";

export type ValidacaoDeVariaveis = { ok: true } | { ok: false; motivo: string };

export function validarVariaveis(valores: Record<string, string>): ValidacaoDeVariaveis {
  for (const [chave, valor] of Object.entries(valores)) {
    if ((CHAVES_RESERVADAS as readonly string[]).includes(chave)) {
      return { ok: false, motivo: `chave_reservada:${chave}` };
    }
    if (!CHAVE_DE_VARIAVEL.test(chave)) return { ok: false, motivo: `chave_invalida:${chave}` };
    if (valor.length < 1 || valor.length > 2000) return { ok: false, motivo: `valor_invalido:${chave}` };
  }
  return { ok: true };
}

/**
 * `channelSessionId = null` grava o PADRÃO da organização. Atualiza se a chave existe, senão
 * insere (o PostgREST não faz `onConflict` por expressão). `organizationId` vem de fonte confiável.
 */
export async function gravarVariaveisDoCanal(
  admin: SupabaseClient,
  entrada: {
    organizationId: string;
    channelSessionId: string | null;
    valores: Record<string, string>;
    requestId: string;
    actorUserId: string | null;
  },
): Promise<void> {
  const validacao = validarVariaveis(entrada.valores);
  if (!validacao.ok) throw new Error(validacao.motivo);

  if (entrada.channelSessionId !== null) {
    const { data, error } = await admin
      .from("channel_sessions")
      .select("id")
      .eq("organization_id", entrada.organizationId)
      .eq("id", entrada.channelSessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("canal_nao_encontrado");
  }

  for (const [chave, value_text] of Object.entries(entrada.valores)) {
    const base = admin
      .from("channel_variables")
      .update({ value_text, updated_at: new Date().toISOString() })
      .eq("organization_id", entrada.organizationId)
      .eq("chave", chave);
    const alvo =
      entrada.channelSessionId === null
        ? base.is("channel_session_id", null)
        : base.eq("channel_session_id", entrada.channelSessionId);
    const { data: atualizadas, error } = await alvo.select("id");
    if (error) throw new Error(error.message);
    if ((atualizadas ?? []).length === 0) {
      const { error: erroDeInsercao } = await admin.from("channel_variables").insert({
        organization_id: entrada.organizationId,
        channel_session_id: entrada.channelSessionId,
        chave,
        value_text,
      });
      if (erroDeInsercao) throw new Error(erroDeInsercao.message);
    }
  }

  void audit({
    action: "channel_variables.updated",
    actorUserId: entrada.actorUserId,
    organizationId: entrada.organizationId,
    resourceType: "channel_session",
    resourceId: entrada.channelSessionId ?? entrada.organizationId,
    requestId: entrada.requestId,
    // Só as chaves: o valor pode ser dado financeiro (chave PIX) e log é lugar de metadado.
    metadata: { chaves: Object.keys(entrada.valores) },
  });
}
