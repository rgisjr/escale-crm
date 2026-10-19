import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_COLUNAS, PUT as PUT_COLUNAS } from "@/app/api/v1/colunas-das-listas/route";
import { GET as GET_LISTA } from "@/app/api/v1/lista-de-contatos/route";
import { requireRole } from "@/lib/auth/require-role";
import { parametrosDaBusca } from "@/lib/escale/contatos/lista";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/contacts/cpf", () => ({ hashCpf: (d: string) => `hash-${d}` }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Resposta = { data: unknown; error: { code?: string; message: string } | null };

/** Um supabase de mentira: `rpc` devolve a página; `from(tabela)` devolve as linhas daquela tabela. */
function banco(opts: { rpc?: Resposta; tabelas?: Record<string, Resposta>; gravado?: unknown[] }) {
  const rpc = vi.fn().mockResolvedValue(opts.rpc ?? { data: [], error: null });
  const from = vi.fn((tabela: string) => {
    const resposta = opts.tabelas?.[tabela] ?? { data: [], error: null };
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "limit"]) cadeia[m] = vi.fn(() => cadeia);
    cadeia.maybeSingle = vi.fn().mockResolvedValue(resposta);
    cadeia.then = (ok: (r: Resposta) => unknown) => Promise.resolve(resposta).then(ok);
    cadeia.update = vi.fn((corpo: unknown) => {
      opts.gravado?.push({ update: corpo });
      return cadeia;
    });
    cadeia.insert = vi.fn((corpo: unknown) => {
      opts.gravado?.push({ insert: corpo });
      return Promise.resolve({ data: null, error: null });
    });
    return cadeia;
  });
  vi.mocked(createClient).mockResolvedValue({ rpc, from } as never);
  return { rpc, from };
}

const pedido = (url: string, init?: RequestInit) =>
  new NextRequest(new URL(url, "http://x"), init as never);

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("manager");
});

describe("parametrosDaBusca", () => {
  it("sem busca, tudo nulo", () => {
    expect(parametrosDaBusca(undefined)).toEqual({
      padrao: null,
      digitos: [],
      cpfHash: null,
      vazia: false,
    });
  });
  it("termo curto demais não consulta", () => {
    expect(parametrosDaBusca("a").vazia).toBe(true);
  });
  it("telefone de 11 dígitos gera variantes e o hash do CPF", () => {
    const p = parametrosDaBusca("64999446816");
    expect(p.padrao).not.toBeNull();
    expect(p.digitos.length).toBeGreaterThan(0);
    expect(p.cpfHash).toBe("hash-64999446816");
  });
});

describe("GET /api/v1/lista-de-contatos", () => {
  it("chama a função com a visão, a página e o tamanho, e monta as linhas na ordem dela", async () => {
    const { rpc } = banco({
      rpc: {
        data: [
          { contact_id: "c2", total: 12, negocios: 1, negocio_unico: "l9" },
          { contact_id: "c1", total: 12, negocios: 0, negocio_unico: null },
        ],
        error: null,
      },
      tabelas: {
        contacts: {
          data: [
            {
              id: "c1",
              name: "Ana",
              display_name: null,
              email: "a@x.com",
              phone_number: "+5564999446816",
              tags: ["vip"],
              custom_fields: { link_instagram: "https://instagram.com/ana" },
              avatar_storage_path: "p/1.jpg",
              is_blocked: false,
              is_anonymized: false,
              is_personal: false,
              last_activity_at: null,
              created_at: "2026-10-01T10:00:00Z",
              source: "manual",
              birthdate: null,
              person_id: "p1",
            },
            {
              id: "c2",
              name: null,
              display_name: "Bruno",
              email: null,
              phone_number: null,
              tags: [],
              custom_fields: {},
              avatar_storage_path: null,
              is_blocked: true,
              is_anonymized: false,
              is_personal: false,
              last_activity_at: "2026-10-02T10:00:00Z",
              created_at: "2026-10-01T10:00:00Z",
              source: "whatsapp",
              birthdate: "1990-05-01",
            },
          ],
          error: null,
        },
        conversations: { data: [{ id: "cv1", contact_id: "c2" }], error: null },
        company_people: { data: [{ person_id: "p1", company_id: "e1", is_primary: true }], error: null },
        companies: { data: [{ id: "e1", trade_name: "Atlas", legal_name: null }], error: null },
      },
    });
    const res = await GET_LISTA(pedido("/api/v1/lista-de-contatos?v=com_negocio&p=2&n=10"));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_lista_de_contatos", {
      p_org: ORG_ID,
      p_visao: "com_negocio",
      p_padrao: null,
      p_digitos: [],
      p_cpf_hash: null,
      p_limite: 10,
      p_deslocamento: 10,
      p_filtros: {},
    });
    const corpo = (await res.json()) as {
      data: { total: number; linhas: Array<Record<string, unknown>> };
    };
    expect(corpo.data.total).toBe(12);
    expect(corpo.data.linhas.map((l) => l.id)).toEqual(["c2", "c1"]);
    expect(corpo.data.linhas[0]).toMatchObject({
      negocio_unico: "l9",
      conversa_id: "cv1",
      status: "bloqueado",
      tem_foto: false,
    });
    expect(corpo.data.linhas[1]).toMatchObject({
      instagram: "ana",
      tem_foto: true,
      status: "ativo",
      empresa: { id: "e1", nome: "Atlas" },
    });
    expect(JSON.stringify(corpo)).not.toContain("avatar_storage_path");
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("viewer");
  });

  it("tamanho de página fora da lista é 422", async () => {
    banco({});
    expect((await GET_LISTA(pedido("/api/v1/lista-de-contatos?n=7"))).status).toBe(422);
  });

  it("busca curta demais devolve vazio sem chamar o banco", async () => {
    const { rpc } = banco({});
    const res = await GET_LISTA(pedido("/api/v1/lista-de-contatos?q=a"));
    expect(rpc).not.toHaveBeenCalled();
    const corpo = (await res.json()) as { data: { total: number } };
    expect(corpo.data.total).toBe(0);
  });

  it("erro do banco é 500 sem a mensagem crua", async () => {
    banco({
      rpc: {
        data: null,
        error: { code: "XX000", message: "falha em fn_escale_lista_de_contatos" },
      },
    });
    const res = await GET_LISTA(pedido("/api/v1/lista-de-contatos"));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("fn_escale");
  });
});

