/**
 * GET/POST /api/v1/filtros-salvos — os FILTROS SALVOS do quadro de uma origem ou
 * de uma visualização (fork Escale, Fase 1D).
 *
 * Qualquer papel lista e salva os próprios filtros (decisão de 15/10); quem vê os
 * compartilhados é a RLS. O `id` vem da tela (uuid novo), para ela já marcar o
 * filtro como aplicado. `organization_id` e `user_id` saem da sessão, nunca do
 * corpo. Até 20 filtros por pessoa em cada origem ou visualização.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  FILTROS_SALVOS_MAX,
  nomeRepetido,
  validarNomeDoFiltro,
  type AlvoDoFiltro,
} from "@/lib/escale/filtros/filtros-salvos";
import { alvoExiste } from "@/lib/escale/filtros/ler-filtros-salvos";
import {
  alvoDaBusca,
  falhaDaGravacaoDoFiltro,
  falhaInesperada,
  meusFiltrosCrusOuFalha,
  responderComFiltrosSalvos,
} from "@/lib/escale/filtros/respostas";
import { filtrosDoQuadroSchema } from "@/lib/escale/filtros/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/filtros-salvos";
const POST_ONDE = {
  ler: { rota: `POST ${ROTA}`, operacao: "ler meus filtros" },
  reler: { rota: `POST ${ROTA}`, operacao: "reler a lista" },
};

const corpoSchema = z
  .object({
    id: z.string().uuid(),
    origem: z.string().uuid().optional(),
    visualizacao: z.string().uuid().optional(),
    nome: z.string().max(200),
    compartilhado: z.boolean(),
    criterios: filtrosDoQuadroSchema,
  })
  .strict()
  .refine((b) => (b.origem === undefined) !== (b.visualizacao === undefined));

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_salvos" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const alvo = alvoDaBusca(req.nextUrl.searchParams);
  if (!alvo) {
    return fail("unprocessable_entity", t("Diga de qual origem ou visualização são os filtros."), 422, { requestId });
  }
  return responderComFiltrosSalvos(await createClient(), authz.org.orgId, authz.user.id, alvo, requestId, t, { rota: `GET ${ROTA}`, operacao: "listar" });
}

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_salvos" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const userId = authz.user.id;

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const nome = validarNomeDoFiltro(parsed.data.nome);
  if (!nome.ok) return fail("unprocessable_entity", t(nome.erro), 422, { requestId });
  const alvo: AlvoDoFiltro = parsed.data.origem
    ? { tipo: "origem", id: parsed.data.origem }
    : { tipo: "visualizacao", id: parsed.data.visualizacao as string };

  const supabase = await createClient();
  let existe: boolean;
  try {
    existe = await alvoExiste(supabase, orgId, alvo);
  } catch (err) {
    return falhaInesperada(err as Error, { rota: `POST ${ROTA}`, operacao: "conferir origem ou visualização" }, t, requestId);
  }
  if (!existe) return fail("not_found", t("Origem ou visualização não encontrada."), 404, { requestId });

  // Linhas CRUAS: um filtro de critérios que o schema não aceita mais some da lista, mas conta.
  const atuais = await meusFiltrosCrusOuFalha(supabase, orgId, userId, alvo, requestId, t, POST_ONDE.ler);
  if (!atuais.ok) return atuais.resposta;
  const meus = atuais.filtros;
  if (nomeRepetido(nome.nome, meus)) {
    return fail("state_conflict", t("Você já tem um filtro com esse nome aqui."), 409, { requestId });
  }
  if (meus.length >= FILTROS_SALVOS_MAX) {
    return fail("unprocessable_entity", t("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro."), 422, { requestId });
  }

  const { error } = await supabase.from("crm_filtros_salvos").insert({
    id: parsed.data.id,
    organization_id: orgId,
    user_id: userId,
    pipeline_id: alvo.tipo === "origem" ? alvo.id : null,
    view_id: alvo.tipo === "visualizacao" ? alvo.id : null,
    nome: nome.nome,
    compartilhado: parsed.data.compartilhado,
    criterios: parsed.data.criterios,
  });
  if (error) return falhaDaGravacaoDoFiltro(error, t, requestId, { rota: `POST ${ROTA}`, operacao: "inserir" });

  void audit({
    action: "pipeline_filter.created",
    actorUserId: userId,
    organizationId: orgId,
    resourceType: "crm_filtro_salvo",
    resourceId: parsed.data.id,
    requestId,
    metadata: { alvo: alvo.tipo, compartilhado: parsed.data.compartilhado },
  });

  return responderComFiltrosSalvos(supabase, orgId, userId, alvo, requestId, t, POST_ONDE.reler, 201);
}
