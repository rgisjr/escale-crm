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

type ValorGravado = { value_text: string; asset_id: null } | { value_text: null; asset_id: string };

/** Atualiza a variável (padrão ou do número) e, se ela ainda não existe, insere. */
async function gravarUma(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string | null,
  chave: string,
  valor: ValorGravado,
): Promise<void> {
  const base = admin
    .from("channel_variables")
    .update({ ...valor, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("chave", chave);
  const alvo = channelSessionId === null ? base.is("channel_session_id", null) : base.eq("channel_session_id", channelSessionId);
  const { data: atualizadas, error } = await alvo.select("id");
  if (error) throw new Error(error.message);
  if ((atualizadas ?? []).length > 0) return;
  const { error: erroDeInsercao } = await admin
    .from("channel_variables")
    .insert({ organization_id: organizationId, channel_session_id: channelSessionId, chave, ...valor });
  if (erroDeInsercao) throw new Error(erroDeInsercao.message);
}

/** Cada ativo tem de existir NA organização (a FK composta também garante, mas o erro aqui é legível). */
async function conferirAtivos(admin: SupabaseClient, organizationId: string, ativos: Record<string, string>): Promise<void> {
  for (const [chave, assetId] of Object.entries(ativos)) {
    const { data, error } = await admin
      .from("org_media_assets")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", assetId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`ativo_nao_encontrado:${chave}`);
  }
}

function validarAtivos(ativos: Record<string, string>, valores: Record<string, string>): void {
  for (const chave of Object.keys(ativos)) {
    if ((CHAVES_RESERVADAS as readonly string[]).includes(chave)) throw new Error(`chave_reservada:${chave}`);
    if (!CHAVE_DE_VARIAVEL.test(chave)) throw new Error(`chave_invalida:${chave}`);
    if (Object.hasOwn(valores, chave)) throw new Error(`chave_em_texto_e_ativo:${chave}`);
  }
}

/**
 * `channelSessionId = null` grava o PADRÃO da organização. Atualiza se a chave existe, senão
 * insere (o PostgREST não faz `onConflict` por expressão). `organizationId` vem de fonte confiável.
 * `ativos` (chave → id do ativo de mídia) vira variável que aponta para um arquivo, usada como `var:<chave>`.
 */
export async function gravarVariaveisDoCanal(
  admin: SupabaseClient,
  entrada: {
    organizationId: string;
    channelSessionId: string | null;
    valores: Record<string, string>;
    ativos?: Record<string, string>;
    requestId: string;
    actorUserId: string | null;
  },
): Promise<void> {
  const ativos = entrada.ativos ?? {};
  const validacao = validarVariaveis(entrada.valores);
  if (!validacao.ok) throw new Error(validacao.motivo);
  validarAtivos(ativos, entrada.valores);

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
  await conferirAtivos(admin, entrada.organizationId, ativos);

  for (const [chave, value_text] of Object.entries(entrada.valores)) {
    await gravarUma(admin, entrada.organizationId, entrada.channelSessionId, chave, { value_text, asset_id: null });
  }
  for (const [chave, asset_id] of Object.entries(ativos)) {
    await gravarUma(admin, entrada.organizationId, entrada.channelSessionId, chave, { value_text: null, asset_id });
  }

  void audit({
    action: "channel_variables.updated",
    actorUserId: entrada.actorUserId,
    organizationId: entrada.organizationId,
    resourceType: "channel_session",
    resourceId: entrada.channelSessionId ?? entrada.organizationId,
    requestId: entrada.requestId,
    // Só as chaves: o valor pode ser dado financeiro (chave PIX) e log é lugar de metadado.
    metadata: { chaves: Object.keys(entrada.valores), ativos: Object.keys(ativos) },
  });
}
