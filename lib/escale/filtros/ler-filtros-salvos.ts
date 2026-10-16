import type { createClient } from "@/lib/supabase/server";

import type { AlvoDoFiltro, FiltroSalvo } from "./filtros-salvos";
import { filtrosDoQuadroSchema } from "./tipos";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Os filtros salvos de UM alvo que a pessoa vê: os dela e os compartilhados.
 * Quem vê o compartilhado é a RLS (migration 9004, com a sessão de quem olha); o
 * filtro "meu ou compartilhado" aqui é defesa, a mesma pergunta da policy. O
 * critério que não passa no schema de hoje (versão antiga) some da lista em vez
 * de quebrar a tela. LANÇA no erro do banco.
 */
export async function lerFiltrosSalvos(
  supabase: Supabase,
  orgId: string,
  userId: string,
  alvo: AlvoDoFiltro,
): Promise<FiltroSalvo[]> {
  const { data, error } = await supabase
    .from("crm_filtros_salvos")
    .select("id, user_id, nome, compartilhado, criterios")
    .eq("organization_id", orgId)
    .eq(alvo.tipo === "origem" ? "pipeline_id" : "view_id", alvo.id);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string; user_id: string; nome: string; compartilhado: boolean; criterios: unknown }>)
    .filter((r) => r.user_id === userId || r.compartilhado)
    .flatMap((r) => {
      const criterios = filtrosDoQuadroSchema.safeParse(r.criterios);
      return criterios.success
        ? [{ id: r.id, nome: r.nome, compartilhado: r.compartilhado, meu: r.user_id === userId, criterios: criterios.data }]
        : [];
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

/**
 * As linhas CRUAS (id + nome) dos filtros DA PESSOA num alvo — sem passar pelo
 * schema dos critérios. É o que conta para o limite de 20 e para o nome
 * repetido: uma linha de critérios que o schema de hoje não aceita some da
 * lista, mas continua existindo (e valendo para o índice e para o trigger do
 * banco). LANÇA no erro do banco.
 */
export async function lerMeusFiltrosCrus(
  supabase: Supabase,
  orgId: string,
  userId: string,
  alvo: AlvoDoFiltro,
): Promise<Array<{ id: string; nome: string }>> {
  const { data, error } = await supabase
    .from("crm_filtros_salvos")
    .select("id, nome")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq(alvo.tipo === "origem" ? "pipeline_id" : "view_id", alvo.id);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; nome: string }>;
}

/** A origem ou a visualização existe e a pessoa a vê (RLS)? LANÇA no erro do banco. */
export async function alvoExiste(supabase: Supabase, orgId: string, alvo: AlvoDoFiltro): Promise<boolean> {
  const tabela = alvo.tipo === "origem" ? "crm_pipelines" : "crm_pipeline_views";
  const { data, error } = await supabase.from(tabela).select("id").eq("organization_id", orgId).eq("id", alvo.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

export interface LinhaDoMeuFiltro {
  id: string;
  pipeline_id: string | null;
  view_id: string | null;
  nome: string;
}

/** O filtro `id` SE for da pessoa (de outra pessoa = nulo). LANÇA no erro do banco. */
export async function meuFiltro(supabase: Supabase, orgId: string, userId: string, id: string): Promise<LinhaDoMeuFiltro | null> {
  const { data, error } = await supabase
    .from("crm_filtros_salvos")
    .select("id, pipeline_id, view_id, nome")
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LinhaDoMeuFiltro | null) ?? null;
}

export const alvoDaLinha = (l: Pick<LinhaDoMeuFiltro, "pipeline_id" | "view_id">): AlvoDoFiltro =>
  l.pipeline_id ? { tipo: "origem", id: l.pipeline_id } : { tipo: "visualizacao", id: l.view_id as string };
