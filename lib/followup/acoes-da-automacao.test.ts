// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { executarAcoesDaAutomacao } from "@/lib/followup/acoes-da-automacao";

describe("executarAcoesDaAutomacao", () => {
  const base = { organization_id: "org", contact_id: "c1", enrollment_id: "e1" };

  it("roda as ações na ordem, com o negócio e o contato no contexto", async () => {
    const vistos: string[] = [];
    const getAction = vi.fn((type: string) => ({
      type,
      execute: vi.fn(async (ctx: { context: Record<string, unknown> }) => {
        vistos.push(`${type}:${(ctx.context.lead as { id: string }).id}`);
        return { type, status: "success" as const };
      }),
    }));
    const r = await executarAcoesDaAutomacao(
      {
        admin: {} as never,
        getAction,
        carregarContexto: async () => ({ lead: { id: "L1" }, contact: { id: "c1" } }),
      },
      {
        ...base,
        acoes: [
          { type: "add_tag", config: { tags: ["vip"] } },
          { type: "create_task", config: {} },
        ],
      },
    );
    expect(vistos).toEqual(["add_tag:L1", "create_task:L1"]);
    expect(r).toEqual({ ok: true, falhas: [] });
  });

  it("uma ação que falha não para as outras e volta nomeada", async () => {
    const getAction = vi.fn((type: string) => ({
      type,
      execute: vi.fn(async () =>
        type === "add_tag"
          ? { type, status: "failed" as const, error: "x" }
          : { type, status: "success" as const },
      ),
    }));
    const r = await executarAcoesDaAutomacao(
      { admin: {} as never, getAction, carregarContexto: async () => ({ contact: { id: "c1" } }) },
      {
        ...base,
        acoes: [
          { type: "add_tag", config: {} },
          { type: "remove_tag", config: {} },
        ],
      },
    );
    expect(r).toEqual({ ok: false, falhas: ["add_tag:x"] });
  });

  it("ação sem registro vira falha, não exceção", async () => {
    const r = await executarAcoesDaAutomacao(
      { admin: {} as never, getAction: () => undefined, carregarContexto: async () => ({}) },
      { ...base, acoes: [{ type: "add_tag", config: {} }] },
    );
    expect(r).toEqual({ ok: false, falhas: ["add_tag:acao_nao_registrada"] });
  });
});
