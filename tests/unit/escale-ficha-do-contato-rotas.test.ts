import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const papel = { atual: "agent" as "viewer" | "agent" | "manager" };
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async (minimo: string) => {
    const ordem = ["viewer", "agent", "manager", "admin"];
    if (ordem.indexOf(papel.atual) < ordem.indexOf(minimo)) {
      return { ok: false, response: new Response("{}", { status: 403 }) };
    }
    return { ok: true, user: { id: "u1", idioma: "pt-BR", full_name: "Ana" }, org: { orgId: "o1", role: papel.atual } };
  }),
}));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

/** Um Supabase falso: cada `from(tabela)` devolve a resposta programada. */
const respostas = new Map<string, { data: unknown; error: unknown }>();
const inseridos: unknown[] = [];
function consulta(tabela: string) {
  const q: Record<string, unknown> = {};
  const fim = () => Promise.resolve(respostas.get(tabela) ?? { data: null, error: null });
  for (const m of ["select", "eq", "is", "in", "order", "update", "delete"]) q[m] = () => q;
  q.insert = (linha: unknown) => {
    inseridos.push(linha);
    return q;
  };
  q.maybeSingle = fim;
  q.single = fim;
  q.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) => fim().then(ok, erro);
  return q;
}
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ from: consulta })) }));

const banco = vi.hoisted(() => ({ negociosDoContato: vi.fn() }));
vi.mock("@/lib/escale/ficha-do-contato/banco", () => banco);

import { GET as GET_NEGOCIOS } from "@/app/api/v1/contatos/[id]/negocios/route";
import { GET as GET_NOTAS, POST as POST_NOTA } from "@/app/api/v1/contatos/[id]/notas/route";

const C = "11111111-2222-4333-8444-555555555555";
const ctx = { params: Promise.resolve({ id: C }) };

beforeEach(() => {
  papel.atual = "agent";
  respostas.clear();
  inseridos.length = 0;
  vi.clearAllMocks();
});

describe("GET /api/v1/contatos/[id]/negocios", () => {
  it("devolve os negócios e as etapas; contato de fora dá 404", async () => {
    banco.negociosDoContato.mockResolvedValueOnce({ negocios: [{ id: "n1" }], etapas: { e1: "Novo" } });
    const r = await GET_NEGOCIOS(new NextRequest("http://x"), ctx);
    expect(r.status).toBe(200);
    expect((await r.json()).data).toEqual({ negocios: [{ id: "n1" }], etapas: { e1: "Novo" } });
    banco.negociosDoContato.mockResolvedValueOnce(null);
    expect((await GET_NEGOCIOS(new NextRequest("http://x"), ctx)).status).toBe(404);
  });
});

describe("notas do contato", () => {
  it("POST grava a nota solta (lead_id nulo) com o autor da sessão", async () => {
    respostas.set("contacts", { data: { id: C }, error: null });
    respostas.set("crm_notas_do_negocio", { data: { id: "nt1", lead_id: null, contact_id: C, texto: "oi" }, error: null });
    const r = await POST_NOTA(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ texto: " oi " }) }), ctx);
    expect(r.status).toBe(201);
    expect(inseridos[0]).toMatchObject({ organization_id: "o1", lead_id: null, contact_id: C, user_id: "u1", texto: "oi" });
  });

  it("leitor não grava; texto vazio dá 422; GET lista", async () => {
    papel.atual = "viewer";
    expect((await POST_NOTA(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ texto: "x" }) }), ctx)).status).toBe(403);
    papel.atual = "agent";
    respostas.set("contacts", { data: { id: C }, error: null });
    expect((await POST_NOTA(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ texto: "  " }) }), ctx)).status).toBe(422);
    respostas.set("crm_notas_do_negocio", { data: [{ id: "nt1" }], error: null });
    const r = await GET_NOTAS(new NextRequest("http://x"), ctx);
    expect((await r.json()).data).toEqual([{ id: "nt1" }]);
  });
});
