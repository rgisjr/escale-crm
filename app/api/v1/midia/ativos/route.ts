import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { TAMANHO_MAXIMO_DO_ATIVO } from "@/lib/midia/ativos";
import { listarAtivos, subirAtivoDeArquivo } from "@/lib/midia/ativos-banco";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const TETO_POR_USUARIO = 20;
const JANELA_SEGUNDOS = 600;

/** Motivo do domínio → [status, frase para a pessoa]. */
const RECUSAS: Record<string, [number, string]> = {
  audio_precisa_ser_ogg_opus: [415, "Áudio precisa ser .ogg (opus)."],
  tipo_nao_aceito: [415, "Use áudio .ogg, imagem JPG/PNG/WebP, vídeo MP4 ou PDF."],
  ativo_vazio: [422, "O arquivo está vazio."],
  ativo_grande_demais: [413, "O arquivo passa de 16 MB."],
};

/** A biblioteca de mídia da organização, para quem monta respostas rápidas e escolhe o anexo. */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "org_media_assets" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  try {
    const ativos = await listarAtivos(createAdminClient(), authz.org.orgId);
    return ok(ativos, { requestId });
  } catch (err) {
    logger.error("[midia/ativos] listagem falhou", { error: (err as Error).message, requestId });
    return fail("internal_error", t("Não foi possível listar os arquivos."), 500, { requestId });
  }
}

/** Sobe um arquivo (multipart `file`) para a biblioteca da organização. */
export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "org_media_assets" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const limite = await checkRateLimit(`midia-ativos:${authz.user.id}`, TETO_POR_USUARIO, JANELA_SEGUNDOS);
  if (!limite.allowed) {
    return fail("rate_limited", t("Muitos arquivos seguidos. Tente em alguns minutos."), 429, {
      requestId,
      headers: { "Retry-After": String(JANELA_SEGUNDOS) },
    });
  }

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("file");
  if (!(arquivo instanceof File)) {
    return fail("validation_failed", t("Envie o arquivo no campo 'file'."), 422, { requestId });
  }
  if (arquivo.size > TAMANHO_MAXIMO_DO_ATIVO) {
    return fail("payload_too_large", t(RECUSAS.ativo_grande_demais![1]), 413, { requestId });
  }

  try {
    const ativo = await subirAtivoDeArquivo(createAdminClient(), {
      organizationId: authz.org.orgId,
      nome: arquivo.name || "arquivo",
      bytes: new Uint8Array(await arquivo.arrayBuffer()),
      mime: arquivo.type,
      requestId,
      actorUserId: authz.user.id,
    });
    return ok(ativo, { requestId, status: 201 });
  } catch (err) {
    const recusa = RECUSAS[(err as Error).message];
    if (recusa) return fail("validation_failed", t(recusa[1]), recusa[0], { requestId });
    logger.error("[midia/ativos] upload falhou", { error: (err as Error).message, requestId });
    return fail("internal_error", t("Não foi possível guardar o arquivo."), 500, { requestId });
  }
}
