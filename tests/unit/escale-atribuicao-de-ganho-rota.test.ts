import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GET, PATCH } from "@/app/api/v1/leads/[id]/atribuicao-de-ganho/route";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

/** FORK ESCALE · Fase 1K (N18): ler e corrigir o crédito do ganho. */
const LEAD = "99999999-9999-4999-8999-999999999999";
const B = "22222222-2222-4222-8222-222222222222";
const ctx = { params: Promise.resolve({ id: LEAD }) };
const rpc = vi.fn();

function sessao(linha: Record<string, unknown> | null) {
  const b = {
    select: () => b,
    eq: () => b,
    maybeSingle: async () => ({ data: linha, error: null }),
  };
  vi.mocked(createClient).mockResolvedValue({ from: () => b } as never);
}

const pedido = (body?: unknown) =>
  new NextRequest(`http://localhost/api/v1/leads/${LEAD}/atribuicao-de-ganho`, {
    method: body === undefined ? "GET" : "PATCH",
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
  authOk("admin");
});

describe("GET", () => {
  it("devolve o crédito com as regras lidas; sem linha, null", async () => {
    sessao({
      creditado_a: B,
      ganho_em: "2026-10-18T10:00:00Z",
      pela_regra: true,
      corrigido_em: null,
      regras: { operador: "e", condicoes: [{ tipo: "atividade", vezes: 2, atividade: "ligacao" }] },
    });
    const { data } = (await (await GET(pedido(), ctx)).json()) as { data: Record<string, unknown> };
    expect(data).toEqual({
      creditadoA: B,
      ganhoEm: "2026-10-18T10:00:00Z",
      pelaRegra: true,
      corrigidoEm: null,
      regras: { operador: "e", condicoes: [{ tipo: "atividade", vezes: 2, atividade: "ligacao" }] },
    });
    sessao(null);
    expect(((await (await GET(pedido(), ctx)).json()) as { data: unknown }).data).toBeNull();
  });
});

describe("PATCH", () => {
  it("só admin corrige (gerente: 403)", async () => {
    authOk("manager");
    expect(
      (await PATCH(pedido({ creditado_a: B, ganho_em: "2026-10-17T10:00:00.000Z" }), ctx)).status,
    ).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("chama a função com a organização e o autor; as recusas viram 422/404", async () => {
    sessao({
      creditado_a: B,
      ganho_em: "2026-10-17T10:00:00Z",
      pela_regra: false,
      corrigido_em: "x",
      regras: null,
    });
    expect(
      (await PATCH(pedido({ creditado_a: B, ganho_em: "2026-10-17T10:00:00.000Z" }), ctx)).status,
    ).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_corrigir_ganho", {
      p_org: ORG_ID,
      p_lead: LEAD,
      p_autor: USER_ID,
      p_creditado_a: B,
      p_ganho_em: "2026-10-17T10:00:00.000Z",
    });
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PT422", message: "pessoa_invalida" } });
    expect(
      (await PATCH(pedido({ creditado_a: B, ganho_em: "2026-10-17T10:00:00.000Z" }), ctx)).status,
    ).toBe(422);
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "PT404", message: "ganho_nao_encontrado" },
    });
    expect(
      (await PATCH(pedido({ creditado_a: B, ganho_em: "2026-10-17T10:00:00.000Z" }), ctx)).status,
    ).toBe(404);
  });
});
