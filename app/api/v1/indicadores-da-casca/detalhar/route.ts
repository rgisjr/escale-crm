import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { camposDaOrganizacao, objetosCitados } from "@/lib/escale/indicadores/campos-da-org";
import { chaveDoCache, comCache, TEMPO_DO_CACHE_MS } from "@/lib/escale/indicadores/motor/cache";
import { ErroDoMotor } from "@/lib/escale/indicadores/motor/erros";
import { detalhar } from "@/lib/escale/indicadores/motor/executar";
import { comVaga } from "@/lib/escale/indicadores/motor/fila";
import { detalhamentoSchema, validarDetalhamento } from "@/lib/escale/indicadores/pergunta";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/indicadores-da-casca/detalhar — uma página do detalhamento de um gráfico (fork
 * Escale, Fase 7E): a mesma pergunta sem agregação, com a sessão de quem olha (RLS).
 */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = detalhamentoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Falha na validação dos dados!"), 422, {
      requestId,
      details: lido.error.flatten().fieldErrors as Record<string, unknown>,
    });
  }
  if (!process.env.SUPABASE_DB_URL) {
    return fail("upstream_unavailable", t("Os indicadores estão indisponíveis neste ambiente."), 503, { requestId });
  }
  const pedido = lido.data;
  const orgId = authz.org.orgId;
  try {
    const supabase = await createClient();
    const [camposDaOrg, fuso] = await Promise.all([
      camposDaOrganizacao(supabase, orgId, objetosCitados(pedido)),
      fusoDaOrganizacao(supabase, orgId, authz.org.timezone),
    ]);
    const validado = validarDetalhamento(pedido, camposDaOrg);
    if (!validado.ok) {
      const mensagem = validado.semDetalhe ? t("Essa métrica ainda não suporta detalhamento.") : t("Pergunta inválida.");
      return fail("validation_failed", mensagem, 422, { requestId, details: { erro: validado.erro } });
    }
    const chave = chaveDoCache(orgId, authz.user.id, pedido, null);
    const pagina = await comVaga(authz.user.id, () =>
      comCache(chave, TEMPO_DO_CACHE_MS, () =>
        detalhar(getRequestPool(), { orgId, userId: authz.user.id, fuso }, pedido, { camposDaOrg }),
      ),
    );
    return ok({ ...pagina, pagina: pedido.pagina, porPagina: pedido.porPagina, fuso }, { requestId });
  } catch (err) {
    if (err instanceof ErroDoMotor) {
      if (err.codigo === "consulta_demorou") {
        return fail("consulta_demorou", t("A consulta demorou mais de 8 segundos. Tente um período menor."), 504, { requestId });
      }
      if (err.codigo === "fila_cheia") {
        return fail("fila_cheia", t("Muitas consultas ao mesmo tempo. Aguarde um instante."), 429, { requestId });
      }
      if (err.codigo === "sem_detalhamento") {
        return fail("validation_failed", t("Essa métrica ainda não suporta detalhamento."), 422, { requestId });
      }
      if (err.codigo === "pergunta_invalida") {
        return fail("validation_failed", t("Pergunta inválida."), 422, { requestId, details: { erro: err.message } });
      }
    }
    logger.error("indicadores.detalhar_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Não foi possível consultar os indicadores agora."), 500, { requestId });
  }
}
