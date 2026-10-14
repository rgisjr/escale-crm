/**
 * Lê as VISUALIZAÇÕES da organização (fork Escale, Fase 1C) com as origens (na
 * ordem das colunas) e as pessoas de cada uma.
 *
 * Quais aparecem é a RLS que decide (migration 9003): com acesso "escolhidos",
 * quem não foi escolhido nem recebe a linha; e só gerente+ recebe a lista
 * inteira de pessoas. O filtro de `organization_id` não é redundante — a policy
 * libera TODAS as organizações do usuário (o mesmo cuidado de `ler-origens.ts`).
 *
 * LANÇA no erro do banco — quem chama decide: a rota responde 500; o painel
 * mostra a seção vazia (`ComOrigens`); a página do quadro cai no erro.
 */
import type { createClient } from "@/lib/supabase/server";

import { ACESSOS_DE_VISUALIZACAO, type AcessoDaVisualizacao, type Visualizacao } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Valor fora da lista (impossível com o CHECK) cai no MAIS fechado. */
const acessoValido = (valor: unknown): AcessoDaVisualizacao =>
  (ACESSOS_DE_VISUALIZACAO as readonly unknown[]).includes(valor) ? (valor as AcessoDaVisualizacao) : "escolhidos";

export async function lerVisualizacoes(supabase: Supabase, orgId: string): Promise<Visualizacao[]> {
  const [vistas, origens, pessoas] = await Promise.all([
    supabase.from("crm_pipeline_views").select("id, name, acesso").eq("organization_id", orgId),
    supabase
      .from("crm_pipeline_view_origens")
      .select("view_id, pipeline_id, position")
      .eq("organization_id", orgId)
      .order("position"),
    supabase.from("crm_pipeline_view_pessoas").select("view_id, user_id").eq("organization_id", orgId),
  ]);
  if (vistas.error) throw new Error(vistas.error.message);
  if (origens.error) throw new Error(origens.error.message);
  if (pessoas.error) throw new Error(pessoas.error.message);

  const linhasDeOrigem = (origens.data ?? []) as Array<{ view_id: string; pipeline_id: string; position: number }>;
  const linhasDePessoa = (pessoas.data ?? []) as Array<{ view_id: string; user_id: string }>;
  return ((vistas.data ?? []) as Array<{ id: string; name: string; acesso: unknown }>)
    .map((v) => ({
      id: v.id,
      name: v.name,
      acesso: acessoValido(v.acesso),
      origens: linhasDeOrigem
        .filter((o) => o.view_id === v.id)
        .sort((a, b) => a.position - b.position)
        .map((o) => o.pipeline_id),
      pessoas: linhasDePessoa.filter((p) => p.view_id === v.id).map((p) => p.user_id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}
