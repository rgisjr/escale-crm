/**
 * GET/POST /api/v1/contacts/:id/arquivos — os ARQUIVOS do contato (fork Escale,
 * Fase 1H; C17). GET: qualquer papel (a RLS filtra); a lista nunca devolve o
 * caminho do bucket. POST: agent ou acima, multipart com o campo `file`; o
 * binário vai para o bucket privado pelo service role (não há policy de escrita
 * em storage.objects) e a linha é gravada com a sessão (a RLS exige o autor).
 * Se a linha falhar, o objeto é removido.
 *
 * Nada que decide segurança vem do cliente: a organização vem da sessão, o
 * contato da URL (conferido na organização), o autor da sessão, o tipo (mime)
 * da extensão e o caminho do bucket é montado aqui. O corpo é lido com teto,
 * mesmo sem `content-length`.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  BUCKET_DOS_ARQUIVOS,
  COLUNAS_DO_ARQUIVO,
  MAX_ARQUIVO_BYTES,
  MAX_ARQUIVO_MB,
  caminhoNoBucket,
  mimeDaExtensao,
  nomeSeguro,
  validarArquivo,
  type Arquivo,
} from "@/lib/escale/negocio/arquivos";
import { ehPermissaoNegada } from "@/lib/escale/negocio/notas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;
/** O multipart leva o arquivo mais as bordas do formulário: 1 MB de folga sobre o teto do arquivo. */
const FOLGA_DO_MULTIPART = 1024 * 1024;
const TETO_DO_CORPO = MAX_ARQUIVO_BYTES + FOLGA_DO_MULTIPART;

type Formulario = { tipo: "ok"; form: FormData } | { tipo: "grande" } | { tipo: "invalido" };

/** Lê o corpo aos pedaços e desiste ao passar do teto, com ou sem `content-length`. */
async function lerFormulario(req: NextRequest): Promise<Formulario> {
  const contentType = req.headers.get("content-type");
  if (!req.body || !contentType) return { tipo: "invalido" };
  const leitor = req.body.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > TETO_DO_CORPO) {
        await leitor.cancel().catch(() => undefined);
        return { tipo: "grande" };
      }
      pedacos.push(value);
    }
    const form = await new Response(Buffer.concat(pedacos), {
      headers: { "content-type": contentType },
    }).formData();
    return { tipo: "ok", form };
  } catch {
    return { tipo: "invalido" };
  }
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_arquivos_do_contato" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Contato não encontrado."), 404, { requestId });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_arquivos_do_contato")
    .select(COLUNAS_DO_ARQUIVO)
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("arquivos.listar", { requestId, error: error.message });
    return fail("internal_error", t("Não consegui carregar os arquivos."), 500, { requestId });
  }
  return ok((data ?? []) as Arquivo[], { requestId });
}

export async function POST(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_arquivos_do_contato" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Contato não encontrado."), 404, { requestId });

  const demasiado = () =>
    fail(
      "payload_too_large",
      t("O arquivo {fileName} excede o limite de {maxMb} MB.")
        .replace("{fileName}", "")
        .replace("{maxMb}", String(MAX_ARQUIVO_MB)),
      413,
      { requestId },
    );

  // Barreira barata antes de ler o corpo; a leitura limitada cobre o corpo sem o cabeçalho.
  if (Number(req.headers.get("content-length") ?? 0) > TETO_DO_CORPO) return demasiado();

  const lido = await lerFormulario(req);
  if (lido.tipo === "grande") return demasiado();
  const campo = lido.tipo === "ok" ? lido.form.get("file") : null;
  if (!(campo instanceof File)) {
    return fail("invalid_request", t("Envie o arquivo no campo file."), 400, { requestId });
  }

  const nome = nomeSeguro(campo.name);
  const validacao = validarArquivo({ nome, tamanho: campo.size });
  if (!validacao.ok) {
    const status = validacao.erro.startsWith("O arquivo")
      ? 413
      : validacao.erro.startsWith("Tipo")
        ? 415
        : 422;
    const codigo =
      status === 413
        ? "payload_too_large"
        : status === 415
          ? "unsupported_media_type"
          : "validation_failed";
    return fail(
      codigo,
      t(validacao.erro).replace("{fileName}", nome).replace("{maxMb}", String(MAX_ARQUIVO_MB)),
      status,
      { requestId },
    );
  }

  const supabase = await createClient();
  const { data: contato } = await supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!contato) return fail("not_found", t("Contato não encontrado."), 404, { requestId });

  // O negócio de onde o arquivo foi enviado: precisa ser da organização e deste contato.
  const negocio = req.nextUrl.searchParams.get("negocio");
  let leadId: string | null = null;
  if (negocio) {
    const { data: lead } = uuidValido(negocio)
      ? await supabase
          .from("crm_leads")
          .select("id")
          .eq("organization_id", authz.org.orgId)
          .eq("contact_id", id)
          .eq("id", negocio)
          .maybeSingle()
      : { data: null };
    if (!lead) {
      return fail("not_found", t("Esse negócio não existe ou foi removido"), 404, { requestId });
    }
    leadId = negocio;
  }

  const arquivoId = randomUUID();
  const mime = mimeDaExtensao(validacao.extensao);
  const path = caminhoNoBucket(authz.org.orgId, id, arquivoId, validacao.extensao);
  const admin = createAdminClient();
  const bytes = Buffer.from(await campo.arrayBuffer());
  const subida = await admin.storage
    .from(BUCKET_DOS_ARQUIVOS)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (subida.error) {
    logger.error("arquivos.upload", { requestId, error: subida.error.message });
    return fail("internal_error", t("Erro ao enviar arquivo(s)"), 500, { requestId });
  }

  const { data: linha, error } = await supabase
    .from("crm_arquivos_do_contato")
    .insert({
      id: arquivoId,
      organization_id: authz.org.orgId,
      contact_id: id,
      lead_id: leadId,
      user_id: authz.user.id,
      user_nome: authz.user.full_name ?? null,
      nome,
      extensao: validacao.extensao,
      mime,
      tamanho: campo.size,
      storage_path: path,
    })
    .select(COLUNAS_DO_ARQUIVO)
    .single();
  if (error || !linha) {
    logger.error("arquivos.gravar", { requestId, error: error?.message });
    // A linha não entrou: o binário não pode ficar solto no bucket.
    const limpeza = await admin.storage.from(BUCKET_DOS_ARQUIVOS).remove([path]);
    if (limpeza.error) {
      logger.error("arquivos.limpar_objeto_orfao", {
        requestId,
        storage_path: path,
        error: limpeza.error.message,
      });
    }
    if (ehPermissaoNegada(error)) {
      return fail("forbidden", t("Você não tem permissão para enviar arquivos."), 403, {
        requestId,
      });
    }
    return fail("internal_error", t("Erro ao enviar arquivo(s)"), 500, { requestId });
  }

  void audit({
    action: "contact.file_added",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_arquivos_do_contato",
    resourceId: arquivoId,
    requestId,
    // Sem o nome do arquivo (pode ser dado pessoal): o id da linha já o identifica.
    metadata: {
      contact_id: id,
      lead_id: leadId,
      extensao: validacao.extensao,
      tamanho: campo.size,
    },
  });
  return ok(linha as Arquivo, { requestId, status: 201 });
}
