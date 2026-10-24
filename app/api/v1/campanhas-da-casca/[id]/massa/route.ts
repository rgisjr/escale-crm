import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  novaCampanhaComContatosAcao,
  tirarDaListaAcao,
} from "@/lib/escale/campanhas/detalhe/acoes";
import { ehIdDeCampanha, lerSelecaoDaCampanha } from "@/lib/escale/campanhas/detalhe/banco";
import {
  compilarFiltrosDeDestinatarios,
  filtrosDeDestinatariosDoTexto,
} from "@/lib/escale/campanhas/detalhe/filtros";
import { pedidoDaCampanhaSchema, type RespostaDaMassa } from "@/lib/escale/campanhas/detalhe/massa";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/campanhas-da-casca/:id/massa — as ações da seleção nos Detalhes
 * (fork Escale, Fase 8C; N11). Gerente. A seleção é resolvida pela 9310 com a
 * sessão de quem pede; tag e negócio vão para a fila da 2B (a mesma rotina da
 * lista de contatos: eventos, auditoria, automações pelo `tag_added`); criar
 * campanha e tirar da lista mexem na campanha pelo client admin.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const recusa = (texto: string) => fail("unprocessable_entity", t(texto), 422, { requestId });
  const { id } = await ctx.params;
  if (!ehIdDeCampanha(id))
    return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });

  const lido = pedidoDaCampanhaSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return recusa("Não consegui completar essa ação. Tente de novo.");
  const pedido = lido.data;
  const filtros = pedido.alvo.tipo === "filtro" ? filtrosDeDestinatariosDoTexto(pedido.alvo.f) : {};
  if (filtros === null) return recusa("Filtro inválido.");
  const orgId = authz.org.orgId;

  try {
    const supabase = await createClient();
    const selecao = await lerSelecaoDaCampanha(supabase, {
      p_org: orgId,
      p_campanha: id,
      p_filtros: pedido.alvo.tipo === "filtro" ? compilarFiltrosDeDestinatarios(filtros) : {},
      p_ids: pedido.alvo.tipo === "ids" ? pedido.alvo.ids : null,
      p_excluidos: pedido.alvo.tipo === "filtro" ? pedido.alvo.excluidos : null,
    });
    const alvos = selecao.map((l) => ({
      destinatarioId: l.destinatario_id,
      contatoId: l.contato_id,
    }));
    if (alvos.length === 0) return recusa("Nenhum contato selecionado.");
    const contatos = [...new Set(alvos.map((a) => a.contatoId))];
    const registrar = (
      action: "campaign.duplicated" | "campaign.recipients_removed" | "contacts.bulk_requested",
      metadata: Record<string, unknown>,
    ) =>
      void audit({
        action,
        actorUserId: authz.user.id,
        organizationId: orgId,
        resourceType: "campaigns",
        resourceId: id,
        requestId,
        metadata,
      });

    if (pedido.acao === "nova_campanha") {
      const r = await novaCampanhaComContatosAcao(
        createAdminClient(),
        orgId,
        id,
        contatos,
        authz.user.id,
      );
      if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
      registrar("campaign.duplicated", {
        copia: r.id,
        contatos: contatos.length,
        a_partir_de: "selecao",
      });
      return ok<RespostaDaMassa>({ tipo: "campanha", id: r.id }, { status: 201, requestId });
    }

    if (pedido.acao === "tirar_da_lista") {
      const r = await tirarDaListaAcao(createAdminClient(), orgId, id, alvos, authz.user.id);
      if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
      registrar("campaign.recipients_removed", { tirados: r.tirados });
      return ok<RespostaDaMassa>({ tipo: "lista", tirados: r.tirados }, { requestId });
    }

    if (pedido.acao === "criar_negocios") {
      const { data: etapa } = await supabase
        .from("crm_stages")
        .select("id, pipeline_id, is_archived")
        .eq("id", pedido.parametros.stage_id)
        .eq("organization_id", orgId)
        .maybeSingle();
      const e = etapa as { pipeline_id: string; is_archived: boolean } | null;
      if (!e || e.pipeline_id !== pedido.parametros.pipeline_id || e.is_archived) {
        return recusa("Escolha a origem e a etapa.");
      }
    }

    const { data: criada, error: erroDaAcao } = await supabase.rpc(
      "fn_escale_criar_acao_em_massa",
      {
        p_org: orgId,
        p_acao: pedido.acao,
        p_parametros: pedido.parametros,
        p_ids: contatos,
        p_visao: "todos",
        p_padrao: null,
        p_digitos: null,
        p_cpf_hash: null,
        p_filtros: {},
        p_quantidade: null,
        p_excluidos: null,
      },
    );
    if (erroDaAcao) {
      const mensagem = erroDaAcao.message ?? "";
      if (mensagem.includes("acao_em_massa_vazia")) return recusa("Nenhum contato selecionado.");
      if (mensagem.includes("acao_em_massa_grande_demais"))
        return recusa("No máximo 100.000 contatos por ação.");
      throw new Error(mensagem);
    }
    const linha = (
      (criada ?? []) as Array<{ acao_id: string; quantidade: number; status: string }>
    )[0];
    if (!linha) return recusa("Nenhum contato selecionado.");
    registrar("contacts.bulk_requested", {
      acao: pedido.acao,
      total: linha.quantidade,
      alvo: "campanha",
    });
    return ok<RespostaDaMassa>(
      { tipo: "acao_em_massa", id: linha.acao_id, total: linha.quantidade, status: linha.status },
      { status: 201, requestId },
    );
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
