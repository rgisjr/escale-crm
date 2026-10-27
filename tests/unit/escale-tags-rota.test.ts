import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: async () => null }));
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: async () => ({ ok: true, user: { id: "u1" }, org: { orgId: "o1" } }),
}));
vi.mock("@/lib/auth/server", () => ({ mfaEmDivida: async () => false }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

import { POST } from "@/app/api/v1/escale/tags/route";

const pedir = (corpo: unknown) =>
  POST(new Request("http://x/api/v1/escale/tags", { method: "POST", body: JSON.stringify(corpo) }) as never);

beforeEach(() => rpc.mockReset());

describe("POST /api/v1/escale/tags", () => {
  it("grava pela função com a organização da sessão", async () => {
    rpc.mockResolvedValue({ data: { tag: "vip", cor: "#e91e63" }, error: null });
    const r = await pedir({ tag: "VIP", cor: "#E91E63", descricao: null });
    expect(r.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_tag_gravar", {
      p_org: "o1", p_tag: "vip", p_cor: "#e91e63", p_descricao: null,
    });
  });

  it("recusa descrição acima de 160 e cor fora de #rrggbb", async () => {
    expect((await pedir({ tag: "vip", cor: null, descricao: "a".repeat(161) })).status).toBe(422);
    expect((await pedir({ tag: "vip", cor: "azul", descricao: null })).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("42501 do banco vira 403", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await pedir({ tag: "vip", cor: null, descricao: null })).status).toBe(403);
  });
});
