import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  lerOrigemDaConfiguracao,
  responderComConfiguracoes,
} from "@/lib/escale/configuracoes/respostas";
import { papeisAtivos } from "@/lib/escale/distribuicao/ler";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUT } from "@/app/api/v1/pipelines/[id]/distribuicao/route";
import { POST as REINICIAR } from "@/app/api/v1/pipelines/[id]/distribuicao/reiniciar/route";
import { ORG_ID, PIPE, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/escale/acesso/modo-da-organizacao", () => ({
  modoDaOrganizacao: vi.fn(async () => "all"),
}));
vi.mock("@/lib/escale/configuracoes/respostas", async (original) => ({
  ...(await original<typeof import("@/lib/escale/configuracoes/respostas")>()),
  lerOrigemDaConfiguracao: vi.fn(),
  responderComConfiguracoes: vi.fn(async () => Response.json({ data: { ok: true } })),
}));
vi.mock("@/lib/escale/distribuicao/ler", async (original) => ({
  ...(await original<typeof import("@/lib/escale/distribuicao/ler")>()),
  papeisAtivos: vi.fn(),
}));

/** FORK ESCALE · Fase 1K (D13): as rotas de gravar e reiniciar a distribuição. */
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const V = "33333333-3333-4333-8333-333333333333";
const ctx = { params: Promise.resolve({ id: PIPE }) };
const rpc = vi.fn();

function pedido(body: unknown, rota = "distribuicao"): NextRequest {
  return new NextRequest(`http://localhost/api/v1/pipelines/${PIPE}/${rota}`, {
    method: rota === "distribuicao" ? "PUT" : "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function origem(
  settings: Record<string, unknown> = {},
  grupo: Record<string, unknown> | null = null,
) {
  vi.mocked(lerOrigemDaConfiguracao).mockResolvedValue({
    ok: true,
    pipeline: {
      id: PIPE,
      name: "Pedidos",
      group_id: null,
      is_default: false,
      settings,
      updated_at: "x",
    },
    etapas: [],
    catalogo: [],
    grupo: grupo ? { settings: grupo } : null,
  } as never);
}

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
  vi.mocked(papeisAtivos).mockResolvedValue({
    ok: true,
    papeis: new Map([
      [A, "agent"],
      [B, "agent"],
      [V, "viewer"],
    ]),
  });
  origem();
  authOk("admin");
});

describe("PUT /api/v1/pipelines/:id/distribuicao", () => {
  it("só administrador grava (gerente: 403, sem chamar o banco)", async () => {
    authOk("manager");
    const res = await PUT(
      pedido({ pessoas: [{ user_id: A, percentual: 100 }], reiniciar: false }),
      ctx,
    );
    expect(res.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("grava pela função, com a organização e o autor da sessão, audita e responde a origem relida", async () => {
    const corpo = {
      pessoas: [
        { user_id: A, percentual: 75 },
        { user_id: B, percentual: 25 },
      ],
      reiniciar: true,
    };
    const res = await PUT(pedido(corpo), ctx);
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_salvar_distribuicao", {
      p_org: ORG_ID,
      p_origem: PIPE,
      p_autor: USER_ID,
      p_pessoas: corpo.pessoas,
      p_reiniciar: true,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "pipeline.config_updated",
        metadata: { secoes: ["distribuicao"], via: "escale" },
      }),
    );
    expect(responderComConfiguracoes).toHaveBeenCalled();
  });

  it("soma errada é 422 com o texto da Clint, sem chamar o banco", async () => {
    const res = await PUT(
      pedido({
        pessoas: [
          { user_id: A, percentual: 50 },
          { user_id: B, percentual: 40 },
        ],
        reiniciar: false,
      }),
      ctx,
    );
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
      "Verificar o total das porcentagens, deve somar 100%.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("viewer, gente de fora e quem está fora da lista da origem: 422 'não possui permissão'", async () => {
    for (const quem of [V, "44444444-4444-4444-8444-444444444444"]) {
      const res = await PUT(
        pedido({ pessoas: [{ user_id: quem, percentual: 100 }], reiniciar: false }),
        ctx,
      );
      expect(res.status).toBe(422);
    }
    origem({ escale_pessoas: [A] });
    const res = await PUT(
      pedido({ pessoas: [{ user_id: B, percentual: 100 }], reiniciar: false }),
      ctx,
    );
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
      "Este usuário não possui permissão nesta origem.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("lista vazia é aceita (desliga a distribuição)", async () => {
    expect((await PUT(pedido({ pessoas: [], reiniciar: false }), ctx)).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "fn_escale_salvar_distribuicao",
      expect.objectContaining({ p_pessoas: [] }),
    );
  });

  it("a recusa do banco vira o texto certo: PT422 e 22023 são 422; o resto é 500", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "PT422", message: "pessoa_sem_permissao" },
    });
    expect(
      (await PUT(pedido({ pessoas: [{ user_id: A, percentual: 100 }], reiniciar: false }), ctx))
        .status,
    ).toBe(422);
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "22023", message: "distribuicao_invalida" },
    });
    expect(
      (await PUT(pedido({ pessoas: [{ user_id: A, percentual: 100 }], reiniciar: false }), ctx))
        .status,
    ).toBe(422);
    rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "boom" } });
    expect(
      (await PUT(pedido({ pessoas: [{ user_id: A, percentual: 100 }], reiniciar: false }), ctx))
        .status,
    ).toBe(500);
  });
});

describe("POST /api/v1/pipelines/:id/distribuicao/reiniciar", () => {
  it("admin reinicia pela função e audita", async () => {
    const res = await REINICIAR(pedido({}, "distribuicao/reiniciar"), ctx);
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_reiniciar_distribuicao", {
      p_org: ORG_ID,
      p_origem: PIPE,
      p_autor: USER_ID,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { secoes: ["distribuicao"], acao: "reiniciar", via: "escale" },
      }),
    );
  });

  it("gerente não reinicia (403)", async () => {
    authOk("manager");
    expect((await REINICIAR(pedido({}, "distribuicao/reiniciar"), ctx)).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});
