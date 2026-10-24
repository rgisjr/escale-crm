import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_DETALHE } from "@/app/api/v1/prospeccao-da-casca/[id]/route";
import { GET as GET_OPCOES } from "@/app/api/v1/prospeccao-da-casca/opcoes/route";
import { GET } from "@/app/api/v1/prospeccao-da-casca/route";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { requireRole } from "@/lib/auth/require-role";
import { BUSCA, CONFIG, ID, NUMERO } from "@/tests/helpers/prospeccao-fixtures";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: vi.fn() }));

const pedido = (url: string) => new NextRequest(new URL(url, "http://x"));

const LINHA_DO_BANCO = {
  id: ID,
  name: "Clínicas Campinas",
  situacao: "em_progresso",
  numero_id: NUMERO,
  created_at: new Date("2026-10-10T12:00:00.000Z"),
  primeira_abordagem: new Date("2026-10-10T15:39:00.000Z"),
  total: "12",
  encontradas: 20,
  na_fila: 6,
  abordadas: 10,
  responderam: 4,
  qualificadas: 1,
  falhas: 2,
  nao_abordadas: 2,
};

function pool(respostas: Record<string, unknown>[][]) {
  const query = vi.fn();
  for (const rows of respostas) query.mockResolvedValueOnce({ rows });
  vi.mocked(getRequestPool).mockReturnValue({ query } as never);
  return query;
}

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(getRequestPool).mockReset();
});

describe("GET /api/v1/prospeccao-da-casca", () => {
  it("exige admin; manda organização, padrão, situações, limite e deslocamento; mapeia a linha", async () => {
    authOk("admin");
    const query = pool([[LINHA_DO_BANCO]]);
    const r = await GET(pedido("/api/v1/prospeccao-da-casca?p=2&n=10&q=clin&s=pausada,rascunho"));
    expect(r.status).toBe(200);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("admin", expect.anything());
    expect(query.mock.calls[0]![1]).toEqual([
      ORG_ID,
      "%clin%",
      ["pausada", "rascunho"],
      null,
      10,
      10,
    ]);
    const { data } = await r.json();
    expect(data).toMatchObject({ total: 12, pagina: 2, porPagina: 10 });
    expect(data.linhas[0]).toEqual({
      id: ID,
      nome: "Clínicas Campinas",
      situacao: "em_progresso",
      numeroId: NUMERO,
      criadaEm: "2026-10-10T12:00:00.000Z",
      primeiraAbordagem: "2026-10-10T15:39:00.000Z",
      encontradas: 20,
      naFila: 6,
      abordadas: 10,
      responderam: 4,
      qualificadas: 1,
      falhas: 2,
      naoAbordadas: 2,
    });
  });

  it("sem busca nem situação: padrão nulo e lista vazia de situações", async () => {
    authOk("admin");
    const query = pool([[]]);
    const r = await GET(pedido("/api/v1/prospeccao-da-casca"));
    expect(query.mock.calls[0]![1]).toEqual([ORG_ID, null, [], null, 10, 0]);
    expect((await r.json()).data).toEqual({ linhas: [], total: 0, pagina: 1, porPagina: 10 });
  });

  it("situação desconhecida é 422 sem tocar no banco", async () => {
    authOk("admin");
    const r = await GET(pedido("/api/v1/prospeccao-da-casca?s=xyz"));
    expect(r.status).toBe(422);
    expect(getRequestPool).not.toHaveBeenCalled();
  });

  it("quem não é admin recebe a resposta do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const r = await GET(pedido("/api/v1/prospeccao-da-casca"));
    expect(r.status).toBe(403);
    expect(getRequestPool).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/prospeccao-da-casca/[id]", () => {
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  it("devolve a linha, a campanha e as empresas com o progresso", async () => {
    authOk("admin");
    const query = pool([
      [LINHA_DO_BANCO],
      [
        {
          status: "running",
          search_status: "succeeded",
          search: BUSCA,
          config: CONFIG,
          cost_usd: "0.4512",
          skipped_count: 3,
          error: null,
        },
      ],
      [
        {
          id: "e1",
          data: {
            key: "p1",
            name: "Clínica Bela",
            phone: "+5519999990000",
            website: null,
            category: null,
            address: null,
            maps_url: null,
            rating: null,
            reviews: null,
            emails: [],
            socials: [],
          },
          status: "sent",
          selected: true,
          error: null,
          lead_id: "l1",
          conversation_id: "v1",
          attempted_at: new Date("2026-10-10T15:39:00.000Z"),
          message_status: "delivered",
          progresso: "replied",
        },
      ],
    ]);
    const r = await GET_DETALHE(pedido(`/api/v1/prospeccao-da-casca/${ID}`), params(ID));
    expect(r.status).toBe(200);
    expect(query.mock.calls[0]![1]).toEqual([ORG_ID, null, [], ID, 1, 0]);
    expect(query.mock.calls[1]![1]).toEqual([ORG_ID, ID]);
    expect(query.mock.calls[2]![1]).toEqual([ORG_ID, ID]);
    const { data } = await r.json();
    expect(data).toMatchObject({
      status: "running",
      statusDaBusca: "succeeded",
      busca: BUSCA,
      config: CONFIG,
      custoUsd: 0.4512,
      repetidas: 3,
      erro: null,
    });
    expect(data.empresas[0]).toMatchObject({
      id: "e1",
      selecionada: true,
      negocioId: "l1",
      conversaId: "v1",
      abordadaEm: "2026-10-10T15:39:00.000Z",
      statusDaMensagem: "delivered",
      progresso: "replied",
    });
  });

  it("id que não é uuid: 422; campanha de outra organização ou inexistente: 404", async () => {
    authOk("admin");
    expect((await GET_DETALHE(pedido("/api/v1/prospeccao-da-casca/x"), params("x"))).status).toBe(
      422,
    );
    pool([[], [], []]);
    expect(
      (await GET_DETALHE(pedido(`/api/v1/prospeccao-da-casca/${ID}`), params(ID))).status,
    ).toBe(404);
  });
});

describe("GET /api/v1/prospeccao-da-casca/opcoes", () => {
  it("chave, agentes, só números de texto livre e etapas", async () => {
    authOk("admin");
    pool([
      [{ organization_id: ORG_ID }],
      [{ id: "a1", name: "Sofia" }],
      [
        {
          id: NUMERO,
          display_name: "Comercial",
          phone_number: "+5519988887777",
          provider: "waha",
          status: "WORKING",
        },
        {
          id: "oficial",
          display_name: "Oficial",
          phone_number: "+551130000000",
          provider: "meta_cloud",
          status: "WORKING",
        },
      ],
      [{ id: "s1", name: "Abordado", pipeline_id: "f1", pipeline_name: "Prospecção ativa" }],
    ]);
    const r = await GET_OPCOES();
    expect((await r.json()).data).toEqual({
      configurada: true,
      agentes: [{ id: "a1", nome: "Sofia" }],
      numeros: [{ id: NUMERO, nome: "Comercial", telefone: "+5519988887777", status: "WORKING" }],
      etapas: [{ id: "s1", nome: "Abordado", funilId: "f1", funilNome: "Prospecção ativa" }],
    });
  });
});
