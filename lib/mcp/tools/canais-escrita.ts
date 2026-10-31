/**
 * Funil, canais e variáveis do canal por MCP — o que falta para configurar um cliente de ponta a ponta.
 *
 * Quem responde por cada número (`channel_routing_*`) NÃO é gravado aqui de propósito: a função do banco
 * exige sessão humana com MFA e fica em Configurações › Atendimento. A ferramenta de leitura mostra o que a
 * tela configurou.
 */
import { z } from "zod";

import { gravarVariaveisDoCanal } from "@/lib/canais/variaveis-escrita";
import { mesclarVariaveis, type LinhaDeVariavel } from "@/lib/canais/variaveis";
import { responsavelDoCanal } from "@/lib/canais/responsavel";
import { criarFunil } from "@/lib/pipelines/criar-funil";
import { nomesDosAtendentes } from "@/lib/users/nome-do-atendente";

import type { McpToolDefinition } from "../types";

/** A chave PIX e afins são dado financeiro e vão ao contexto de um modelo: devolve só um prefixo. */
const LIMITE_DO_VALOR_NA_LISTA = 40;

const criarFunilShape = {
  name: z.string().min(1).max(80),
  description: z.string().max(280).nullable().optional(),
  stages: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        is_won: z.boolean().optional(),
        is_lost: z.boolean().optional(),
      }),
    )
    .min(2)
    .max(30)
    .optional(),
};

export const crmCreatePipeline: McpToolDefinition<typeof criarFunilShape> = {
  name: "crm_create_pipeline",
  description:
    "Cria um funil de vendas. Sem `stages`, nasce com Novo, Em andamento, Ganho e Perdido. Com `stages`, cria as " +
    "etapas na ordem dada; marque is_won na etapa que fecha o negócio como ganho e is_lost na que fecha como perdido. " +
    "O primeiro funil da organização nasce como padrão.",
  inputSchema: criarFunilShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const r = await criarFunil(ctx.supabase, {
      organizationId: ctx.organizationId,
      nome: input.name,
      descricao: input.description,
      etapas: input.stages,
      actorUserId: ctx.actor.type === "user" ? ctx.actor.id : null,
      requestId: ctx.requestId,
    });
    if (!r.ok) throw new Error(`${r.codigo}: ${r.mensagem}`);
    return { id: r.dado.id, slug: r.dado.slug, padrao: r.dado.isDefault };
  },
};

const listarCanaisShape = {};

interface CanalLido {
  id: string;
  display_name: string | null;
  phone_number: string | null;
  provider: string | null;
  status: string | null;
}

export const crmListChannels: McpToolDefinition<typeof listarCanaisShape> = {
  name: "crm_list_channels",
  description:
    "Lista os números/canais da organização: nome, telefone, provedor, situação, QUEM responde por ele (escolhido em " +
    "Configurações › Atendimento) e as variáveis do canal ({{canal.<chave>}}) com o valor cortado em 40 caracteres.",
  inputSchema: listarCanaisShape,
  category: "read",
  requiresRole: "manager",
  requiresScope: "mcp:read",
  handler: async (_input, ctx) => {
    const { data: canais, error } = await ctx.supabase
      .from("channel_sessions")
      .select("id, display_name, phone_number, provider, status")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: linhas, error: erroDasVariaveis } = await ctx.supabase
      .from("channel_variables")
      .select("channel_session_id, chave, value_text")
      .eq("organization_id", ctx.organizationId);
    if (erroDasVariaveis) throw new Error(erroDasVariaveis.message);

    const lidos = (canais ?? []) as CanalLido[];
    const responsaveis = await Promise.all(
      lidos.map((c) => responsavelDoCanal(ctx.supabase, ctx.organizationId, c.id)),
    );
    const ids = responsaveis.flatMap((r) => (r.tipo === "unico" ? [r.userId] : r.tipo === "varios" ? r.userIds : []));
    const nomes = await nomesDosAtendentes(ids);
    const nomeDe = (id: string): string => nomes.get(id) ?? id.slice(0, 8);

    return {
      canais: lidos.map((c, i) => {
        const r = responsaveis[i]!;
        const variaveis = mesclarVariaveis((linhas ?? []) as LinhaDeVariavel[], c.id);
        return {
          id: c.id,
          nome: c.display_name,
          telefone: c.phone_number,
          provedor: c.provider,
          situacao: c.status,
          responsaveis: r.tipo === "unico" ? [nomeDe(r.userId)] : r.tipo === "varios" ? r.userIds.map(nomeDe) : [],
          variaveis: Object.fromEntries(
            Object.entries(variaveis).map(([chave, valor]) => [
              chave,
              valor.length > LIMITE_DO_VALOR_NA_LISTA ? `${valor.slice(0, LIMITE_DO_VALOR_NA_LISTA)}…` : valor,
            ]),
          ),
        };
      }),
    };
  },
};

const variaveisShape = {
  channel_session_id: z.string().uuid().nullable(),
  valores: z.record(z.string(), z.string()).refine((v) => Object.keys(v).length >= 1 && Object.keys(v).length <= 30, {
    message: "Informe de 1 a 30 variáveis.",
  }),
};

export const crmSetChannelVariables: McpToolDefinition<typeof variaveisShape> = {
  name: "crm_set_channel_variables",
  description:
    "Grava variáveis de um número (ex.: pix_chave, pix_banco, suporte_telefone), usadas como {{canal.pix_chave}} nas " +
    "mensagens automáticas e respostas rápidas. Com channel_session_id=null grava o PADRÃO da organização, que cada " +
    "número pode sobrescrever. Chaves: minúsculas, números e _ (até 40). `nome` e `telefone` são reservadas.",
  inputSchema: variaveisShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  // O valor pode ser dado financeiro (chave PIX): o log da chamada leva só as chaves.
  redigirParaAuditoria: (args) => ({
    ...args,
    valores:
      args.valores && typeof args.valores === "object" ? Object.keys(args.valores as Record<string, unknown>) : [],
  }),
  handler: async (input, ctx) => {
    await gravarVariaveisDoCanal(ctx.supabase, {
      organizationId: ctx.organizationId,
      channelSessionId: input.channel_session_id,
      valores: input.valores,
      requestId: ctx.requestId,
      actorUserId: ctx.actor.type === "user" ? ctx.actor.id : null,
    });
    return { gravadas: Object.keys(input.valores) };
  },
};
