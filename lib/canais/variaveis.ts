import type { SupabaseClient } from "@supabase/supabase-js";

import { responsavelDoCanal } from "@/lib/canais/responsavel";
import { nomesDosAtendentes } from "@/lib/users/nome-do-atendente";

/** Chave de variável: minúscula, dígito e sublinhado. Vira `{{canal.<chave>}}`. */
export const CHAVE_DE_VARIAVEL = /^[a-z][a-z0-9_]{0,39}$/;
/** Chaves que o sistema preenche sozinho e que a variável do canal não pode sobrescrever. */
export const CHAVES_RESERVADAS = ["nome", "telefone"] as const;

export interface LinhaDeVariavel {
  channel_session_id: string | null;
  chave: string;
  value_text: string;
}
export interface ContextoDoCanal {
  canal: Record<string, string>;
  atendente: { nome: string; id: string | null };
}

export function mesclarVariaveis(
  linhas: readonly LinhaDeVariavel[],
  channelSessionId: string | null,
): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const l of linhas) if (l.channel_session_id === null) resultado[l.chave] = l.value_text;
  if (channelSessionId !== null) {
    for (const l of linhas) if (l.channel_session_id === channelSessionId) resultado[l.chave] = l.value_text;
  }
  return resultado;
}

const VAZIO: ContextoDoCanal = { canal: {}, atendente: { nome: "", id: null } };

/**
 * O que `{{canal.*}}` e `{{atendente.*}}` valem para este canal. NUNCA lança por
 * dado faltando: canal sem variável devolve só `nome`/`telefone`, e o
 * `renderTemplate` deixa a marcação vazia (o mesmo que faz com qualquer caminho
 * desconhecido). O atendente é o responsável ÚNICO do canal; com vários ou
 * nenhum, cai no dono do negócio (`donoDoLeadId`), se houver.
 */
export async function contextoDoCanal(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string | null,
  donoDoLeadId: string | null = null,
): Promise<ContextoDoCanal> {
  if (channelSessionId === null) return VAZIO;
  const [{ data: sessao, error: erroSessao }, { data: linhas, error: erroLinhas }, responsavel] =
    await Promise.all([
      admin
        .from("channel_sessions")
        .select("display_name, phone_number")
        .eq("organization_id", organizationId)
        .eq("id", channelSessionId)
        .maybeSingle(),
      admin
        .from("channel_variables")
        .select("channel_session_id, chave, value_text")
        .eq("organization_id", organizationId)
        .or(`channel_session_id.is.null,channel_session_id.eq.${channelSessionId}`),
      responsavelDoCanal(admin, organizationId, channelSessionId),
    ]);
  if (erroSessao) throw new Error(erroSessao.message);
  if (erroLinhas) throw new Error(erroLinhas.message);

  const variaveis = mesclarVariaveis((linhas ?? []) as LinhaDeVariavel[], channelSessionId);
  const s = sessao as { display_name?: string | null; phone_number?: string | null } | null;
  const canal = { ...variaveis, nome: s?.display_name ?? "", telefone: s?.phone_number ?? "" };

  const atendenteId = responsavel.tipo === "unico" ? responsavel.userId : donoDoLeadId;
  if (atendenteId === null) return { canal, atendente: { nome: "", id: null } };
  const nomes = await nomesDosAtendentes([atendenteId]);
  return { canal, atendente: { nome: nomes.get(atendenteId) ?? "", id: atendenteId } };
}
