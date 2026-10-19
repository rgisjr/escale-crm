/**
 * GET /api/v1/importacoes/destinos — as origens que o passo Configurações oferece
 * (fork Escale, Fase 2F): não arquivadas, na ordem do quadro, com o grupo, as
 * etapas abertas e os motivos de perda (sem motivos na origem, os canônicos do
 * original, como a ficha da 1G). Lido com a sessão (a RLS decide). Gerente+.
 */
import { randomUUID } from "node:crypto";

import { ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { motivosDoFunil } from "@/lib/leads/motivos-de-perda-do-funil";
import { CANONICAL_LOST_REASONS, ROTULO_DO_MOTIVO_CANONICO } from "@/lib/schemas/leads";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Etapa = { id: string; name: string; position: number | string; is_archived: boolean; is_won: boolean; is_lost: boolean };
type Origem = { id: string; name: string; group_id: string | null; settings: unknown; crm_stages: Etapa[] | null };

const CANONICOS = CANONICAL_LOST_REASONS.filter((m) => m in ROTULO_DO_MOTIVO_CANONICO).map((m) => ({
  valor: m,
  rotulo: ROTULO_DO_MOTIVO_CANONICO[m as keyof typeof ROTULO_DO_MOTIVO_CANONICO],
}));

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  try {
    const sb = await createClient();
    const orgId = authz.org.orgId;
    const [origens, grupos] = await Promise.all([
      sb
        .from("crm_pipelines")
        .select("id, name, group_id, settings, crm_stages(id, name, position, is_archived, is_won, is_lost)")
        .eq("organization_id", orgId)
        .eq("is_archived", false)
        .order("position", { ascending: true }),
      sb.from("crm_pipeline_groups").select("id, name").eq("organization_id", orgId),
    ]);
    if (origens.error) throw origens.error;
    const nomeDoGrupo = new Map(((grupos.data ?? []) as Array<{ id: string; name: string }>).map((g) => [g.id, g.name]));
    return ok(
      ((origens.data ?? []) as unknown as Origem[]).map((o) => {
        const proprios = motivosDoFunil(o.settings);
        return {
          id: o.id,
          nome: o.name,
          grupo: o.group_id ? (nomeDoGrupo.get(o.group_id) ?? null) : null,
          etapas: [...(o.crm_stages ?? [])]
            .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
            .sort((a, b) => Number(a.position) - Number(b.position))
            .map((s) => ({ id: s.id, nome: s.name })),
          motivos: proprios.length > 0 ? proprios.map((m) => ({ valor: m, rotulo: m })) : CANONICOS,
        };
      }),
    );
  } catch (err) {
    return falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: "/api/v1/importacoes/destinos", operacao: "ler" }, t, requestId);
  }
}
