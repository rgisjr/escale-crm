/**
 * GET /api/v1/acoes-em-massa/[id]/arquivo — baixar a exportação (fork Escale,
 * Fase 2B). Só quem pediu (a RLS e o `user_id` da sessão), só antes de vencer
 * (24 h). Responde 302 para uma URL assinada de 60 s, gerada pelo service role
 * (o bucket não tem policy), e audita o download.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { BUCKET_DAS_EXPORTACOES } from "@/lib/escale/massa/tipos";
import { traduzir } from "@/lib/i18n/dicionario";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALIDADE_DA_URL_S = 60;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_acoes_em_massa" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  const expirou = () =>
    fail("not_found", t("A exportação expirou. Exporte de novo."), 404, { requestId });
  if (!z.string().uuid().safeParse(id).success) return expirou();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crm_acoes_em_massa")
      .select("arquivo, expira_em")
      .eq("id", id)
      .eq("organization_id", authz.org.orgId)
      .eq("user_id", authz.user.id)
      .maybeSingle();
    if (error) throw error;
    const linha = data as { arquivo: string | null; expira_em: string | null } | null;
    if (!linha?.arquivo || !linha.expira_em || new Date(linha.expira_em).getTime() <= Date.now())
      return expirou();
    const nome = linha.arquivo.split("/").pop() ?? "contatos.csv";
    const assinada = await createAdminClient()
      .storage.from(BUCKET_DAS_EXPORTACOES)
      .createSignedUrl(linha.arquivo, VALIDADE_DA_URL_S, { download: nome });
    if (assinada.error || !assinada.data?.signedUrl) return expirou();
    void audit({
      action: "contacts.export_downloaded",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_acoes_em_massa",
      resourceId: id,
      requestId,
      metadata: {},
    });
    return Response.redirect(assinada.data.signedUrl, 302);
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/acoes-em-massa/[id]/arquivo", operacao: "baixar a exportação" },
      t,
      requestId,
    );
  }
}
