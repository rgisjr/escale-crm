import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { camposDaOrganizacao, objetosCitados } from "@/lib/escale/indicadores/campos-da-org";
import { lerOpcoesDaDimensao } from "@/lib/escale/indicadores/editor/opcoes-da-dimensao";
import { chaveDoCache, comCache, TEMPO_DO_CACHE_MS } from "@/lib/escale/indicadores/motor/cache";
import { ErroDoMotor } from "@/lib/escale/indicadores/motor/erros";
import { consultar } from "@/lib/escale/indicadores/motor/executar";
import { comVaga } from "@/lib/escale/indicadores/motor/fila";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const dimensaoSchema = z
  .string()
  .regex(/^[a-z_]+\.[a-z_0-9]+$|^campo:(negocio|contato|empresa):[a-z][a-z0-9_]{0,39}$/)
  .max(80);

/**
 * GET /api/v1/indicadores-da-casca/opcoes?dimensao=<id> — as opções do seletor múltiplo do filtro do editor
 * (fork Escale, Fase 7D). Gerente para cima: só o editor usa.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = dimensaoSchema.safeParse(req.nextUrl.searchParams.get("dimensao"));
  if (!lido.success) return fail("validation_failed", t("Pergunta inválida."), 422, { requestId });
  if (!process.env.SUPABASE_DB_URL) {
    return fail("upstream_unavailable", t("Os indicadores estão indisponíveis neste ambiente."), 503, { requestId });
  }

  const orgId = authz.org.orgId;
  try {
    const supabase = await createClient();
    const [camposDaOrg, fuso] = await Promise.all([
      camposDaOrganizacao(supabase, orgId, objetosCitados(lido.data)),
      fusoDaOrganizacao(supabase, orgId, authz.org.timezone),
    ]);
    const opcoes = await lerOpcoesDaDimensao(lido.data, {
      supabase,
      orgId,
      camposDaOrg,
      semNome: t("Sem nome"),
      consultar: (pergunta) =>
        comVaga(authz.user.id, () =>
          comCache(
            chaveDoCache(orgId, authz.user.id, pergunta, undefined),
            TEMPO_DO_CACHE_MS,
            () => consultar(getRequestPool(), { orgId, userId: authz.user.id, fuso }, pergunta, undefined, { camposDaOrg }),
            Date.now,
            false,
          ),
        ),
    });
    if (!opcoes) return fail("not_found", t("Campo não encontrado."), 404, { requestId });
    const resposta = ok({ opcoes }, { requestId });
    resposta.headers.set("Cache-Control", "private, max-age=60");
    return resposta;
  } catch (err) {
    if (err instanceof ErroDoMotor) {
      if (err.codigo === "consulta_demorou") {
        return fail("consulta_demorou", t("A consulta demorou mais de 8 segundos. Tente um período menor."), 504, { requestId });
      }
      if (err.codigo === "fila_cheia") {
        return fail("fila_cheia", t("Muitas consultas ao mesmo tempo. Aguarde um instante."), 429, { requestId });
      }
    }
    logger.error("indicadores.opcoes_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Não foi possível consultar os indicadores agora."), 500, { requestId });
  }
}
