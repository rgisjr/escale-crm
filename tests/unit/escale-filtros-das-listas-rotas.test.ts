import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "@/app/api/v1/filtros-das-listas/[id]/route";
import { GET, POST } from "@/app/api/v1/filtros-das-listas/route";
import { GET as GET_LISTA } from "@/app/api/v1/lista-de-contatos/route";
import { audit } from "@/lib/audit";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Resposta = { data: unknown; error: { code?: string; message: string } | null };
const ID = "55555555-5555-4555-8555-555555555555";
const OUTRO = "66666666-6666-4666-8666-666666666666";

/** Supabase de mentira: cada tabela devolve a sua resposta; as escritas ficam anotadas. */
function banco(
  tabelas: Record<string, Resposta>,
  escrita: Resposta = { data: { id: ID }, error: null },
) {
  const gravado: Array<{ tabela: string; tipo: string; corpo?: unknown }> = [];
  const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
  const from = vi.fn((tabela: string) => {
    const resposta = tabelas[tabela] ?? { data: [], error: null };
    let atual: Resposta = resposta;
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "limit"]) cadeia[m] = vi.fn(() => cadeia);
    cadeia.maybeSingle = vi.fn(async () => {
      const d = atual.data;
      return { data: Array.isArray(d) ? (d[0] ?? null) : d, error: atual.error };
    });
    cadeia.single = vi.fn(async () => atual);
    cadeia.then = (ok: (r: Resposta) => unknown) => Promise.resolve(atual).then(ok);
    for (const tipo of ["insert", "update", "delete"]) {
      cadeia[tipo] = vi.fn((corpo?: unknown) => {
        gravado.push({ tabela, tipo, corpo });
        atual = escrita;
        return cadeia;
      });
    }
    return cadeia;
  });
  vi.mocked(createClient).mockResolvedValue({ rpc, from } as never);
  return { rpc, from, gravado };
}

const linha = (extra: object) => ({
  id: OUTRO,
  user_id: USER_ID,
  nome: "Clientes em aberto",
  compartilhado: false,
  criterios: { telefone: "com" },
  ...extra,
});

const pedido = (url: string, init?: { method?: string; body?: unknown }) =>
  new NextRequest(new URL(url, "http://x"), {
    method: init?.method ?? "GET",
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  } as never);
const comId = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  // `authOk` só aceita "manager" | "admin" (tests/helpers/stages-db-double.ts, L503); as rotas pedem viewer.
  authOk();
});

describe("GET /api/v1/filtros-das-listas", () => {
  it("lista inválida é 422", async () => {
    banco({});
    expect((await GET(pedido("/api/v1/filtros-das-listas?lista=negocios"))).status).toBe(422);
  });

  it("devolve os filtros com 'meu' e critérios limpos", async () => {
    banco({
      crm_filtros_das_listas: {
        data: [
          linha({}),
          linha({ id: ID, user_id: "outra", compartilhado: true, criterios: { lixo: 1 } }),
        ],
        error: null,
      },
    });
    const r = await GET(pedido("/api/v1/filtros-das-listas?lista=contatos"));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { data: Array<{ meu: boolean; criterios: object }> };
    expect(corpo.data.map((f) => f.meu)).toEqual([true, false]);
    expect(corpo.data[0]?.criterios).toEqual({ telefone: "com" });
    expect(corpo.data[1]?.criterios).toEqual({});
  });
});

