import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

import { GET, PUT } from "@/app/api/v1/pipelines/[id]/playbook/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

/** FORK ESCALE · Fase 1I (D10): ler e salvar o playbook da origem. */
const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const PIPE = "33333333-3333-4333-8333-333333333333";
const ETAPA = "44444444-4444-4444-8444-444444444444";
const ATV = {
  id: "55555555-5555-4555-8555-555555555555",
  stage_id: ETAPA,
  titulo: "Entrada de Lead",
  tipo: "whatsapp",
  visibilidade: "padrao",
  prazo_minutos: 1440,
  ordem: 0,
  conteudo: "Olá",
};

function banco(opts: {
  origem?: boolean;
  atividades?: unknown[];
  rpcErro?: { code: string; message: string };
}) {
  const rpc = vi.fn(async () => ({ data: null, error: opts.rpcErro ?? null }));
  const from = vi.fn(() => {
    const api = {
      select: () => api,
      eq: () => api,
      order: () => api,
      maybeSingle: async () => ({ data: opts.origem === false ? null : { id: PIPE }, error: null }),
      then: (ok: (v: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: opts.atividades ?? [ATV], error: null }).then(ok),
    };
    return api;
  });
  return { from, rpc };
}

const ctx = (id = PIPE) => ({ params: Promise.resolve({ id }) });
const pedido = (corpo: unknown) =>
  new NextRequest(`http://x/api/v1/pipelines/${PIPE}/playbook`, {
    method: "PUT",
    body: JSON.stringify(corpo),
  });

beforeEach(() => {
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: USER, idioma: "pt-BR" },
    org: { orgId: ORG },
  } as never);
});

describe("GET /api/v1/pipelines/[id]/playbook", () => {
  it("devolve as atividades da origem", async () => {
    vi.mocked(createClient).mockResolvedValue(banco({}) as never);
    const res = await GET(new NextRequest("http://x"), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).data.atividades).toEqual([ATV]);
  });
  it("origem fora da organização: 404; id inválido: 404", async () => {
    vi.mocked(createClient).mockResolvedValue(banco({ origem: false }) as never);
    expect((await GET(new NextRequest("http://x"), ctx())).status).toBe(404);
    expect((await GET(new NextRequest("http://x"), ctx("nao-e-uuid"))).status).toBe(404);
  });
  it("abaixo de gerente: a resposta do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    expect((await GET(new NextRequest("http://x"), ctx())).status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.anything());
  });
});

describe("PUT /api/v1/pipelines/[id]/playbook", () => {
  it("chama a função com a organização da SESSÃO, audita e devolve a lista relida", async () => {
    const db = banco({});
    vi.mocked(createClient).mockResolvedValue(db as never);
    const res = await PUT(pedido({ atividades: [ATV] }), ctx());
    expect(res.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_salvar_playbook", {
      p_org: ORG,
      p_pipeline: PIPE,
      p_atividades: [ATV],
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "pipeline.config_updated",
        resourceId: PIPE,
        organizationId: ORG,
      }),
    );
    expect((await res.json()).data.atividades).toEqual([ATV]);
  });
  it("corpo inválido: 422 sem chamar a função", async () => {
    const db = banco({});
    vi.mocked(createClient).mockResolvedValue(db as never);
    expect((await PUT(pedido({ atividades: [{ ...ATV, tipo: "linkedin" }] }), ctx())).status).toBe(
      422,
    );
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("a função recusa a etapa (22023): 422; sem papel no banco (42501): 403", async () => {
    vi.mocked(createClient).mockResolvedValue(
      banco({ rpcErro: { code: "22023", message: "x" } }) as never,
    );
    expect((await PUT(pedido({ atividades: [ATV] }), ctx())).status).toBe(422);
    vi.mocked(createClient).mockResolvedValue(
      banco({ rpcErro: { code: "42501", message: "x" } }) as never,
    );
    expect((await PUT(pedido({ atividades: [ATV] }), ctx())).status).toBe(403);
  });
  it("origem fora da organização: 404 sem chamar a função", async () => {
    const db = banco({ origem: false });
    vi.mocked(createClient).mockResolvedValue(db as never);
    expect((await PUT(pedido({ atividades: [] }), ctx())).status).toBe(404);
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
