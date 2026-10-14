/**
 * Lê os GRUPOS e os funis VIVOS da organização (fork Escale, Fase 1A).
 *
 * O filtro de `organization_id` não é redundante com a RLS — é o mesmo cuidado
 * de `app/app/kanban/page.tsx`: a policy libera TODAS as organizações do usuário,
 * e quem participa de duas veria as duas misturadas. A RLS responde "pode ver?";
 * aqui a pergunta é "quer ver agora?".
 *
 * LANÇA no erro do banco — quem chama decide: a rota responde 500; o painel some
 * e o quadro abre sem ele (`ComOrigens`).
 */
import type { createClient } from "@/lib/supabase/server";

import type { FunilDaOrigem, GrupoDeFunis, Origens } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function lerOrigens(supabase: Supabase, orgId: string): Promise<Origens> {
  const [grupos, funis] = await Promise.all([
    supabase.from("crm_pipeline_groups").select("id, name").eq("organization_id", orgId).order("name"),
    supabase
      .from("crm_pipelines")
      .select("id, name, group_id")
      .eq("organization_id", orgId)
      .eq("is_archived", false)
      .order("position"),
  ]);
  if (grupos.error) throw new Error(grupos.error.message);
  if (funis.error) throw new Error(funis.error.message);
  return {
    grupos: ((grupos.data ?? []) as GrupoDeFunis[]).map((g) => ({ id: g.id, name: g.name })),
    funis: ((funis.data ?? []) as FunilDaOrigem[]).map((f) => ({
      id: f.id,
      name: f.name,
      group_id: f.group_id ?? null,
    })),
  };
}
