import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const papel = { atual: "viewer" as "none" | "viewer" };
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async () =>
    papel.atual === "none"
      ? { ok: false, response: new Response("{}", { status: 403 }) }
      : { ok: true, user: { id: "u1", idioma: "pt-BR" }, org: { orgId: "o1", role: "viewer" } },
  ),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));

const banco = vi.hoisted(() => ({ comentariosDoContato: vi.fn() }));
vi.mock("@/lib/escale/comentarios/do-contato", () => banco);

import { GET } from "@/app/api/v1/contatos/[id]/comentarios/route";

const C = "11111111-2222-4333-8444-555555555555";
const ctx = (id = C) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  papel.atual = "viewer";
  vi.clearAllMocks();
});

describe("GET /api/v1/contatos/[id]/comentarios", () => {
  it("sem papel devolve a resposta do requireRole", async () => {
    papel.atual = "none";
    expect((await GET(new NextRequest("http://x"), ctx())).status).toBe(403);
  });

  it("id que não é uuid → 404", async () => {
    expect((await GET(new NextRequest("http://x"), ctx("abc"))).status).toBe(404);
  });

  it("contato não achado → 404", async () => {
    banco.comentariosDoContato.mockResolvedValueOnce(null);
    expect((await GET(new NextRequest("http://x"), ctx())).status).toBe(404);
  });

  it("ok → origem, recentes e total", async () => {
    const dados = { origem: null, recentes: [], total: 0 };
    banco.comentariosDoContato.mockResolvedValueOnce(dados);
    const r = await GET(new NextRequest("http://x"), ctx());
    expect(r.status).toBe(200);
    expect((await r.json()).data).toEqual(dados);
  });

  it("erro → 500 com requestId", async () => {
    banco.comentariosDoContato.mockRejectedValueOnce({ message: "boom" });
    const r = await GET(new NextRequest("http://x"), ctx());
    expect(r.status).toBe(500);
    const corpo = await r.json();
    expect(corpo.error?.code ?? corpo.meta?.requestId).toBeTruthy();
    expect(r.headers.get("x-request-id") ?? corpo.meta?.requestId ?? corpo.error?.details?.requestId).toBeTruthy();
  });
});
