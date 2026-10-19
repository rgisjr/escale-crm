/**
 * POST/GET /api/v1/importacoes — criar uma importação de contatos ou negócios e
 * listar as da organização (fork Escale, Fase 2F; migration 9107). Gerente ou
 * acima (PRD §5). O POST é multipart: `arquivo` (o CSV, até 25 MB) e `pedido`
 * (o JSON do assistente). As linhas ficam gravadas e o consumidor do `event_log`
 * importa em segundo plano.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaImportacao, criarImportacao, listarImportacoes } from "@/lib/escale/importacao/banco";
import { ARQUIVO_MAX_BYTES } from "@/lib/escale/importacao/linhas";
import { pedidoDeImportacaoSchema } from "@/lib/escale/importacao/tipos";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/importacoes";

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const recusa = (texto: string) => fail("unprocessable_entity", t(texto), 422, { requestId });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return recusa("Selecione um arquivo .CSV válido.");
  }
  const arquivo = form.get("arquivo");
  const textoDoPedido = form.get("pedido");
  if (!(arquivo instanceof File) || typeof textoDoPedido !== "string") return recusa("Selecione um arquivo .CSV válido.");
  if (arquivo.size > ARQUIVO_MAX_BYTES) return recusa("O arquivo passa de 25 MB.");
  let json: unknown;
  try {
    json = JSON.parse(textoDoPedido);
  } catch {
    return recusa("Não foi possível iniciar a importação.");
  }
  const lido = pedidoDeImportacaoSchema.safeParse(json);
  if (!lido.success) return recusa("Não foi possível iniciar a importação.");

  const orgId = authz.org.orgId;
  try {
    const resultado = await criarImportacao(await createClient(), createAdminClient(), {
      orgId,
      userId: authz.user.id,
      papel: authz.org.role,
      pedido: lido.data,
      nomeDoArquivo: arquivo.name,
      bytes: new Uint8Array(await arquivo.arrayBuffer()),
    });
    void audit({
      action: "contacts.import_started",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "crm_importacao",
      resourceId: resultado.id,
      requestId,
      metadata: { tipo: lido.data.tipo, nivel: lido.data.nivel, total: resultado.total },
    });
    return ok(resultado, { status: 201 });
  } catch (err) {
    if (err instanceof ErroDaImportacao) return recusa(err.message);
    return falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "criar" }, t, requestId);
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const tipoLido = req.nextUrl.searchParams.get("tipo");
  const tipo = tipoLido === "contato" || tipoLido === "negocio" ? tipoLido : "todas";
  const pagina = Math.max(1, Math.min(10_000, Number(req.nextUrl.searchParams.get("p")) || 1));
  try {
    return ok(await listarImportacoes(await createClient(), authz.org.orgId, { tipo, pagina }));
  } catch (err) {
    return falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "listar" }, t, requestId);
  }
}
