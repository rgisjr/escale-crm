/**
 * Respostas rápidas por MCP: ler, criar, alterar e apagar.
 *
 * Escrevem pelas MESMAS funções das rotas REST (`lib/escale/conversas/respostas-escrita.ts`). A resposta
 * criada aqui é COMPARTILHADA (sem dono): quem opera pelo MCP não é um atendente com respostas pessoais.
 * O atalho é gravado sem a barra: a tela a mostra com `comBarra`.
 */
import { z } from "zod";

import { lerRespostas } from "@/lib/escale/conversas/respostas-banco";
import { atualizarResposta, criarResposta, excluirResposta } from "@/lib/escale/conversas/respostas-escrita";
import { REFERENCIA_DE_ATIVO } from "@/lib/automation/envio-de-passos";
import { CANAIS_DA_RESPOSTA, respostaSchema, type NovaResposta } from "@/lib/escale/conversas/respostas";

import type { McpContext, McpToolDefinition } from "../types";

const semBarra = (atalho: string): string => atalho.trim().replace(/^\/+/, "");
const idDoAutor = (ctx: McpContext): string | null => (ctx.actor.type === "user" ? ctx.actor.id : null);

function falhou(r: { codigo: string; mensagem: string }): Error {
  return new Error(`${r.codigo}: ${r.mensagem}`);
}

/** A forma que a ferramenta recebe: o que a tela pede, com padrões que servem a quem configura por MCP. */
const camposShape = {
  atalho: z.string().trim().min(1).max(60),
  corpo: z.string().trim().min(1).max(4096),
  canais: z.array(z.enum(CANAIS_DA_RESPOSTA)).min(1).optional(),
  /** Vazio ou ausente = vale para todos os setores. Para restringir a uma pessoa, crie um setor só dela em Configurações. */
  setores: z.array(z.string().uuid()).max(100).optional(),
  /** Áudio, imagem ou arquivo que sai junto do texto: `asset` é um id de crm_upload_media_asset ou `var:<chave>` (o do número da conversa). */
  anexo: z.object({ asset: z.string().regex(REFERENCIA_DE_ATIVO) }).nullable().optional(),
};

function montarResposta(campos: {
  atalho: string;
  corpo: string;
  canais?: NovaResposta["canais"];
  setores?: string[];
  anexo?: NovaResposta["anexo"];
}): NovaResposta | null {
  const setores = campos.setores ?? [];
  const parsed = respostaSchema.safeParse({
    atalho: semBarra(campos.atalho),
    corpo: campos.corpo,
    canais: campos.canais ?? ["whatsapp"],
    compartilhar: true,
    todos_os_setores: setores.length === 0,
    setores,
    ...(campos.anexo !== undefined ? { anexo: campos.anexo } : {}),
  });
  return parsed.success ? parsed.data : null;
}

const listarShape = {};

export const crmListQuickReplies: McpToolDefinition<typeof listarShape> = {
  name: "crm_list_quick_replies",
  description:
    "Lista as respostas rápidas da organização: atalho (o que se digita depois da barra), texto, canais, setores e " +
    "se é compartilhada. O texto pode ter {{canal.<variavel>}} e {{atendente.nome}}, trocados pelo número da conversa.",
  inputSchema: listarShape,
  category: "read",
  requiresRole: "agent",
  requiresScope: "mcp:read",
  handler: async (_input, ctx) => {
    return { respostas: await lerRespostas(ctx.supabase, ctx.organizationId) };
  },
};

export const crmCreateQuickReply: McpToolDefinition<typeof camposShape> = {
  name: "crm_create_quick_reply",
  description:
    "Cria uma resposta rápida COMPARTILHADA. `atalho` sem a barra (ex.: 'fechamento'). Use {{canal.pix_chave}} e " +
    "{{atendente.nome}} no texto para dados que mudam de número para número, em vez de uma resposta por atendente.",
  inputSchema: camposShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const dados = montarResposta(input);
    if (!dados) throw new Error("validation_failed: resposta inválida.");
    const r = await criarResposta(ctx.supabase, {
      organizationId: ctx.organizationId,
      donoUserId: null,
      criadoPor: idDoAutor(ctx),
      dados,
      requestId: ctx.requestId,
    });
    if (!r.ok) throw falhou(r);
    return { id: r.dado.id };
  },
};

const atualizarShape = {
  resposta_id: z.string().uuid(),
  atalho: camposShape.atalho.optional(),
  corpo: camposShape.corpo.optional(),
  canais: camposShape.canais,
  setores: camposShape.setores,
  /** `null` tira o anexo; ausente mantém o que já está. */
  anexo: camposShape.anexo,
};

export const crmUpdateQuickReply: McpToolDefinition<typeof atualizarShape> = {
  name: "crm_update_quick_reply",
  description:
    "Altera uma resposta rápida: o que não for informado fica como está. Não muda de quem ela é (pessoal ou compartilhada).",
  inputSchema: atualizarShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const atuais = await lerRespostas(ctx.supabase, ctx.organizationId);
    const atual = atuais.find((r) => r.id === input.resposta_id);
    if (!atual) throw new Error("not_found: Resposta não encontrada.");
    const dados = montarResposta({
      atalho: input.atalho ?? atual.atalho,
      corpo: input.corpo ?? atual.corpo,
      canais: input.canais ?? atual.canais,
      setores: input.setores ?? (atual.todos_os_setores ? [] : atual.setores),
      anexo: input.anexo,
    });
    if (!dados) throw new Error("validation_failed: resposta inválida.");
    const r = await atualizarResposta(ctx.supabase, {
      organizationId: ctx.organizationId,
      id: input.resposta_id,
      donoUserId: atual.dono,
      atualizadoPor: idDoAutor(ctx),
      dados: { ...dados, compartilhar: atual.compartilhada },
      requestId: ctx.requestId,
    });
    if (!r.ok) throw falhou(r);
    return { id: r.dado.id };
  },
};

const apagarShape = { resposta_id: z.string().uuid() };

export const crmDeleteQuickReply: McpToolDefinition<typeof apagarShape> = {
  name: "crm_delete_quick_reply",
  description: "Apaga uma resposta rápida. Não dá para desfazer; quem a usava deixa de encontrá-la pelo atalho.",
  inputSchema: apagarShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const existentes = await lerRespostas(ctx.supabase, ctx.organizationId);
    if (!existentes.some((r) => r.id === input.resposta_id)) throw new Error("not_found: Resposta não encontrada.");
    const r = await excluirResposta(ctx.supabase, {
      organizationId: ctx.organizationId,
      id: input.resposta_id,
      excluidoPor: idDoAutor(ctx),
      requestId: ctx.requestId,
    });
    if (!r.ok) throw falhou(r);
    return { apagada: r.dado.id };
  },
};
