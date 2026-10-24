import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/acoes-em-massa-conversas/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/escale/conversas/massa/executar", () => ({
  processarAcaoDaFila: vi.fn(async () => ({ status: "ok" })),
}));
vi.mock("@/lib/escale/conversas/massa/handler", () => ({ dependenciasReais: vi.fn(() => ({})) }));

const CV = "c0000000-0000-4000-8000-000000000001";
const DESTINO = "b0000000-0000-4000-8000-000000000009";
const ACAO = "aaaaaaaa-0000-4000-8000-000000000001";

const pedido = (corpo: unknown) =>
  new NextRequest("http://x", { method: "POST", body: JSON.stringify(corpo) } as never);

function usar(permissoes: Record<string, boolean>) {
  const b = bancoPorTabela(
    {},
    {
      rpc: (nome, args) => {
        if (nome === "fn_crm_pode")
          return { data: permissoes[(args as { p_chave: string }).p_chave] ?? false, error: null };
        return { data: [{ acao_id: ACAO, quantidade: 1, status: "na_fila" }], error: null };
      },
    },
  );
  vi.mocked(createClient).mockResolvedValue(b.db as never);
  vi.mocked(createAdminClient).mockReturnValue(
    bancoPorTabela({ user_organizations: [{ role: "agent" }] }).db as never,
  );
  return b;
}

const ids = { tipo: "ids", ids: [CV] };

beforeEach(() => {
  authOk("agent");
});

describe("POST /api/v1/acoes-em-massa-conversas — atendente em lote", () => {
  it("recusa trocar o atendente em lote sem a permissão de alterar atendente de todos", async () => {
    const { db } = usar({ CHAT_BULK_ACTIONS: true, CHAT_CHANGE_ATTENDANT_ALL: false });
    const r = await POST(
      pedido({ acao: "atendente", alvo: ids, parametros: { user_id: DESTINO } }),
    );
    expect(r.status).toBe(403);
    const chamadas = vi.mocked(db.rpc).mock.calls.map((c) => c[0]);
    expect(chamadas).not.toContain("fn_escale_criar_acao_em_massa_de_conversas");
  });

  it("recusa soltar o atendente em lote sem a permissão", async () => {
    usar({ CHAT_BULK_ACTIONS: true, CHAT_CHANGE_ATTENDANT_TEAM: true });
    const r = await POST(pedido({ acao: "atendente", alvo: ids, parametros: { user_id: null } }));
    expect(r.status).toBe(403);
  });

  it("com a permissão de todos, a ação é criada", async () => {
    const { db } = usar({ CHAT_BULK_ACTIONS: true, CHAT_CHANGE_ATTENDANT_ALL: true });
    const r = await POST(
      pedido({ acao: "atendente", alvo: ids, parametros: { user_id: DESTINO } }),
    );
    expect(r.status).toBe(201);
    const chamadas = vi.mocked(db.rpc).mock.calls.map((c) => c[0]);
    expect(chamadas).toContain("fn_escale_criar_acao_em_massa_de_conversas");
  });

  it("outras ações em lote seguem só com a permissão de ações em massa", async () => {
    usar({ CHAT_BULK_ACTIONS: true });
    const r = await POST(pedido({ acao: "espera", alvo: ids, parametros: {} }));
    expect(r.status).not.toBe(403);
  });
});
