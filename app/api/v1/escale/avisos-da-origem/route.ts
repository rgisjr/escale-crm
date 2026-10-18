/**
 * GET /api/v1/escale/avisos-da-origem — as origens que avisam quem pede
 * (fork Escale, Fase 1K, D15): a casca liga o tempo real só com isto. Agente
 * ou acima, com a sessão (só as origens que a pessoa vê, RLS da 1J).
 */
import { randomUUID } from "node:crypto";

import { ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { origensQueAvisam } from "@/lib/escale/notificacoes/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { data, error } = await (
    await createClient()
  )
    .from("crm_pipelines")
    .select("id, name, settings")
    .eq("organization_id", authz.org.orgId)
    .eq("is_archived", false);
  if (error)
    return falhaInesperada(
      error,
      { rota: "GET /api/v1/escale/avisos-da-origem", operacao: "ler" },
      t,
      requestId,
    );
  return ok(
    origensQueAvisam(
      (data ?? []) as Array<{ id: string; name: string; settings: unknown }>,
      authz.user.id,
    ),
    { requestId },
  );
}
