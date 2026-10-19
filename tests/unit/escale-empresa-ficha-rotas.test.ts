import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as DELETE_EMPRESA, GET as GET_EMPRESA, PATCH as PATCH_EMPRESA } from "@/app/api/v1/empresas/[id]/route";
import { DELETE as REMOVER } from "@/app/api/v1/empresas/[id]/contatos/[contatoId]/route";
import { PUT as PRINCIPAL } from "@/app/api/v1/empresas/[id]/principal/route";
import { PUT as TROCAR } from "@/app/api/v1/contatos/[id]/empresa/route";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

type Resposta = { data: unknown; error: { code?: string; message: string } | null };

function banco(opts: { rpc?: Record<string, Resposta>; tabelas?: Record<string, Resposta> }) {
  const rpc = vi.fn((nome: string) => Promise.resolve(opts.rpc?.[nome] ?? { data: [], error: null }));
  const from = vi.fn((tabela: string) => {
    const r = opts.tabelas?.[tabela] ?? { data: [], error: null };
    const c: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "is", "order", "limit"]) c[m] = vi.fn(() => c);
    c.maybeSingle = vi.fn().mockResolvedValue(r);
    c.then = (ok: (x: Resposta) => unknown) => Promise.resolve(r).then(ok);
    return c;
  });
  const db = { rpc, from };
  vi.mocked(createClient).mockResolvedValue(db as never);
  vi.mocked(createAdminClient).mockReturnValue(db as never);
  return db;
}

const pedido = (url: string, init?: RequestInit) => new NextRequest(new URL(url, "http://x"), init as never);
const json = (corpo: unknown) => ({ method: "POST", body: JSON.stringify(corpo), headers: { "content-type": "application/json" } }) as RequestInit;
const CONTATO = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

const E = "6a1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const C = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const ctx = (p: Record<string, string>) => ({ params: Promise.resolve(p) }) as never;
const corpo = (method: string, c: unknown) => ({ method, body: JSON.stringify(c), headers: { "content-type": "application/json" } }) as RequestInit;

describe("ficha da empresa", () => {
  it("GET 404 com o texto da Clint quando a empresa não existe", async () => {
    authOk("viewer");
    banco({ tabelas: { companies: { data: null, error: null } } });
    const r = await GET_EMPRESA(pedido(`/api/v1/empresas/${E}`), ctx({ id: E }));
    expect(r.status).toBe(404);
    expect((await r.json()).error.message).toBe("Empresa não encontrada");
  });

  it("PATCH de campo fixo vai para a coluna; do catálogo, mescla no custom_fields; CNPJ inválido é 422", async () => {
    authOk("agent");
    const atualizacoes: unknown[] = [];
    const db = banco({ tabelas: { companies: { data: { id: E, custom_fields: { site: "a.com" } }, error: null } } });
    db.from.mockImplementation(((t: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi.fn().mockResolvedValue({ data: { id: E, custom_fields: { site: "a.com" } }, error: null });
      c.update = vi.fn((x: unknown) => { atualizacoes.push({ t, x }); return c; });
      c.then = (ok: (x: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(ok);
      return c;
    }) as never);
    expect((await PATCH_EMPRESA(pedido(`/api/v1/empresas/${E}`, corpo("PATCH", { chave: "cidade", valor: "Pelotas" })), ctx({ id: E }))).status).toBe(200);
    expect((await PATCH_EMPRESA(pedido(`/api/v1/empresas/${E}`, corpo("PATCH", { chave: "segmento", valor: "Varejo" })), ctx({ id: E }))).status).toBe(200);
    expect(atualizacoes).toEqual([
      { t: "companies", x: { city: "Pelotas" } },
      { t: "companies", x: { custom_fields: { site: "a.com", segmento: "Varejo" } } },
    ]);
    expect((await PATCH_EMPRESA(pedido(`/api/v1/empresas/${E}`, corpo("PATCH", { chave: "cnpj", valor: "123" })), ctx({ id: E }))).status).toBe(422);
  });

  it("DELETE só gerente ou acima", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    banco({});
    expect((await DELETE_EMPRESA(pedido(`/api/v1/empresas/${E}`, { method: "DELETE" }), ctx({ id: E }))).status).toBe(403);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("manager", expect.anything());
  });
});

describe("vínculos", () => {
  it("remover o principal sem o novo é 422 'Selecione o novo contato principal.'; o último devolve empresa_excluida", async () => {
    authOk("agent");
    banco({ rpc: { fn_escale_desvincular_contato_da_empresa: { data: null, error: { message: "escolha_o_principal" } } } });
    const r1 = await REMOVER(pedido(`/api/v1/empresas/${E}/contatos/${C}`, { method: "DELETE" }), ctx({ id: E, contatoId: C }));
    expect(r1.status).toBe(422);
    expect((await r1.json()).error.message).toBe("Selecione o novo contato principal.");
    banco({ rpc: { fn_escale_desvincular_contato_da_empresa: { data: "empresa_excluida", error: null } } });
    const r2 = await REMOVER(pedido(`/api/v1/empresas/${E}/contatos/${C}`, { method: "DELETE" }), ctx({ id: E, contatoId: C }));
    expect((await r2.json()).data).toEqual({ desfecho: "empresa_excluida" });
  });

  it("principal aceita nulo (tirar)", async () => {
    authOk("agent");
    const db = banco({ rpc: { fn_escale_tornar_principal: { data: null, error: null } } });
    expect((await PRINCIPAL(pedido(`/api/v1/empresas/${E}/principal`, corpo("PUT", { contato_id: null })), ctx({ id: E }))).status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_tornar_principal", { p_org: ORG_ID, p_empresa: E, p_contato: null });
  });

  it("trocar a empresa do contato por uma nova, 'limpar', cria vazia e vincula; corpo inválido é 422", async () => {
    authOk("agent");
    const db = banco({
      rpc: { fn_escale_criar_empresa: { data: E, error: null } },
      tabelas: { company_people: { data: [], error: null }, companies: { data: { id: E, trade_name: "Nova", legal_name: null, city: null, state: null, cnpj: null, custom_fields: {} }, error: null } },
    });
    const r = await TROCAR(pedido(`/api/v1/contatos/${C}/empresa`, corpo("PUT", { nova: { nome: "Nova", campos: "limpar" } })), ctx({ id: C }));
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_criar_empresa", expect.objectContaining({ p_nome: "Nova", p_contato: C, p_site: "" }));
    expect((await TROCAR(pedido(`/api/v1/contatos/${C}/empresa`, corpo("PUT", { qualquer: 1 })), ctx({ id: C }))).status).toBe(422);
  });
});
