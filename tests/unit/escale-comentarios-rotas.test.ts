// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publicacoes = vi.hoisted(() => vi.fn());
const credenciais = vi.hoisted(() => vi.fn());
const garantir = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/channels/zernio/credentials", () => ({ zernioCredsForAccountId: credenciais }));
vi.mock("@/lib/escale/comentarios/zernio", async (original) => ({
  ...((await original()) as object),
  publicacoesDaConta: publicacoes,
}));
vi.mock("@/lib/escale/comentarios/assinatura", () => ({ garantirAssinaturaDeComentarios: garantir }));

import { GET as GET_COMENTARIOS } from "@/app/api/v1/automacoes-da-casca/[id]/comentarios/route";
import { POST as POST_ASSINATURA } from "@/app/api/v1/escale/comentarios/assinatura/route";
import { GET as GET_PUBLICACOES } from "@/app/api/v1/escale/comentarios/publicacoes/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { SocialError } from "@/lib/channels/social/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authOk } from "@/tests/helpers/stages-db-double";

/** Fase 10B: as três rotas do gatilho de comentário. */
const CANAL = "e5ca1e00-9801-4000-8000-0000000000c1";
const REGRA = "e5ca1e00-9801-4000-8000-0000000000a1";

function adminComSessao(sessao: unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is"]) q[m] = vi.fn(() => q);
  q.maybeSingle = vi.fn().mockResolvedValue({ data: sessao, error: null });
  vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => q) } as never);
}
const sessao = (extra: Record<string, unknown> = {}) => ({
  zernio_account_id: "acc-1",
  status: "WORKING",
  metadata: { social_platform: "instagram" },
  ...extra,
});
const get = (url: string) => new NextRequest(new URL(url, "http://x"));
const post = (corpo: unknown) =>
  new NextRequest(new URL("/api/v1/escale/comentarios/assinatura", "http://x"), {
    method: "POST",
    body: JSON.stringify(corpo),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  authOk("manager");
  publicacoes.mockReset();
  credenciais.mockReset();
  garantir.mockReset();
  vi.mocked(audit).mockReset();
  credenciais.mockResolvedValue({ apiKey: "chave", accountId: "acc-1", baseUrl: "x", source: "session" });
});

describe("GET publicacoes", () => {
  const chamar = () => GET_PUBLICACOES(get(`/api/v1/escale/comentarios/publicacoes?canal=${CANAL}`));

  it("sem permissão de gerente → a resposta do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await chamar()).status).toBe(403);
  });
  it("canal que não é uuid → 404", async () => {
    adminComSessao(sessao());
    expect((await GET_PUBLICACOES(get("/api/v1/escale/comentarios/publicacoes?canal=x"))).status).toBe(404);
  });
  it("canal de outra org ou WhatsApp (sem sessão) → 404", async () => {
    adminComSessao(null);
    expect((await chamar()).status).toBe(404);
    adminComSessao(sessao({ metadata: { social_platform: "tiktok" } }));
    expect((await chamar()).status).toBe(404);
  });
  it("desconectado → 409 conta_desconectada", async () => {
    adminComSessao(sessao({ status: "FAILED" }));
    const r = await chamar();
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe("conta_desconectada");
  });
  it("401 do Zernio → 409 acesso_recusado", async () => {
    adminComSessao(sessao());
    publicacoes.mockResolvedValue({ ok: false, status: 401, corpo: {} });
    const r = await chamar();
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe("acesso_recusado");
  });
  it("outro erro do Zernio → 502 erro_ao_carregar", async () => {
    adminComSessao(sessao());
    publicacoes.mockResolvedValue({ ok: false, status: 500, corpo: {} });
    expect((await chamar()).status).toBe(502);
  });
  it("ok → { publicacoes }", async () => {
    adminComSessao(sessao());
    publicacoes.mockResolvedValue({ ok: true, dados: [{ id: "179" }] });
    const r = await chamar();
    expect(r.status).toBe(200);
    expect(((await r.json()) as { data: unknown }).data).toEqual({ publicacoes: [{ id: "179" }] });
    expect(publicacoes).toHaveBeenCalledWith("chave", "acc-1");
  });
});

describe("POST assinatura", () => {
  it("sem permissão → 403", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await POST_ASSINATURA(post({ canal: CANAL }))).status).toBe(403);
  });
  it("corpo inválido → 422", async () => {
    expect((await POST_ASSINATURA(post({ canal: "x" }))).status).toBe(422);
  });
  it("assinada → estado e auditoria; já assinada → sem auditoria", async () => {
    garantir.mockResolvedValueOnce("assinada").mockResolvedValueOnce("ja_assinada");
    const a = await POST_ASSINATURA(post({ canal: CANAL }));
    expect(((await a.json()) as { data: unknown }).data).toEqual({ estado: "assinada" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "automation.comment_subscription_ensured" }));
    vi.mocked(audit).mockClear();
    await POST_ASSINATURA(post({ canal: CANAL }));
    expect(audit).not.toHaveBeenCalled();
  });
  it("SocialError → o status dele", async () => {
    garantir.mockRejectedValue(new SocialError("Não há assinatura.", 422));
    expect((await POST_ASSINATURA(post({ canal: CANAL }))).status).toBe(422);
  });
});

describe("GET comentários (Insights)", () => {
  function banco(resumo: unknown) {
    const db = {
      rpc: vi.fn().mockResolvedValue({ data: resumo, error: null }),
      from: vi.fn(() => {
        const c: Record<string, unknown> = {};
        for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
        c.maybeSingle = vi.fn().mockResolvedValue({ data: { id: REGRA, name: "R", actions: [] }, error: null });
        return c;
      }),
    };
    vi.mocked(createClient).mockResolvedValue(db as never);
    return db;
  }
  const ctx = (id = REGRA) => ({ params: Promise.resolve({ id }) });

  it("id inválido → 404", async () => {
    banco({});
    expect((await GET_COMENTARIOS(get("/x"), ctx("nao-e-uuid"))).status).toBe(404);
  });
  it("devolve o resumo do RPC com o p_desde do período", async () => {
    const db = banco({ comentarios: 12, repetidos: 3, directs: 9, directs_com_falha: 1, respostas: 9, respostas_com_falha: 1 });
    const r = await GET_COMENTARIOS(get("/x?periodo=7d"), ctx());
    expect(((await r.json()) as { data: { comentarios: number } }).data.comentarios).toBe(12);
    const [nome, args] = db.rpc.mock.calls[0] as unknown as [string, { p_regra: string; p_desde: string }];
    expect(nome).toBe("fn_escale_resumo_dos_comentarios");
    expect(args.p_regra).toBe(REGRA);
    expect(Date.now() - Date.parse(args.p_desde)).toBeGreaterThan(6.9 * 86_400_000);
  });
  it("período inválido → 422", async () => {
    banco({});
    expect((await GET_COMENTARIOS(get("/x?periodo=1ano"), ctx())).status).toBe(422);
  });
});
