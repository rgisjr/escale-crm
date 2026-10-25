import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  CAMPOS_DO_CARTAO_PADRAO,
  camposDoCartaoSchema,
  lerCamposDoCartao,
} from "./campos-do-cartao";
import { SECOES_PADRAO, lerSecoes, secoesSchema, type SecoesVisiveis } from "./secoes";
import {
  VISUALIZACAO_PADRAO,
  lerVisualizacao,
  visualizacaoSchema,
  type Visualizacao,
} from "./visualizacao";

/**
 * AS PREFERÊNCIAS DA TELA DE CONVERSAS (fork Escale, Fase 3A; migration 9201).
 * Três chaves, uma linha por pessoa e chave; o que não está gravado (ou está
 * fora da forma) vale o padrão daquela chave.
 */
export const CHAVES_DE_PREFERENCIA = ["visualizacao", "campos_do_negocio", "secoes"] as const;
export type ChaveDePreferencia = (typeof CHAVES_DE_PREFERENCIA)[number];

export interface Preferencias {
  visualizacao: Visualizacao;
  campos_do_negocio: string[];
  secoes: SecoesVisiveis;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  visualizacao: VISUALIZACAO_PADRAO,
  campos_do_negocio: [...CAMPOS_DO_CARTAO_PADRAO],
  secoes: SECOES_PADRAO,
};

export function lerPreferencias(
  linhas: ReadonlyArray<{ chave: string; valor: unknown }>,
): Preferencias {
  const por = new Map(linhas.map((l) => [l.chave, l.valor]));
  return {
    visualizacao: por.has("visualizacao")
      ? lerVisualizacao(por.get("visualizacao"))
      : VISUALIZACAO_PADRAO,
    campos_do_negocio: por.has("campos_do_negocio")
      ? lerCamposDoCartao(por.get("campos_do_negocio"))
      : [...CAMPOS_DO_CARTAO_PADRAO],
    secoes: por.has("secoes") ? lerSecoes(por.get("secoes")) : SECOES_PADRAO,
  };
}

export const gravacaoSchema = z.discriminatedUnion("chave", [
  z.object({ chave: z.literal("visualizacao"), valor: visualizacaoSchema }).strict(),
  z.object({ chave: z.literal("campos_do_negocio"), valor: camposDoCartaoSchema }).strict(),
  z.object({ chave: z.literal("secoes"), valor: secoesSchema.partial().strict() }).strict(),
]);
export type Gravacao = z.infer<typeof gravacaoSchema>;

type ErroDoBanco = { code?: string; message?: string };

export async function lerPreferenciasDaPessoa(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<Preferencias> {
  const { data, error } = await supabase
    .from("crm_preferencias_de_conversas")
    .select("chave, valor")
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
  return lerPreferencias((data ?? []) as Array<{ chave: string; valor: unknown }>);
}

/** Uma linha por chave: atualiza se existe, senão insere (o mesmo passo da 9005). */
export async function gravarPreferenciaDaPessoa(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  gravacao: Gravacao,
): Promise<{ error: ErroDoBanco | null }> {
  const { data: existente, error: erroDaLeitura } = await supabase
    .from("crm_preferencias_de_conversas")
    .select("id, valor")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("chave", gravacao.chave)
    .maybeSingle();
  if (erroDaLeitura) return { error: erroDaLeitura };
  if (existente) {
    const salvo = (existente as { valor: unknown }).valor;
    // As seções chegam uma por vez: sem mesclar, gravar uma apagaria as outras.
    const valor =
      gravacao.chave === "secoes" && salvo && typeof salvo === "object" && !Array.isArray(salvo)
        ? { ...salvo, ...gravacao.valor }
        : gravacao.valor;
    const { error } = await supabase
      .from("crm_preferencias_de_conversas")
      .update({ valor })
      .eq("id", (existente as { id: string }).id)
      .eq("organization_id", orgId);
    return { error };
  }
  const { error } = await supabase
    .from("crm_preferencias_de_conversas")
    .insert({
      organization_id: orgId,
      user_id: userId,
      chave: gravacao.chave,
      valor: gravacao.valor,
    });
  return { error };
}
