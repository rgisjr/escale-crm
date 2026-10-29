import { randomUUID } from "node:crypto";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerTemplatesDaOrganizacao } from "@/lib/escale/indicadores/modelos/banco";
import { MODELOS_DO_SISTEMA } from "@/lib/escale/indicadores/modelos/sistema";
import type { ModeloNaLista } from "@/lib/escale/indicadores/modelos/tipos";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/indicadores-da-casca/modelos — os modelos da Escale (em código) e os templates da
 * organização (fork Escale, Fase 7F). Gerente para cima: o modal "Novo dashboard" é deles.
 */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  try {
    const sistema: ModeloNaLista[] = MODELOS_DO_SISTEMA.map((m) => ({
      origem: "sistema",
      id: m.id,
      nome: t(m.nome),
      cor: m.cor,
      icone: m.icone,
      graficos: m.graficos.length,
    }));
    const organizacao = await lerTemplatesDaOrganizacao(await createClient(), authz.org.orgId);
    const resposta = ok({ modelos: [...sistema, ...organizacao] }, { requestId });
    resposta.headers.set("Cache-Control", "private, max-age=30");
    return resposta;
  } catch (err) {
    logger.error("indicadores.modelos_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
