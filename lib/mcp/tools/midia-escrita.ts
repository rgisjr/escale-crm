import { z } from "zod";

import { listarAtivos, subirAtivoPorUrl } from "@/lib/midia/ativos-banco";

import type { McpToolDefinition } from "../types";

const subirShape = {
  nome: z.string().trim().min(1).max(120),
  url: z.string().url().max(2000),
};

export const crmUploadMediaAsset: McpToolDefinition<typeof subirShape> = {
  name: "crm_upload_media_asset",
  description:
    "Baixa um arquivo de uma URL pública e guarda no repositório de mídia da organização (áudio .ogg/opus, " +
    "imagem jpg/png/webp, vídeo mp4 ou pdf, até 16 MB). Devolve o asset_id, usado nos passos de envio " +
    "(`midia` com `asset`) ou ligado a um número com crm_set_channel_variables (`ativos`).",
  inputSchema: subirShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const ativo = await subirAtivoPorUrl(ctx.supabase, {
      organizationId: ctx.organizationId,
      nome: input.nome,
      url: input.url,
      requestId: ctx.requestId,
      actorUserId: ctx.actor.type === "user" ? ctx.actor.id : null,
    });
    return { asset_id: ativo.id, mime: ativo.mime, tamanho: ativo.sizeBytes, tipo: ativo.tipo };
  },
};

const listarShape = {};

export const crmListMediaAssets: McpToolDefinition<typeof listarShape> = {
  name: "crm_list_media_assets",
  description: "Lista os arquivos do repositório de mídia da organização: asset_id, nome, tipo e tamanho.",
  inputSchema: listarShape,
  category: "read",
  requiresRole: "manager",
  requiresScope: "mcp:read",
  handler: async (_input, ctx) => ({ ativos: await listarAtivos(ctx.supabase, ctx.organizationId) }),
};
