/**
 * POST/GET /api/v1/acoes-em-massa — pedir uma ação em massa sobre contatos e
 * acompanhar as minhas (fork Escale, Fase 2B; migration 9103). O pedido é
 * gerente ou acima (PRD §5). Os contatos são resolvidos pela função invoker com
 * a sessão de quem pede; o consumidor do `event_log` faz o resto. A exportação
 * espera a aprovação de um admin (Q4): o POST devolve o status, e o GET mostra
 * ao admin os pedidos que esperam a decisão dele.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import { temFiltros } from "@/lib/escale/contatos/filtros";
import {
  filtrosDaConsulta,
  fusoDaOrganizacao,
  parametrosDaBusca,
} from "@/lib/escale/contatos/lista";
import {
  VALIDADE_DO_PEDIDO_MS,
  pedidoDeAcaoSchema,
  statusVisivel,
  type AcoesDaPessoa,
  type PedidoParaAprovar,
  type ResumoDaAcao,
  type StatusDaAcao,
} from "@/lib/escale/massa/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/acoes-em-massa";
const DIA_MS = 24 * 60 * 60 * 1000;
/** 7 dias de validade do pedido de exportação + 1 dia para a pessoa ver "Expirada". */
const JANELA_DA_LISTA_MS = 8 * DIA_MS;

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_acoes_em_massa" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const recusa = (texto: string) => fail("unprocessable_entity", t(texto), 422, { requestId });

  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = pedidoDeAcaoSchema.safeParse(corpo.json);
  if (!lido.success) return recusa("Não consegui completar essa ação. Tente de novo.");
  const { acao, alvo, parametros } = lido.data;
  const orgId = authz.org.orgId;

  try {
    const supabase = await createClient();

    if (acao === "criar_negocios") {
      const p = parametros as { pipeline_id: string; stage_id: string };
      const { data: etapa, error: erroDaEtapa } = await supabase
        .from("crm_stages")
        .select("id, pipeline_id, is_archived")
        .eq("id", p.stage_id)
        .eq("organization_id", orgId)
        .maybeSingle();
      // Falha de banco não pode virar "Escolha a origem e a etapa." (a pessoa trocaria de etapa sem resolver nada).
      if (erroDaEtapa) throw erroDaEtapa;
      const e = etapa as { pipeline_id: string; is_archived: boolean } | null;
      if (!e || e.pipeline_id !== p.pipeline_id || e.is_archived)
        return recusa("Escolha a origem e a etapa.");
    }

    let argumentos: Record<string, unknown>;
    if (alvo.tipo === "ids") {
      argumentos = {
        p_ids: alvo.ids,
        p_visao: "todos",
        p_padrao: null,
        p_digitos: null,
        p_cpf_hash: null,
        p_filtros: {},
        p_quantidade: null,
        p_excluidos: null,
      };
    } else {
      const filtros = filtrosDaConsulta({ f: alvo.f });
      if (filtros === null) return recusa("Não consegui completar essa ação. Tente de novo.");
      const busca = parametrosDaBusca(alvo.q);
      if (busca.vazia) return recusa("Nenhum contato selecionado.");
      argumentos = {
        p_ids: null,
        p_visao: alvo.v,
        p_padrao: busca.padrao,
        p_digitos: busca.digitos,
        p_cpf_hash: busca.cpfHash,
        p_filtros: temFiltros(filtros)
          ? compilarFiltros(filtros, await fusoDaOrganizacao(supabase, orgId, authz.org.timezone))
          : {},
        p_quantidade: alvo.quantidade,
        p_excluidos: alvo.excluidos,
      };
    }

    const { data, error } = await supabase.rpc("fn_escale_criar_acao_em_massa", {
      p_org: orgId,
      p_acao: acao,
      p_parametros: parametros,
      ...argumentos,
    });
    if (error) {
      const mensagem = error.message ?? "";
      if (mensagem.includes("acao_em_massa_vazia")) return recusa("Nenhum contato selecionado.");
      if (mensagem.includes("acao_em_massa_grande_demais"))
        return recusa("No máximo 100.000 contatos por ação.");
      return falhaInesperadaDoQuadro(
        error,
        { rota: `POST ${ROTA}`, operacao: "pedir a ação em massa" },
        t,
        requestId,
      );
    }
    const linha = (
      (data ?? []) as Array<{ acao_id: string; quantidade: number; status: StatusDaAcao }>
    )[0];
    if (!linha) return recusa("Nenhum contato selecionado.");
    void audit({
      action: "contacts.bulk_requested",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "crm_acoes_em_massa",
      resourceId: linha.acao_id,
      requestId,
      metadata: {
        acao,
        total: linha.quantidade,
        alvo: alvo.tipo,
        ...(acao === "exportar"
          ? { aprovacao: linha.status === "aguardando_aprovacao" ? "pendente" : "dispensada" }
          : {}),
      },
    });
    return ok(
      { id: linha.acao_id, total: linha.quantidade, status: linha.status },
      { status: 201, requestId },
    );
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `POST ${ROTA}`, operacao: "pedir a ação em massa" },
      t,
      requestId,
    );
  }
}

type LinhaDaAcao = Omit<ResumoDaAcao, "tem_arquivo" | "status"> & {
  status: StatusDaAcao;
  arquivo: string | null;
  expira_em: string | null;
};
type LinhaDoPedido = { id: string; user_id: string; total: number; created_at: string };

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_acoes_em_massa" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  try {
    const supabase = await createClient();
    const agora = Date.now();
    const { data, error } = await supabase
      .from("crm_acoes_em_massa")
      .select("id, acao, status, total, feitos, falhas, arquivo, expira_em, created_at")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .gte("created_at", new Date(agora - JANELA_DA_LISTA_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    const minhas: ResumoDaAcao[] = ((data ?? []) as LinhaDaAcao[]).map(
      ({ arquivo, expira_em, status, ...a }) => ({
        ...a,
        status: statusVisivel(status, a.created_at, agora),
        tem_arquivo:
          Boolean(arquivo) && expira_em !== null && new Date(expira_em).getTime() > agora,
      }),
    );

    // Q4: o admin vê os pedidos de exportação de outras pessoas que esperam a decisão dele.
    let paraAprovar: PedidoParaAprovar[] = [];
    if (authz.org.role === "admin") {
      const pedidos = await supabase
        .from("crm_acoes_em_massa")
        .select("id, user_id, total, created_at")
        .eq("organization_id", orgId)
        .eq("acao", "exportar")
        .eq("status", "aguardando_aprovacao")
        .neq("user_id", userId)
        .gt("created_at", new Date(agora - VALIDADE_DO_PEDIDO_MS).toISOString())
        .order("created_at", { ascending: true })
        .limit(50);
      if (pedidos.error) throw pedidos.error;
      paraAprovar = ((pedidos.data ?? []) as LinhaDoPedido[]).map((p) => ({
        id: p.id,
        solicitante_id: p.user_id,
        total: p.total,
        created_at: p.created_at,
      }));
    }
    const resposta: AcoesDaPessoa = { minhas, para_aprovar: paraAprovar };
    return ok(resposta, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler as ações em massa" },
      t,
      requestId,
    );
  }
}
