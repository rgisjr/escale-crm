// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { criarFunil, gravar } = vi.hoisted(() => ({ criarFunil: vi.fn(), gravar: vi.fn() }));
vi.mock("@/lib/pipelines/criar-funil", () => ({ criarFunil }));
vi.mock("@/lib/canais/variaveis-escrita", () => ({ gravarVariaveisDoCanal: gravar }));

import { crmCreatePipeline, crmSetChannelVariables } from "@/lib/mcp/tools/canais-escrita";
import type { McpContext } from "@/lib/mcp/types";

const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";
const ctx = {
  organizationId: ORG,
  requestId: "req",
  actor: { type: "user", id: "u1", role: "manager" },
  supabase: {},
} as unknown as McpContext;

beforeEach(() => {
  criarFunil.mockReset();
  gravar.mockReset();
});

describe("crm_create_pipeline", () => {
  it("cria com a organização do contexto e as etapas dadas", async () => {
    criarFunil.mockResolvedValue({ ok: true, dado: { id: "p1", slug: "onplay", isDefault: true } });
    const stages = [{ name: "Novo" }, { name: "Cliente Novo", is_won: true }];
    const r = await crmCreatePipeline.handler({ name: "ONPLAY", stages } as never, ctx);
    expect(r).toEqual({ id: "p1", slug: "onplay", padrao: true });
    expect(criarFunil).toHaveBeenCalledWith(ctx.supabase, expect.objectContaining({ organizationId: ORG, etapas: stages }));
  });
  it("exige ao menos duas etapas quando informadas", () => {
    const schema = z.object(crmCreatePipeline.inputSchema);
    expect(schema.safeParse({ name: "x", stages: [{ name: "a" }] }).success).toBe(false);
    expect(schema.safeParse({ name: "x" }).success).toBe(true);
  });
  it("nome repetido vira erro da ferramenta", async () => {
    criarFunil.mockResolvedValue({ ok: false, codigo: "unprocessable_entity", mensagem: "já existe", status: 422 });
    await expect(crmCreatePipeline.handler({ name: "x" } as never, ctx)).rejects.toThrow("unprocessable_entity: já existe");
  });
});

describe("crm_set_channel_variables", () => {
  it("grava na organização do contexto e devolve só as chaves", async () => {
    gravar.mockResolvedValue(undefined);
    const r = await crmSetChannelVariables.handler({ channel_session_id: CANAL, valores: { pix_chave: "123" } } as never, ctx);
    expect(r).toEqual({ gravadas: ["pix_chave"] });
    expect(gravar).toHaveBeenCalledWith(ctx.supabase, expect.objectContaining({ organizationId: ORG, channelSessionId: CANAL }));
  });
  it("o log da chamada não leva o valor (chave PIX)", () => {
    const args = crmSetChannelVariables.redigirParaAuditoria!({ channel_session_id: CANAL, valores: { pix_chave: "51999600190" } });
    expect(JSON.stringify(args)).not.toContain("51999600190");
    expect(args.valores).toEqual(["pix_chave"]);
  });
  it("aceita null (padrão da organização) e recusa pedido sem valores nem ativos", async () => {
    const schema = z.object(crmSetChannelVariables.inputSchema);
    expect(schema.safeParse({ channel_session_id: null, valores: { a: "1" } }).success).toBe(true);
    await expect(crmSetChannelVariables.handler({ channel_session_id: null, valores: {} } as never, ctx)).rejects.toThrow(
      "Informe de 1 a 30",
    );
  });
  it("grava só ativos (áudio por número) e devolve a chave", async () => {
    gravar.mockResolvedValue(undefined);
    const ativos = { bv1: "33333333-3333-4333-8333-333333333333" };
    const r = await crmSetChannelVariables.handler({ channel_session_id: CANAL, valores: {}, ativos } as never, ctx);
    expect(r).toEqual({ gravadas: ["bv1"] });
    expect(gravar).toHaveBeenCalledWith(ctx.supabase, expect.objectContaining({ ativos }));
  });
});
