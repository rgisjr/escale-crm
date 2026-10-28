import { randomUUID } from "node:crypto";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { CATALOGO } from "@/lib/escale/indicadores/catalogo";
import { camposDaOrganizacao, OBJETOS_COM_CAMPOS } from "@/lib/escale/indicadores/campos-da-org";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/indicadores-da-casca/catalogo — o catálogo de Indicadores para o editor de gráficos
 * (fork Escale, Fase 7A). Nunca devolve o `sql`: o navegador só conhece ids e textos.
 */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  try {
    const campos = await camposDaOrganizacao(await createClient(), authz.org.orgId, OBJETOS_COM_CAMPOS);
    const camposPersonalizados = Object.fromEntries(
      OBJETOS_COM_CAMPOS.map((objeto) => [objeto, [...campos.values()].filter((c) => c.objeto === objeto)]),
    );
    const assuntos = CATALOGO.map((a) => ({
      id: a.id,
      nome: a.nome,
      categoria: a.categoria,
      umaLinhaPor: a.umaLinhaPor,
      perguntas: a.perguntas,
      medidas: a.medidas.map((m) => ({
        id: m.id,
        nome: m.nome,
        unidade: m.unidade,
        descricao: m.descricao,
        apelidos: m.apelidos,
        perguntas: m.perguntas,
        antesDeUsar: m.antesDeUsar ?? null,
      })),
      variaveis: a.dimensoes.map((d) => ({
        id: d.id,
        nome: d.nome,
        tipo: d.tipo,
        opcoes: d.opcoes ?? null,
        descricao: d.descricao ?? null,
        // Só o aviso de que existe; o fragmento SQL nunca sai.
        ordemNatural: Boolean(d.ordemNatural),
      })),
      tempos: a.tempos.map((x) => ({ id: x.id, nome: x.nome, padrao: Boolean(x.padrao), descricao: x.descricao ?? null })),
      filtroDoPainel: Object.keys(a.filtroDoPainel),
      camposPersonalizados: Object.keys(a.camposPersonalizados),
      colunasDoDetalhamento: a.colunasDoDetalhamento.map((c) => ({ chave: c.chave, nome: c.nome })),
    }));
    const resposta = ok({ assuntos, camposPersonalizados }, { requestId });
    resposta.headers.set("Cache-Control", "private, max-age=60");
    return resposta;
  } catch (err) {
    logger.error("indicadores.catalogo_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Não foi possível consultar os indicadores agora."), 500, { requestId });
  }
}