describe("/api/v1/colunas-das-listas", () => {
  it("GET sem preferência devolve o padrão", async () => {
    banco({ tabelas: { crm_colunas_das_listas: { data: null, error: null } } });
    const res = await GET_COLUNAS(pedido("/api/v1/colunas-das-listas?lista=contatos"));
    const corpo = (await res.json()) as { data: { itens: Array<{ chave: string }> } };
    expect(corpo.data.itens.map((i) => i.chave)).toEqual(["contato", "tags", "negocios"]);
  });

  it("GET com lista desconhecida é 422", async () => {
    banco({});
    expect((await GET_COLUNAS(pedido("/api/v1/colunas-das-listas?lista=leads"))).status).toBe(422);
  });

  it("PUT grava para a pessoa da sessão (insert quando não há linha)", async () => {
    const gravado: unknown[] = [];
    banco({ tabelas: { crm_colunas_das_listas: { data: null, error: null } }, gravado });
    const res = await PUT_COLUNAS(
      pedido("/api/v1/colunas-das-listas", {
        method: "PUT",
        body: JSON.stringify({ lista: "contatos", itens: [{ tipo: "nativa", chave: "tags" }] }),
      }),
    );
    expect(res.status).toBe(200);
    expect(gravado).toEqual([
      {
        insert: {
          organization_id: ORG_ID,
          user_id: USER_ID,
          lista: "contatos",
          colunas: { itens: [{ tipo: "nativa", chave: "tags" }] },
        },
      },
    ]);
  });

  it("PUT de empresas aceita as nativas da lista de empresas e descarta as de contatos (Fase 2D)", async () => {
    const gravado: unknown[] = [];
    banco({ tabelas: { crm_colunas_das_listas: { data: null, error: null } }, gravado });
    const res = await PUT_COLUNAS(
      pedido("/api/v1/colunas-das-listas", {
        method: "PUT",
        body: JSON.stringify({
          lista: "empresas",
          itens: [
            { tipo: "nativa", chave: "valor_aberto" },
            { tipo: "nativa", chave: "tags" },
          ],
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(gravado).toEqual([
      {
        insert: {
          organization_id: ORG_ID,
          user_id: USER_ID,
          lista: "empresas",
          colunas: { itens: [{ tipo: "nativa", chave: "valor_aberto" }] },
        },
      },
    ]);
  });

  it("GET de empresas sem preferência devolve as cinco colunas da Clint", async () => {
    banco({ tabelas: { crm_colunas_das_listas: { data: null, error: null } } });
    const res = await GET_COLUNAS(pedido("/api/v1/colunas-das-listas?lista=empresas"));
    const corpo = (await res.json()) as { data: { itens: Array<{ chave: string }> } };
    expect(corpo.data.itens.map((i) => i.chave)).toEqual(["contato_principal", "segmento", "contatos", "valor_aberto", "negocios"]);
  });

  it("PUT com corpo inválido é 422; suporte somente leitura é barrado antes", async () => {
    banco({});
    const ruim = await PUT_COLUNAS(
      pedido("/api/v1/colunas-das-listas", {
        method: "PUT",
        body: JSON.stringify({ lista: "contatos", itens: "x" }),
      }),
    );
    expect(ruim.status).toBe(422);
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    const barrado = await PUT_COLUNAS(
      pedido("/api/v1/colunas-das-listas", {
        method: "PUT",
        body: JSON.stringify({ lista: "contatos", itens: [] }),
      }),
    );
    expect(barrado.status).toBe(403);
  });
});
