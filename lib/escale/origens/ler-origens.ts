/**
 * Lê os GRUPOS e TODOS os funis da organização (fork Escale, Fases 1A e 1B).
 *
 * Arquivados entram: o painel mostra a seção Arquivados, e as rotas precisam
 * enxergar a origem arquivada para movê-la junto quando o grupo é excluído.
 *
 * O filtro de `organization_id` não é redundante com a RLS — é o mesmo cuidado
 * de `app/app/kanban/page.tsx`: a policy libera TODAS as organizações do usuário.
 *
 * LANÇA no erro do banco — quem chama decide: a rota responde 500; o painel some
 * e o quadro abre sem ele (`ComOrigens`); a entrada de Negócios cai na lista.
 */
import type { createClient } from "@/lib/supabase/server";

import { pessoasDaOrigem } from "@/lib/escale/acesso/regras";

import { corValida, iconeValido, type FunilDaOrigem, type GrupoDeFunis, type Origens } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface LinhaDeGrupo {
  id: string;
  name: string;
  color?: unknown;
  icon?: unknown;
  is_archived?: boolean | null;
  settings?: unknown;
}

interface LinhaDeFunil {
  id: string;
  name: string;
  group_id?: string | null;
  is_archived?: boolean | null;
  is_default?: boolean | null;
}

const paraGrupo = (g: LinhaDeGrupo): GrupoDeFunis => ({
  id: g.id,
  name: g.name,
  color: corValida(g.color),
  icon: iconeValido(g.icon),
  is_archived: g.is_archived === true,
  pessoas: pessoasDaOrigem(g.settings),
});

const paraFunil = (f: LinhaDeFunil): FunilDaOrigem => ({
  id: f.id,
  name: f.name,
  group_id: f.group_id ?? null,
  is_archived: f.is_archived === true,
  is_default: f.is_default === true,
});

export async function lerOrigens(supabase: Supabase, orgId: string): Promise<Origens> {
  const [grupos, funis] = await Promise.all([
    supabase
      .from("crm_pipeline_groups")
      .select("id, name, color, icon, is_archived, settings")
      .eq("organization_id", orgId)
      .order("name"),
    supabase
      .from("crm_pipelines")
      .select("id, name, group_id, is_archived, is_default")
      .eq("organization_id", orgId)
      .order("position"),
  ]);
  if (grupos.error) throw new Error(grupos.error.message);
  if (funis.error) throw new Error(funis.error.message);
  return {
    grupos: ((grupos.data ?? []) as LinhaDeGrupo[]).map(paraGrupo),
    funis: ((funis.data ?? []) as LinhaDeFunil[]).map(paraFunil),
  };
}
