import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { camposDaOrganizacao, objetosCitados } from "@/lib/escale/indicadores/campos-da-org";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { chaveDoCache, comCache, TEMPO_DO_CACHE_MS } from "@/lib/escale/indicadores/motor/cache";
import { ErroDoMotor } from "@/lib/escale/indicadores/motor/erros";
import { consultar } from "@/lib/escale/indicadores/motor/executar";
import { comVaga } from "@/lib/escale/indicadores/motor/fila";
import { filtroDoPainelSchema, perguntaSchema, validarPergunta } from "@/lib/escale/indicadores/pergunta";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({ pergunta: perguntaSchema, filtroDoPainel: filtroDoPainelSchema.optional() }).strict();

/**
 * POST /api/v1/indicadores-da-casca/consultar — executa uma pergunta de Indicadores (fork Escale,
 * Fase 7A). A consulta roda com a sessão de quem olha (RLS), com teto de tempo e de linhas.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Pergunta inválida."), 422, {
      requestId,
      details: lido.error.flatten().fieldErrors as Record<string, unknown>,
    });
  }
  if (!process.env.SUPABASE_DB_URL) {
    return fail("upstream_unavailable", t("Os indicadores estão indisponíveis neste ambiente."), 503, { requestId });
  }

  const { pergunta, filtroDoPainel } = lido.data;
  const orgId = authz.org.orgId;
  try {
    const supabase = await createClient();
    const [camposDaOrg, fuso] = await Promise.all([
      camposDaOrganizacao(supabase, orgId, objetosCitados(pergunta, filtroDoPainel)),
      fusoDaOrganizacao(supabase, orgId, authz.org.timezone),
    ]);
    const validada = validarPergunta(pergunta, camposDaOrg);
    if (!validada.ok) {
      return fail("validation_failed", t("Pergunta inválida."), 422, { requestId, details: { erro: validada.erro } });
    }
    const chave = chaveDoCache(orgId, authz.user.id, pergunta, filtroDoPainel);
    const resultado = await comVaga(authz.user.id, () =>
      comCache(chave, TEMPO_DO_CACHE_MS, () =>
        consultar(getRequestPool(), { orgId, userId: authz.user.id, fuso }, pergunta, filtroDoPainel, { camposDaOrg }),
      ),
    );
    return ok(resultado, { requestId });
  } catch (err) {
    if (err instanceof ErroDoMotor) {
      if (err.codigo === "consulta_demorou") {
        return fail("consulta_demorou", t("A consulta demorou mais de 8 segundos. Tente um período menor."), 504, { requestId });
      }
      if (err.codigo === "fila_cheia") {
        return fail("fila_cheia", t("Muitas consultas ao mesmo tempo. Aguarde um instante."), 429, { requestId });
      }
      if (err.codigo === "pergunta_invalida") {
        return fail("validation_failed", t("Pergunta inválida."), 422, { requestId, details: { erro: err.message } });
      }
    }
    logger.error("indicadores.consultar_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Não foi possível consultar os indicadores agora."), 500, { requestId });
  }
}
