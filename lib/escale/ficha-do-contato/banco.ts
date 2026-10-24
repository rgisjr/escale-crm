import type { SupabaseClient } from "@supabase/supabase-js";

import type { NegocioDoContato } from "./regras";

/** OS NEGÓCIOS DO CONTATO (fork Escale, Fase 2E; N9): lidos com a sessão, a RLS da 1J decide. */
export interface FichaDeNegociosDoContato {
  negocios: NegocioDoContato[];
  /** id → nome das etapas das origens desses negócios (o Histórico usa). */
  etapas: Record<string, string>;
}

type LinhaDoNegocio = {
  id: string;
  title: string;
  status: "open" | "won" | "lost";
  lost_reason: string | null;
  value_cents: number | null;
  currency: string | null;
  owner_user_id: string | null;
  created_at: string;
  pipeline_id: string;
  stage_id: string;
};

export async function negociosDoContato(
  sb: SupabaseClient,
  orgId: string,
  contatoId: string,
): Promise<FichaDeNegociosDoContato | null> {
  const { data: contato } = await sb
    .from("contacts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("id", contatoId)
    .maybeSingle();
  if (!contato) return null;

  const { data, error } = await sb
    .from("crm_leads")
    .select("id, title, status, lost_reason, value_cents, currency, owner_user_id, created_at, pipeline_id, stage_id")
    .eq("organization_id", orgId)
    .eq("contact_id", contatoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const linhas = (data ?? []) as LinhaDoNegocio[];
  if (linhas.length === 0) return { negocios: [], etapas: {} };

  const origens = [...new Set(linhas.map((l) => l.pipeline_id))];
  const donos = [...new Set(linhas.map((l) => l.owner_user_id).filter((d): d is string => !!d))];
  const [pipelines, etapas, perfis] = await Promise.all([
    sb.from("crm_pipelines").select("id, name, is_archived").eq("organization_id", orgId).in("id", origens),
    sb.from("crm_stages").select("id, name").in("pipeline_id", origens),
    donos.length > 0
      ? sb.from("profiles").select("id, full_name").in("id", donos)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [pipelines, etapas, perfis]) if (r.error) throw r.error;

  const origemPorId = new Map(
    ((pipelines.data ?? []) as Array<{ id: string; name: string; is_archived: boolean }>).map((p) => [p.id, p]),
  );
  const etapaPorId = Object.fromEntries(
    ((etapas.data ?? []) as Array<{ id: string; name: string }>).map((e) => [e.id, e.name]),
  );
  const nomeDoDono = new Map(
    ((perfis.data ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name]),
  );

  return {
    etapas: etapaPorId,
    negocios: linhas.map((l) => ({
      id: l.id,
      titulo: l.title,
      origem_id: l.pipeline_id,
      origem_nome: origemPorId.get(l.pipeline_id)?.name ?? "",
      origem_arquivada: !!origemPorId.get(l.pipeline_id)?.is_archived,
      etapa_nome: etapaPorId[l.stage_id] ?? null,
      status: l.status,
      motivo_de_perda: l.lost_reason,
      valor_cents: l.value_cents,
      moeda: l.currency,
      dono_id: l.owner_user_id,
      dono_nome: l.owner_user_id ? (nomeDoDono.get(l.owner_user_id) ?? null) : null,
      criado_em: l.created_at,
    })),
  };
}
