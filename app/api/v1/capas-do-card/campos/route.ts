/**
 * GET /api/v1/capas-do-card/campos — o catálogo dos campos personalizados do
 * NEGÓCIO de todas as origens que a pessoa enxerga (fork Escale, Fase 1E). A
 * janela "Personalizar cards" vale em todas as origens, e o campo mora numa
 * delas (`settings.fields`): com o catálogo ela solta o que foi apagado de todas
 * e mostra, para desligar, o que só existe em outra origem.
 *
 * Qualquer papel (a leitura do quadro é de todos). A RLS de `crm_pipelines` e o
 * filtro de organização limitam as origens; só as chaves e os rótulos dos campos
 * saem daqui, nunca o `settings` inteiro.
 */
import { randomUUID } from "node:crypto";

import { ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { camposDaCapa } from "@/lib/escale/capa/tipos";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const { data, error } = await (
    await createClient()
  )
    .from("crm_pipelines")
    .select("settings")
    .eq("organization_id", authz.org.orgId);
  if (error) {
    return falhaInesperadaDoQuadro(
      error,
      { rota: "GET /api/v1/capas-do-card/campos", operacao: "ler os campos das origens" },
      t,
      requestId,
    );
  }
  const settings = (data ?? []).map(
    (l) => (l as { settings: Record<string, unknown> | null }).settings,
  );
  const campos = camposDaCapa(settings).filter((c) => c.entidade === "negocio");
  return ok({ campos }, { requestId });
}
