// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { criarFluxo, salvarFluxo, publicarFluxo } = vi.hoisted(() => ({
  criarFluxo: vi.fn(),
  salvarFluxo: vi.fn(),
  publicarFluxo: vi.fn(),
}));
vi.mock("@/lib/followup/escrita-de-fluxo", () => ({ criarFluxo, salvarFluxo, publicarFluxo }));

import {
  crmCreateFollowupFlow,
  crmPublishFollowupFlow,
  crmUpdateFollowupFlow,
} from "@/lib/mcp/tools/fluxos-escrita";
import type { McpContext } from "@/lib/mcp/types";

const ORG = "11111111-1111-4111-8111-111111111111";
const FLUXO = "22222222-2222-4222-8222-222222222222";
const ctx = {
  organizationId: ORG,
  requestId: "req",
  apiTokenId: "tok",
  actor: { type: "user", id: "u1", role: "manager" },
  supabase: {},
} as unknown as McpContext;

beforeEach(() => {
  criarFluxo.mockReset();
  salvarFluxo.mockReset();
  publicarFluxo.mockReset();
});

describe("crm_publish_followup_flow", () => {
  const schema = z.object(crmPublishFollowupFlow.inputSchema);
  it("recusa publicar sem aprovado_por", () => {
    expect(schema.safeParse({ flow_id: FLUXO }).success).toBe(false);
  });
  it("recusa aprovado_por curto", () => {
    expect(schema.safeParse({ flow_id: FLUXO, aprovado_por: "ok" }).success).toBe(false);
  });
  it("aceita com aprovador nomeado", () => {
    expect(schema.safeParse({ flow_id: FLUXO, aprovado_por: "Régis" }).success).toBe(true);
  });
  it("é de escrita e exige manager", () => {
    expect(crmPublishFollowupFlow).toMatchObject({ category: "write", requiresRole: "manager", requiresScope: "mcp:write" });
  });
  it("passa o aprovador e a organização do contexto à publicação", async () => {
    publicarFluxo.mockResolvedValue({ ok: true, dado: { versionId: "v1", pointer: {} } });
    const r = await crmPublishFollowupFlow.handler({ flow_id: FLUXO, aprovado_por: "Régis" } as never, ctx);
    expect(r).toEqual({ versao: "v1" });
    expect(publicarFluxo).toHaveBeenCalledWith(
      ctx.supabase,
      expect.objectContaining({ organizationId: ORG, pointerId: FLUXO, aprovadoPor: "Régis" }),
    );
  });
  it("reprovação na validação vira erro com os detalhes", async () => {
    publicarFluxo.mockResolvedValue({
      ok: false,
      codigo: "validation_failed",
      mensagem: "Fluxo reprovado na validação de publish.",
      status: 422,
      detalhes: { errors: [{ code: "no_trigger" }] },
    });
    await expect(
      crmPublishFollowupFlow.handler({ flow_id: FLUXO, aprovado_por: "Régis" } as never, ctx),
    ).rejects.toThrow(/validation_failed.*no_trigger/s);
  });
});

describe("crm_create_followup_flow / crm_update_followup_flow", () => {
  it("criar usa a organização do contexto", async () => {
    criarFluxo.mockResolvedValue({ ok: true, dado: { id: FLUXO } });
    const r = await crmCreateFollowupFlow.handler({ name: "Pós-teste" } as never, ctx);
    expect(r).toEqual({ id: FLUXO });
    expect(criarFluxo).toHaveBeenCalledWith(ctx.supabase, expect.objectContaining({ organizationId: ORG, nome: "Pós-teste" }));
  });
  it("atualizar grava só o rascunho e nunca publica", async () => {
    salvarFluxo.mockResolvedValue({ ok: true, dado: { id: FLUXO, status: "draft" } });
    await crmUpdateFollowupFlow.handler({ flow_id: FLUXO, alteracoes: { name: "novo" } } as never, ctx);
    expect(salvarFluxo).toHaveBeenCalledWith(
      ctx.supabase,
      expect.objectContaining({ organizationId: ORG, pointerId: FLUXO, alteracoes: { name: "novo" } }),
    );
    expect(publicarFluxo).not.toHaveBeenCalled();
  });
});
