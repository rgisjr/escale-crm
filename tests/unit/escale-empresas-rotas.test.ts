import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/v1/empresas/route";
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

describe("GET /api/v1/empresas", () => {
  it("chama a função com escopo, busca, dígitos do CNPJ e a página; devolve as linhas com o principal", async () => {
    authOk("viewer");
    const db = banco({
      rpc: {
        fn_escale_lista_de_empresas: {
          data: [{ company_id: "e1", total: 3, contatos: 1, negocios: 1, negocio_unico: "l1", valor_aberto_cents: 150050, principal: "c1" }],
          error: null,
        },
      },
      tabelas: {
        organizations: { data: { currency: "BRL" }, error: null },
        companies: { data: [{ id: "e1", trade_name: "Atlas", legal_name: null, cnpj: null, custom_fields: { segmento: "Varejo" } }], error: null },
        contacts: { data: [{ id: "c1", name: "Alex", display_name: null, phone_number: "+5553999998393", avatar_path: null }], error: null },
        conversations: { data: [], error: null },
      },
    });
    const r = await GET(pedido("/api/v1/empresas?q=11.222&e=todas&p=2&n=25"));
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_lista_de_empresas", expect.objectContaining({
      p_org: ORG_ID, p_escopo: "todas", p_digitos: "11222", p_limite: 25, p_deslocamento: 25,
    }));
    const { data } = await r.json();
    expect(data.total).toBe(3);
    expect(data.moeda).toBe("BRL");
    expect(data.linhas[0]).toMatchObject({ id: "e1", nome: "Atlas", valor_aberto: 1500.5, contatos: 1, negocio_unico: "l1", campos: { segmento: "Varejo" } });
    expect(data.linhas[0].principal).toMatchObject({ id: "c1", nome: "Alex", telefone: "+5553999998393" });
  });

  it("escopo inválido é 422", async () => {
    authOk("viewer");
    banco({});
    expect((await GET(pedido("/api/v1/empresas?e=xyz"))).status).toBe(422);
  });
});

describe("POST /api/v1/empresas", () => {
  it("viewer não cria; atendente cria pela função definer com o CNPJ normalizado", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    banco({});
    expect((await POST(pedido("/api/v1/empresas", json({ nome: "Atlas", contato_id: CONTATO })))).status).toBe(403);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("agent", expect.anything());

    authOk("agent");
    const db = banco({ rpc: { fn_escale_criar_empresa: { data: "e9", error: null } } });
    const r = await POST(pedido("/api/v1/empresas", json({ nome: "Atlas", cnpj: "11.222.333/0001-81", site: "atlas.com.br", contato_id: CONTATO })));
    expect(r.status).toBe(201);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_criar_empresa", expect.objectContaining({
      p_nome: "Atlas", p_cnpj: "11.222.333/0001-81", p_cnpj_normalizado: "11222333000181", p_site: "atlas.com.br", p_contato: CONTATO,
    }));
    expect((await r.json()).data).toEqual({ id: "e9" });
  });

  it("CNPJ inválido é 422; repetido é 409 com o texto", async () => {
    authOk("agent");
    banco({});
    const r1 = await POST(pedido("/api/v1/empresas", json({ nome: "Atlas", cnpj: "11.222.333/0001-80", contato_id: CONTATO })));
    expect(r1.status).toBe(422);
    expect((await r1.json()).error.message).toBe("CNPJ inválido.");
    banco({ rpc: { fn_escale_criar_empresa: { data: null, error: { code: "23505", message: "companies_org_normalized_cnpj_uidx" } } } });
    const r2 = await POST(pedido("/api/v1/empresas", json({ nome: "Atlas", cnpj: "11.222.333/0001-81", contato_id: CONTATO })));
    expect(r2.status).toBe(409);
    expect((await r2.json()).error.message).toBe("CNPJ já cadastrado em outra empresa.");
  });
});
