/**
 * GET/DELETE /api/v1/contacts/:id/arquivos/:arquivoId (fork Escale, Fase 1H; C17).
 *
 * GET: 302 para a URL assinada de 60s. Quem pode ver é a RLS da tabela,
 * consultada com a sessão; o service role só assina depois de a linha voltar e
 * de o caminho gravado estar na pasta da organização. O caminho NÃO é
 * recalculado com o contato da URL: a mescla de contatos troca o `contact_id`
 * da linha e o caminho guarda o contato de quando o arquivo subiu.
 *
 * DELETE: a linha sai com a sessão (a RLS: autor, ou gerente ou acima) e só
 * então o objeto. Se o bucket falhar, o erro volta ao cliente e o caminho solto
 * fica no log (`arquivos.remover_objeto`) para a limpeza; a linha já saiu, e a
 * mutação é auditada mesmo assim.
 */
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  BUCKET_DOS_ARQUIVOS,
  caminhoDaOrganizacao,
  nomeSeguro,
} from "@/lib/escale/negocio/arquivos";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string; arquivoId: string }>;
}
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;
const URL_ASSINADA_SEGUNDOS = 60;

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_arquivos_do_contato" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, arquivoId } = await ctx.params;
  if (!uuidValido(id) || !uuidValido(arquivoId)) {
    return fail("not_found", t("Arquivo não encontrado."), 404, { requestId });
  }

  const supabase = await createClient();
  const { data: linha } = await supabase
    .from("crm_arquivos_do_contato")
    .select("nome, storage_path")
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .eq("id", arquivoId)
    .maybeSingle();
  if (!linha) return fail("not_found", t("Arquivo não encontrado."), 404, { requestId });
  if (!caminhoDaOrganizacao(linha.storage_path, authz.org.orgId)) {
    logger.error("arquivos.caminho_fora_da_organizacao", { requestId, arquivo_id: arquivoId });
    return fail("not_found", t("Arquivo não encontrado."), 404, { requestId });
  }

  const { data, error } = await createAdminClient()
    .storage.from(BUCKET_DOS_ARQUIVOS)
    .createSignedUrl(linha.storage_path, URL_ASSINADA_SEGUNDOS, {
      download: nomeSeguro(linha.nome),
    });
  if (error || !data?.signedUrl) {
    logger.error("arquivos.assinar", { requestId, error: error?.message });
    return fail("internal_error", t("Não consegui abrir o arquivo."), 500, { requestId });
  }
  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "private, no-store", "X-Request-Id": requestId },
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_arquivos_do_contato" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, arquivoId } = await ctx.params;
  if (!uuidValido(id) || !uuidValido(arquivoId)) {
    return fail("not_found", t("Arquivo não encontrado."), 404, { requestId });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_arquivos_do_contato")
    .delete()
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .eq("id", arquivoId)
    .select("storage_path");
  if (error) {
    logger.error("arquivos.excluir", { requestId, error: error.message });
    return fail("internal_error", t("Erro ao excluir arquivo"), 500, { requestId });
  }
  if (!data || data.length === 0) {
    return fail("not_found", t("Arquivo não encontrado."), 404, { requestId });
  }

  const caminho = String((data[0] as { storage_path: string }).storage_path);
  let objetoRemovido = false;
  if (!caminhoDaOrganizacao(caminho, authz.org.orgId)) {
    logger.error("arquivos.remover_objeto", {
      requestId,
      storage_path: caminho,
      error: "caminho fora da pasta da organização; objeto não removido",
    });
  } else {
    const { error: erroDoBucket } = await createAdminClient()
      .storage.from(BUCKET_DOS_ARQUIVOS)
      .remove([caminho]);
    objetoRemovido = !erroDoBucket;
    if (erroDoBucket) {
      logger.error("arquivos.remover_objeto", {
        requestId,
        storage_path: caminho,
        error: erroDoBucket.message,
      });
    }
  }

  void audit({
    action: "contact.file_removed",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_arquivos_do_contato",
    resourceId: arquivoId,
    requestId,
    metadata: { contact_id: id, objeto_removido: objetoRemovido },
  });
  if (!objetoRemovido) {
    return fail("internal_error", t("Erro ao excluir arquivo"), 500, { requestId });
  }
  return noContent(requestId);
}
