/**
 * Os N primeiros contatos de uma busca, na ordem da lista (B3-1 da revisão de
 * 24/10/2026). "Selecionar [N]" guardava só "os N primeiros" e a ação os
 * recalculava na hora de rodar: uma mensagem que entrasse no meio mudava quem
 * estava entre eles. Resolvidos aqui no clique, os ids ficam congelados na
 * seleção e a ação age exatamente sobre os que a pessoa viu.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { IDS_MAX } from "./selecao";
import { VISOES_DE_CONTATOS } from "./regras";

export const consultaDosPrimeirosSchema = z.object({
  q: z.string().max(200).optional(),
  v: z.enum(VISOES_DE_CONTATOS).default("todos"),
  f: z.string().max(16384).optional(),
  /** Até `IDS_MAX`: é o que cabe numa seleção por ids. Acima disso a seleção segue por quantidade. */
  quantidade: z.coerce.number().int().min(1).max(IDS_MAX),
});
export type ConsultaDosPrimeiros = z.output<typeof consultaDosPrimeirosSchema>;

interface Busca {
  padrao: string | null;
  digitos: string[];
  cpfHash: string | null;
}

export async function primeirosContatos(
  supabase: SupabaseClient,
  orgId: string,
  consulta: Pick<ConsultaDosPrimeiros, "v" | "quantidade">,
  busca: Busca,
  filtro: Record<string, unknown>,
): Promise<string[]> {
  const { data, error } = await supabase
    .rpc("fn_escale_contatos_do_filtro", {
      p_org: orgId,
      p_visao: consulta.v,
      p_padrao: busca.padrao,
      p_digitos: busca.digitos,
      p_cpf_hash: busca.cpfHash,
      p_filtros: filtro,
    })
    // A mesma ordem da lista e da ação em massa (9101/9103): atividade mais recente primeiro.
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("contact_id", { ascending: false })
    .range(0, consulta.quantidade - 1);
  if (error) throw error;
  return ((data ?? []) as Array<{ contact_id: string }>).map((l) => l.contact_id);
}
