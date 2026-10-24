import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/campanhas-da-casca/route";
import { GET as GET_RESUMO } from "@/app/api/v1/campanhas-da-casca/resumo/route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type Resposta = { data: unknown; error: { message: string } | null };

function banco(rpc: Record<string, Resposta>) {
  const db = {
    rpc: vi.fn((nome: string) => Promise.resolve(rpc[nome] ?? { data: [], error: null })),
    from: vi.fn(() => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { timezone: "America/Sao_Paulo" }, error: null });
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const pedido = (url: string) => new NextRequest(new URL(url, "http://x"));
const f = (filtros: unknown) => encodeURIComponent(JSON.stringify(filtros));
const NUMERO = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
});

describe("GET /api/v1/campanhas-da-casca", () => {
  it("exige gerente; compila o filtro com o fuso; pagina; devolve as linhas e o total", async () => {
    authOk("manager");
    const db = banco({
      fn_escale_lista_de_campanhas: {
        data: [
          {
            campaign_id: "c1",
            total: "12",
            nome: "Reativação",
            status: "completed",
            numero: NUMERO,
            solicitados: 30,
            agendada_para: null,
            iniciada_em: "2026-09-10T15:39:00Z",
            criada_em: "2026-09-10T12:00:00Z",
            adicionados: 30,
            enviados: 26,
            entregues: 24,
            lidos: 16,
            erros: 3,
          },
        ],
        error: null,
      },
    });
    const r = await GET(
      pedido(
        `/api/v1/campanhas-da-casca?p=2&n=10&f=${f({ busca: "Reat", status: ["completed"] })}`,
      ),
    );
    expect(r.status).toBe(200);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("manager", expect.anything());
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_lista_de_campanhas", {
      p_org: ORG_ID,
      p_filtros: { fuso: "America/Sao_Paulo", padrao: "%Reat%", status: ["completed"] },
      p_limite: 10,
      p_deslocamento: 10,
    });
    const { data } = await r.json();
    expect(data).toMatchObject({ total: 12, pagina: 2, porPagina: 10 });
    expect(data.linhas[0]).toEqual({
      id: "c1",
      nome: "Reativação",
      status: "completed",
      numeroId: NUMERO,
      solicitados: 30,
      agendadaPara: null,
      iniciadaEm: "2026-09-10T15:39:00Z",
      criadaEm: "2026-09-10T12:00:00Z",
      adicionados: 30,
      enviados: 26,
      entregues: 24,
      lidos: 16,
      erros: 3,
    });
  });

  it("página vazia tem total 0", async () => {
    authOk("manager");
    banco({});
    const { data } = await (await GET(pedido("/api/v1/campanhas-da-casca"))).json();
    expect(data).toEqual({ linhas: [], total: 0, pagina: 1, porPagina: 10 });
  });

  it("filtro ruim e 'por página' fora da lista são 422", async () => {
    authOk("manager");
    banco({});
    const r1 = await GET(pedido(`/api/v1/campanhas-da-casca?f=${f({ status: ["preparing"] })}`));
    expect(r1.status).toBe(422);
    expect((await r1.json()).error.message).toBe("Filtro inválido.");
    expect((await GET(pedido("/api/v1/campanhas-da-casca?n=7"))).status).toBe(422);
  });

  it("erro do banco é 500 com a mensagem", async () => {
    authOk("manager");
    banco({ fn_escale_lista_de_campanhas: { data: null, error: { message: "boom" } } });
    expect((await GET(pedido("/api/v1/campanhas-da-casca"))).status).toBe(500);
  });
});

describe("GET /api/v1/campanhas-da-casca/resumo", () => {
  it("as somas como número", async () => {
    authOk("manager");
    const db = banco({
      fn_escale_resumo_das_campanhas: {
        data: [
          {
            adicionados: "14989",
            enviados: "9922",
            entregues: "9110",
            lidos: "2408",
            erros: "4087",
          },
        ],
        error: null,
      },
    });
    const r = await GET_RESUMO(
      pedido(`/api/v1/campanhas-da-casca/resumo?f=${f({ numero: NUMERO })}`),
    );
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_resumo_das_campanhas", {
      p_org: ORG_ID,
      p_filtros: { fuso: "America/Sao_Paulo", numero: NUMERO },
    });
    expect((await r.json()).data).toEqual({
      adicionados: 14989,
      enviados: 9922,
      entregues: 9110,
      lidos: 2408,
      erros: 4087,
    });
  });
});
