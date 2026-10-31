// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ler, criar, atualizar, excluir } = vi.hoisted(() => ({
  ler: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  excluir: vi.fn(),
}));
vi.mock("@/lib/escale/conversas/respostas-banco", () => ({ lerRespostas: ler }));
vi.mock("@/lib/escale/conversas/respostas-escrita", () => ({
  criarResposta: criar,
  atualizarResposta: atualizar,
  excluirResposta: excluir,
}));

import { crmCreateQuickReply, crmDeleteQuickReply, crmUpdateQuickReply } from "@/lib/mcp/tools/respostas-escrita";
import type { McpContext } from "@/lib/mcp/types";

const ORG = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const ctx = { organizationId: ORG, requestId: "req", actor: { type: "user", id: "u1" }, supabase: {} } as unknown as McpContext;

beforeEach(() => {
  ler.mockReset();
  criar.mockReset();
  atualizar.mockReset();
  excluir.mockReset();
});

describe("crm_create_quick_reply", () => {
  it("cria compartilhada, sem a barra do atalho, para todos os setores", async () => {
    criar.mockResolvedValue({ ok: true, dado: { id: ID } });
    const r = await crmCreateQuickReply.handler({ atalho: "/fechamento", corpo: "PIX {{canal.pix_chave}}" } as never, ctx);
    expect(r).toEqual({ id: ID });
    expect(criar).toHaveBeenCalledWith(
      ctx.supabase,
      expect.objectContaining({
        organizationId: ORG,
        donoUserId: null,
        dados: expect.objectContaining({ atalho: "fechamento", compartilhar: true, todos_os_setores: true, canais: ["whatsapp"] }),
      }),
    );
  });
  it("com setores, deixa de valer para todos", async () => {
    criar.mockResolvedValue({ ok: true, dado: { id: ID } });
    const setor = "33333333-3333-4333-8333-333333333333";
    await crmCreateQuickReply.handler({ atalho: "x", corpo: "y", setores: [setor] } as never, ctx);
    expect(criar.mock.calls[0]![1].dados).toMatchObject({ todos_os_setores: false, setores: [setor] });
  });
});

describe("crm_update_quick_reply", () => {
  const atual = { id: ID, atalho: "oi", corpo: "Olá", canais: ["whatsapp"], compartilhada: true, todos_os_setores: true, setores: [], dono: null };
  it("mantém o que não foi informado e o dono", async () => {
    ler.mockResolvedValue([atual]);
    atualizar.mockResolvedValue({ ok: true, dado: { id: ID } });
    await crmUpdateQuickReply.handler({ resposta_id: ID, corpo: "Novo" } as never, ctx);
    expect(atualizar).toHaveBeenCalledWith(
      ctx.supabase,
      expect.objectContaining({ id: ID, donoUserId: null, dados: expect.objectContaining({ atalho: "oi", corpo: "Novo" }) }),
    );
  });
  it("resposta de outra organização não é encontrada", async () => {
    ler.mockResolvedValue([]);
    await expect(crmUpdateQuickReply.handler({ resposta_id: ID, corpo: "x" } as never, ctx)).rejects.toThrow("not_found");
    expect(atualizar).not.toHaveBeenCalled();
  });
});

describe("crm_delete_quick_reply", () => {
  it("só apaga o que é da organização", async () => {
    ler.mockResolvedValue([]);
    await expect(crmDeleteQuickReply.handler({ resposta_id: ID } as never, ctx)).rejects.toThrow("not_found");
    expect(excluir).not.toHaveBeenCalled();
    ler.mockResolvedValue([{ id: ID }]);
    excluir.mockResolvedValue({ ok: true, dado: { id: ID } });
    expect(await crmDeleteQuickReply.handler({ resposta_id: ID } as never, ctx)).toEqual({ apagada: ID });
  });
});
