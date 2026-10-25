/**
 * Resgate da campanha presa em `preparing` (B8-1 da revisão de 24/10/2026).
 *
 * Preparar roda dentro de uma requisição. Se o processo cai no meio (deploy,
 * falta de memória), nada devolve a campanha: a máquina de estados só deixa
 * `preparing` virar `ready` ou `failed`, a tela não oferece editar nem cancelar,
 * e a lista consulta a cada 10 s sem fim. Cada rodada do `campaign-worker`
 * devolve a rascunho a que está parada há mais que o prazo, para a pessoa
 * corrigir e preparar de novo.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Mais que a preparação mais lenta esperada; preparar é uma requisição, não um trabalho longo. */
export const PRAZO_DA_PREPARACAO_MS = 15 * 60 * 1000;
export const CODIGO_DA_PREPARACAO_INTERROMPIDA = "preparacao_interrompida";

export async function resgatarPreparacoesParadas(
  admin: SupabaseClient,
  agora: Date,
): Promise<number> {
  const limite = new Date(agora.getTime() - PRAZO_DA_PREPARACAO_MS).toISOString();
  // `updated_at` é carimbado pelo gatilho a cada update: ao entrar em `preparing` ele marca a entrada.
  const { data, error } = await admin
    .from("campaigns")
    .update({ status: "draft", failure_code: CODIGO_DA_PREPARACAO_INTERROMPIDA })
    .eq("status", "preparing")
    .lt("updated_at", limite)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}