describe("POST /api/v1/filtros-das-listas", () => {
  const corpo = {
    lista: "contatos",
    nome: "  VIPs  ",
    compartilhado: true,
    criterios: {
      tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "vip" }] }] },
    },
  };

  it("o acompanhamento só-leitura não grava", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    banco({});
    expect(
      (await POST(pedido("/api/v1/filtros-das-listas", { method: "POST", body: corpo }))).status,
    ).toBe(403);
  });

  it("nome vazio é 422; repetido (sem caixa) é 409", async () => {
    banco({ crm_filtros_das_listas: { data: [linha({ nome: "vips" })], error: null } });
    expect(
      (
        await POST(
          pedido("/api/v1/filtros-das-listas", { method: "POST", body: { ...corpo, nome: "  " } }),
        )
      ).status,
    ).toBe(422);
    expect(
      (await POST(pedido("/api/v1/filtros-das-listas", { method: "POST", body: corpo }))).status,
    ).toBe(409);
  });

  it("o 21º é recusado com o texto da Clint", async () => {
    const vinte = Array.from({ length: 20 }, (_, i) => linha({ id: `${i}`, nome: `F${i}` }));
    banco({ crm_filtros_das_listas: { data: vinte, error: null } });
    const r = await POST(pedido("/api/v1/filtros-das-listas", { method: "POST", body: corpo }));
    expect(r.status).toBe(422);
    expect(JSON.stringify(await r.json())).toContain("Limite de 20 filtros salvos atingido");
  });

  it("grava com o nome limpo, os critérios enxutos e audita", async () => {
    const { gravado } = banco({ crm_filtros_das_listas: { data: [], error: null } });
    const r = await POST(pedido("/api/v1/filtros-das-listas", { method: "POST", body: corpo }));
    expect(r.status).toBe(201);
    expect(gravado[0]).toMatchObject({
      tipo: "insert",
      corpo: {
        organization_id: ORG_ID,
        user_id: USER_ID,
        lista: "contatos",
        nome: "VIPs",
        compartilhado: true,
        criterios: {
          tags: {
            combinar: "ou",
            grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "vip" }] }],
          },
        },
      },
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "list_filter.created" }));
  });
});

describe("PATCH e DELETE /api/v1/filtros-das-listas/[id]", () => {
  it("filtro que não é meu é 404", async () => {
    banco({ crm_filtros_das_listas: { data: null, error: null } });
    expect(
      (await PATCH(pedido(`/x/${ID}`, { method: "PATCH", body: { nome: "Novo" } }), comId(ID)))
        .status,
    ).toBe(404);
    expect((await DELETE(pedido(`/x/${ID}`, { method: "DELETE" }), comId(ID))).status).toBe(404);
  });

  it("id que não é uuid é 422", async () => {
    banco({});
    expect((await DELETE(pedido("/x/abc", { method: "DELETE" }), comId("abc"))).status).toBe(422);
  });

  it("renomear para um nome que já tenho é 409", async () => {
    banco({
      crm_filtros_das_listas: {
        data: [
          linha({ id: ID, nome: "Antigo", lista: "contatos" }),
          linha({ nome: "Novo", lista: "contatos" }),
        ],
        error: null,
      },
    });
    expect(
      (await PATCH(pedido(`/x/${ID}`, { method: "PATCH", body: { nome: "novo" } }), comId(ID)))
        .status,
    ).toBe(409);
  });

  it("compartilhar e excluir gravam e auditam", async () => {
    const { gravado } = banco({
      crm_filtros_das_listas: { data: [linha({ id: ID, lista: "contatos" })], error: null },
    });
    expect(
      (
        await PATCH(
          pedido(`/x/${ID}`, { method: "PATCH", body: { compartilhado: true } }),
          comId(ID),
        )
      ).status,
    ).toBe(200);
    expect(gravado.at(-1)).toMatchObject({ tipo: "update", corpo: { compartilhado: true } });
    expect((await DELETE(pedido(`/x/${ID}`, { method: "DELETE" }), comId(ID))).status).toBe(200);
    expect(gravado.at(-1)).toMatchObject({ tipo: "delete" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "list_filter.deleted" }));
  });
});

describe("GET /api/v1/lista-de-contatos com filtro", () => {
  it("f inválido é 422", async () => {
    banco({});
    expect(
      (await GET_LISTA(pedido(`/api/v1/lista-de-contatos?f=${encodeURIComponent("{x")}`))).status,
    ).toBe(422);
  });

  it("f válido vai compilado, com o fuso da organização", async () => {
    const { rpc } = banco({ organizations: { data: { timezone: "America/Manaus" }, error: null } });
    const f = encodeURIComponent(JSON.stringify({ telefone: "sem" }));
    expect((await GET_LISTA(pedido(`/api/v1/lista-de-contatos?f=${f}`))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "fn_escale_lista_de_contatos",
      expect.objectContaining({ p_filtros: { fuso: "America/Manaus", telefone: "sem" } }),
    );
  });
});
