import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/negocios-do-contato";
const NEGOCIOS_MAX = 20;

export interface NegocioDoContato {
  id: string;
  pipeline_id: string;
  stage_id: string;
  status: "open" | "won" | "lost";
  updated_at: string;
  origem: { id: string; nome: string; grupo: string | null };
}

type LeadLido = {
  id: string;
  pipeline_id: string;
  stage_id: string;
  status: "open" | "won" | "lost";
  updated_at: string;
};
type OrigemLida = { id: string; name: string; is_archived: boolean; group_id: string | null };
type GrupoLido = { id: string; name: string };

/**
 * OS NEGÓCIOS DO CONTATO DA CONVERSA (fork Escale, Fase 3A; D1, D3). Pela
 * sessão: a RLS de `crm_leads` (visibility_mode e o acesso por origem da 1J)
 * decide o que entra. Abertos primeiro, depois os fechados mais recentes.
 * O negócio escolhido é lido inteiro pelo quadro (`useBoard`), como na ficha.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_leads" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const contactId = lerUuid(req.nextUrl.searchParams.get("contact_id"));
  if (!contactId) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      {
        requestId,
      },
    );
  }
  try {
    const supabase = await createClient();
    const orgId = authz.org.orgId;
    const { data: leads, error } = await supabase
      .from("crm_leads")
      .select("id, pipeline_id, stage_id, status, updated_at")
      .eq("organization_id", orgId)
      .eq("contact_id", contactId)
      .order("updated_at", { ascending: false })
      .limit(NEGOCIOS_MAX * 2);
    if (error) throw error;
    const lidos = (leads ?? []) as LeadLido[];
    const idsDasOrigens = [...new Set(lidos.map((l) => l.pipeline_id))];
    const { data: origens, error: erroOrigens } = idsDasOrigens.length
      ? await supabase
          .from("crm_pipelines")
          .select("id, name, is_archived, group_id")
          .eq("organization_id", orgId)
          .in("id", idsDasOrigens)
      : { data: [], error: null };
    if (erroOrigens) throw erroOrigens;
    const vivas = new Map(
      ((origens ?? []) as OrigemLida[]).filter((o) => !o.is_archived).map((o) => [o.id, o]),
    );
    const idsDosGrupos = [...new Set([...vivas.values()].map((o) => o.group_id).filter(Boolean))];
    const { data: grupos, error: erroGrupos } = idsDosGrupos.length
      ? await supabase
          .from("crm_pipeline_groups")
          .select("id, name")
          .eq("organization_id", orgId)
          .in("id", idsDosGrupos as string[])
      : { data: [], error: null };
    if (erroGrupos) throw erroGrupos;
    const nomeDoGrupo = new Map(((grupos ?? []) as GrupoLido[]).map((g) => [g.id, g.name]));

    const peso = (s: LeadLido["status"]) => (s === "open" ? 0 : 1);
    const resposta: NegocioDoContato[] = lidos
      .filter((l) => vivas.has(l.pipeline_id))
      .sort((a, b) => peso(a.status) - peso(b.status) || b.updated_at.localeCompare(a.updated_at))
      .slice(0, NEGOCIOS_MAX)
      .map((l) => {
        const origem = vivas.get(l.pipeline_id)!;
        return {
          ...l,
          origem: {
            id: origem.id,
            nome: origem.name,
            grupo: origem.group_id ? (nomeDoGrupo.get(origem.group_id) ?? null) : null,
          },
        };
      });
    return ok(resposta, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler os negócios do contato" },
      t,
      requestId,
    );
  }
}
