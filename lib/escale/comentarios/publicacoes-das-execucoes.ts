import type { SupabaseClient } from "@supabase/supabase-js";

import type { LinhaDaExecucao } from "@/lib/escale/automacoes/insights/tipos";

import { linkDaPublicacao } from "./origem";

/** FORK ESCALE · Fase 10C (D9): junta a publicação do disparo a cada execução, pelo `run_id`. */
export async function comPublicacoes(
  sb: SupabaseClient,
  regraId: string,
  linhas: readonly LinhaDaExecucao[],
): Promise<LinhaDaExecucao[]> {
  if (linhas.length === 0) return [];
  const { data, error } = await sb
    .from("escale_disparos_de_comentario")
    .select("run_id, publicacao_legenda, publicacao_link")
    .eq("rule_id", regraId)
    .in(
      "run_id",
      linhas.map((l) => l.id),
    );
  if (error) throw new Error(error.message);
  const porExecucao = new Map(
    ((data ?? []) as Array<{ run_id: string; publicacao_legenda: string | null; publicacao_link: string | null }>).map(
      (d) => [d.run_id, d],
    ),
  );
  return linhas.map((l) => {
    const d = porExecucao.get(l.id);
    return {
      ...l,
      publicacao: d ? { legenda: d.publicacao_legenda, link: linkDaPublicacao(d.publicacao_link) } : null,
    };
  });
}
