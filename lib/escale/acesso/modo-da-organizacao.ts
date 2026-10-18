import { DEFAULT_VISIBILITY_MODE, type VisibilityMode } from "@/lib/auth/types";
import { VISUALIZACOES } from "@/lib/escale/acesso/regras";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A regra de quem vê os negócios DA ORGANIZAÇÃO (`organizations.settings.visibility_mode`).
 *
 * `authz.org.visibility_mode` só é preenchido pelo layout de `/app`; nas rotas
 * ele vem vazio, e a 1F mostrava sempre o padrão (defeito corrigido na 1J, N10).
 * Lê com o service role, como `POST /api/v1/leads`: a organização é a da
 * sessão, e a leitura não amplia acesso (a RLS de `crm_leads` lê o mesmo modo
 * e decide). Falhou a leitura, vale o padrão e fica o registro.
 */
export async function modoDaOrganizacao(orgId: string, requestId: string): Promise<VisibilityMode> {
  const { data, error } = await createAdminClient()
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();
  if (error) {
    logger.error("escale.acesso: leitura do modo da organização falhou; vale o padrão", {
      requestId,
      orgId,
      error: error.message,
    });
    return DEFAULT_VISIBILITY_MODE;
  }
  const modo = (data?.settings as { visibility_mode?: unknown } | null)?.visibility_mode;
  return typeof modo === "string" && (VISUALIZACOES as readonly string[]).includes(modo)
    ? (modo as VisibilityMode)
    : DEFAULT_VISIBILITY_MODE;
}
