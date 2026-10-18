/**
 * A DISTRIBUIÇÃO DE DONO LIDA (fork Escale, Fase 1K, D13). Tudo com a sessão
 * de quem pede: a RLS da 9013 deixa gerente ou acima ler; abaixo disso a
 * distribuição vem vazia (e a subaba nem aparece).
 */
import type { createClient } from "@/lib/supabase/server";

import type { PessoaNaDistribuicao } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type ErroDoBanco = { code?: string; message?: string };

export interface DistribuicaoFeita {
  id: string;
  leadId: string;
  titulo: string;
  etapa: string | null;
  userId: string | null;
  em: string;
}

/** O papel de cada membro ATIVO (convite aceito, não revogado); `ids` restringe a busca. */
export async function papeisAtivos(
  supabase: Supabase,
  orgId: string,
  ids?: readonly string[],
): Promise<{ ok: true; papeis: Map<string, string> } | { ok: false; causa: ErroDoBanco }> {
  let q = supabase
    .from("user_organizations")
    .select("user_id, role")
    .eq("organization_id", orgId)
    .not("accepted_at", "is", null)
    .is("revoked_at", null);
  if (ids) q = q.in("user_id", [...ids]);
  const { data, error } = await q;
  if (error) return { ok: false, causa: error };
  return {
    ok: true,
    papeis: new Map(
      ((data ?? []) as Array<{ user_id: string; role: string }>).map((l) => [
        String(l.user_id).toLowerCase(),
        String(l.role),
      ]),
    ),
  };
}

export async function lerDistribuicao(
  supabase: Supabase,
  orgId: string,
  pipelineId: string,
): Promise<
  | {
      ok: true;
      pessoas: PessoaNaDistribuicao[];
      atualizada: { em: string; autorId: string | null } | null;
    }
  | { ok: false; causa: ErroDoBanco }
> {
  const [linhas, ultima] = await Promise.all([
    supabase
      .from("crm_distribuicao_de_dono")
      .select("user_id, percentual, contador, created_at")
      .eq("organization_id", orgId)
      .eq("pipeline_id", pipelineId)
      .order("created_at", { ascending: true }),
    supabase
      .from("crm_distribuicao_alteracoes")
      .select("created_at, autor_id")
      .eq("organization_id", orgId)
      .eq("pipeline_id", pipelineId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (linhas.error) return { ok: false, causa: linhas.error };
  if (ultima.error) return { ok: false, causa: ultima.error };
  const brutas = (linhas.data ?? []) as Array<{
    user_id: string;
    percentual: number | string;
    contador: number | string;
  }>;
  let papeis = new Map<string, string>();
  if (brutas.length > 0) {
    const lidos = await papeisAtivos(
      supabase,
      orgId,
      brutas.map((l) => l.user_id),
    );
    if (!lidos.ok) return lidos;
    papeis = lidos.papeis;
  }
  const u = ((ultima.data ?? []) as Array<{ created_at: string; autor_id: string | null }>)[0];
  return {
    ok: true,
    pessoas: brutas.map((l) => {
      const id = String(l.user_id).toLowerCase();
      return {
        userId: id,
        percentual: Number(l.percentual),
        contador: Number(l.contador),
        papel: papeis.get(id) ?? null,
      };
    }),
    atualizada: u ? { em: u.created_at, autorId: u.autor_id } : null,
  };
}
