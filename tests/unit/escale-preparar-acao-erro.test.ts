import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/v1/messages/_handler", () => ({ sendMessageHandler: vi.fn() }));
vi.mock("@/lib/campanhas/preparacao", () => ({
  prepararCampanha: vi.fn(async () => ({ total: 3, elegiveis: 2, excluidos: 1 })),
}));
vi.mock("@/lib/escale/campanhas/candidatos", () => ({
  candidatosDaCasca: vi.fn(async () => null),
}));

import { prepararAcao, type CampanhaCarregada } from "@/lib/campanhas/acoes";

const campanha = {
  id: "dddddddd-0000-4000-8000-000000000001",
  organization_id: "22222222-2222-4222-8222-222222222222",
  name: "Reativação",
  status: "draft",
  channel_session_id: "aaaaaaaa-0000-4000-8000-000000000001",
  message_body: "Oi",
  base_legal: "consent",
  lia_ref: null,
  audience_filter: {},
  audience_version: 1,
  content_version: 1,
  scheduled_at: null,
} as unknown as CampanhaCarregada;

/** Supabase de mentira da campanha: anota cada update e deixa escolher o que falha. */
function banco(falhaAoFicarPronta: boolean) {
  const updates: Array<Record<string, unknown>> = [];
  const from = (tabela: string) => {
    let dados: Record<string, unknown> | null = null;
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "not", "is"]) q[m] = vi.fn(() => q);
    q.update = vi.fn((d: Record<string, unknown>) => {
      dados = d;
      updates.push(d);
      return q;
    });
    q.then = (ok: (r: unknown) => unknown) => {
      if (tabela === "campaign_recipients")
        return Promise.resolve({ data: null, error: null, count: 0 }).then(ok);
      if (dados?.status === "preparing")
        return Promise.resolve({ data: [{ id: "x" }], error: null }).then(ok);
      if (dados?.status === "ready" && falhaAoFicarPronta)
        return Promise.resolve({ data: null, error: { message: "timeout do banco" } }).then(ok);
      return Promise.resolve({ data: null, error: null }).then(ok);
    };
    return q;
  };
  return { admin: { from } as never, updates };
}

describe("prepararAcao — o update para `ready` (B8-1)", () => {
  it("se o update para `ready` falha, não devolve ok e a campanha volta a rascunho", async () => {
    const { admin, updates } = banco(true);
    const r = await prepararAcao(admin, campanha, new Date("2026-10-24T12:00:00Z"));
    expect(r.ok).toBe(false);
    expect(updates.at(-1)).toMatchObject({ status: "draft", failure_code: "erro_na_preparacao" });
  });

  it("quando grava, devolve ok com o resumo", async () => {
    const { admin, updates } = banco(false);
    const r = await prepararAcao(admin, campanha, new Date("2026-10-24T12:00:00Z"));
    expect(r).toMatchObject({ ok: true, resumo: { total: 3, elegiveis: 2, excluidos: 1 } });
    expect(updates.some((u) => u.status === "ready")).toBe(true);
  });
});
