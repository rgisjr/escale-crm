import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_DESTINATARIOS } from "@/app/api/v1/campanhas-da-casca/[id]/destinatarios/route";
import { GET as GET_NEGOCIOS } from "@/app/api/v1/campanhas-da-casca/[id]/negocios/route";
import { GET as GET_SUMARIO } from "@/app/api/v1/campanhas-da-casca/[id]/sumario/route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/campanhas/pool-de-numeros", () => ({
  lerPoolExtra: vi.fn(async () => ["e5ca1e00-8c00-4000-8000-00000000e001"]),
}));

type Resposta = { data: unknown; error: { message: string } | null };

const ID = "e5ca1e00-8c00-4000-8000-0000000000c1";
const NUMERO = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const LINHA = {
  id: ID,
  name: "10.09",
  status: "completed",
  channel_session_id: NUMERO,
  message_body: "Oi, {{primeiro_nome}}!",
  base_legal: "consent",
  lia_ref: null,
  intervalo_segundos: 30,
  teto_diario: null,
  teto_horario: null,
  janela_inicio_hora: null,
  janela_fim_hora: null,
  started_at: "2026-09-10T15:39:00Z",
  scheduled_at: null,
  created_at: "2026-09-10T12:00:00Z",
  escale_mensagem: {
    tipo: "modelo",
    nome: "msg1_ancca",
    idioma: "pt_BR",
    categoria: "MARKETING",
    corpo: "Oi, {{1}}!",
    variaveis: {},
  },
};

function banco({
  campanha = LINHA,
  rpc = {},
}: { campanha?: unknown; rpc?: Record<string, Resposta> } = {}) {
  const db = {
    rpc: vi.fn((nome: string) => Promise.resolve(rpc[nome] ?? { data: [], error: null })),
    from: vi.fn((tabela: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi
        .fn()
        .mockResolvedValue(
          tabela === "organizations"
            ? { data: { timezone: "America/Sao_Paulo" }, error: null }
            : { data: campanha, error: null },
        );
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const pedido = (url: string) => new NextRequest(new URL(url, "http://x"));
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });
const f = (filtros: unknown) => encodeURIComponent(JSON.stringify(filtros));

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
});

describe("GET /api/v1/campanhas-da-casca/[id]/sumario", () => {
  it("exige gerente; junta a campanha, o sumário, o ritmo, os motivos, o resultado e o fuso", async () => {
    authOk("manager");
    const db = banco({
      rpc: {
        fn_escale_sumario_da_campanha: {
          data: [
            {
              adicionados: 30,
              enviados: 26,
              entregues: 23,
              lidas: 16,
              respondidas: 10,
              leu_sem_resposta: 6,
              erros: 4,
              nao_enviados: 0,
              aguardando: 0,
              fora_da_lista: 2,
            },
          ],
          error: null,
        },
        fn_escale_ritmo_da_campanha: {
          data: [{ hora: "2026-09-10T12:00:00", envios: "30" }],
          error: null,
        },
        fn_escale_motivos_do_erro: { data: [{ codigo: "131049", quantidade: 2 }], error: null },
        fn_escale_resultado_da_campanha: {
          data: [
            {
              negocios: 8,
              valor_aberto_centavos: "1468092",
              valor_ganho_centavos: "0",
              mediana_segundos: null,
              benchmark: "0.43",
              taxa_da_campanha: "0.3333",
            },
          ],
          error: null,
        },
      },
    });
    const r = await GET_SUMARIO(pedido(`/api/v1/campanhas-da-casca/${ID}/sumario`), ctx());
    expect(r.status).toBe(200);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("manager", expect.anything());
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_ritmo_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_fuso: "America/Sao_Paulo",
    });
    const { data } = await r.json();
    expect(data.fuso).toBe("America/Sao_Paulo");
    expect(data.campanha).toEqual({
      id: ID,
      nome: "10.09",
      status: "completed",
      numeroId: NUMERO,
      numerosExtras: ["e5ca1e00-8c00-4000-8000-00000000e001"],
      mensagem: "Oi, {{primeiro_nome}}!",
      modelo: { nome: "msg1_ancca", idioma: "pt_BR", categoria: "MARKETING" },
      baseLegal: "consent",
      liaRef: null,
      ritmo: {
        intervaloSegundos: 30,
        tetoDiario: null,
        tetoHorario: null,
        janelaInicioHora: null,
        janelaFimHora: null,
      },
      iniciadaEm: "2026-09-10T15:39:00Z",
      agendadaPara: null,
      criadaEm: "2026-09-10T12:00:00Z",
    });
    expect(data.sumario).toMatchObject({ adicionados: 30, leuSemResposta: 6, foraDaLista: 2 });
    expect(data.ritmo).toEqual([{ hora: "2026-09-10T12:00:00", envios: 30 }]);
    expect(data.motivos).toEqual([{ codigo: "131049", quantidade: 2 }]);
    expect(data.resultado).toEqual({
      negocios: 8,
      valorAbertoCentavos: 1_468_092,
      valorGanhoCentavos: 0,
      medianaSegundos: null,
      benchmark: 0.43,
      taxaDaCampanha: 0.3333,
    });
  });

  it("campanha que não existe (ou de outra organização) e id inválido são 404", async () => {
    authOk("manager");
    banco({ campanha: null });
    const r = await GET_SUMARIO(pedido(`/api/v1/campanhas-da-casca/${ID}/sumario`), ctx());
    expect(r.status).toBe(404);
    expect((await r.json()).error.message).toBe("Campanha não encontrada.");
    expect((await GET_SUMARIO(pedido("/x"), ctx("xyz"))).status).toBe(404);
  });

  it("erro do banco é 500", async () => {
    authOk("manager");
    banco({ rpc: { fn_escale_sumario_da_campanha: { data: null, error: { message: "boom" } } } });
    expect((await GET_SUMARIO(pedido("/x"), ctx())).status).toBe(500);
  });
});

describe("GET /api/v1/campanhas-da-casca/[id]/destinatarios", () => {
  it("compila o filtro, pagina de 20 e dá nome às colunas", async () => {
    authOk("manager");
    const db = banco({
      rpc: {
        fn_escale_destinatarios_da_campanha: {
          data: [
            {
              destinatario_id: "r1",
              contato_id: "k1",
              telefone: "+5553984555965",
              nome: "Elza Maria",
              email: null,
              situacao: "lida",
              motivo: null,
              enviado_em: "2026-09-10T15:40:00Z",
              total: "30",
            },
          ],
          error: null,
        },
      },
    });
    const r = await GET_DESTINATARIOS(
      pedido(`/x?p=2&n=20&f=${f({ busca: "Elza", situacoes: ["lida"] })}`),
      ctx(),
    );
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_destinatarios_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_filtros: { padrao: "%Elza%", situacoes: ["lida"] },
      p_limite: 20,
      p_deslocamento: 20,
    });
    const { data } = await r.json();
    expect(data).toEqual({
      linhas: [
        {
          id: "r1",
          contatoId: "k1",
          telefone: "+5553984555965",
          nome: "Elza Maria",
          email: null,
          situacao: "lida",
          motivo: null,
          enviadoEm: "2026-09-10T15:40:00Z",
        },
      ],
      total: 30,
      pagina: 2,
      porPagina: 20,
    });
  });

  it("'por página' fora da lista e filtro ruim são 422", async () => {
    authOk("manager");
    banco();
    expect((await GET_DESTINATARIOS(pedido("/x?n=7"), ctx())).status).toBe(422);
    expect(
      (await GET_DESTINATARIOS(pedido(`/x?f=${f({ situacoes: ["xyz"] })}`), ctx())).status,
    ).toBe(422);
  });
});

describe("GET /api/v1/campanhas-da-casca/[id]/negocios", () => {
  it("a situação da gaveta e até 200", async () => {
    authOk("manager");
    const db = banco({
      rpc: {
        fn_escale_negocios_da_campanha: {
          data: [
            {
              lead_id: "l1",
              contato: "Elza",
              telefone: "+5553984555965",
              origem: "Vendas",
              status: "won",
              valor_centavos: "150000",
              criado_em: "2026-09-11T12:00:00Z",
              total: "1",
            },
          ],
          error: null,
        },
      },
    });
    const r = await GET_NEGOCIOS(pedido("/x?situacao=ganhos"), ctx());
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_negocios_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_situacao: "ganhos",
      p_limite: 200,
    });
    expect((await r.json()).data).toEqual({
      linhas: [
        {
          id: "l1",
          contato: "Elza",
          telefone: "+5553984555965",
          origem: "Vendas",
          status: "won",
          valorCentavos: 150000,
          criadoEm: "2026-09-11T12:00:00Z",
        },
      ],
      total: 1,
    });
  });

  it("situação desconhecida é 422", async () => {
    authOk("manager");
    banco();
    expect((await GET_NEGOCIOS(pedido("/x?situacao=perdidos"), ctx())).status).toBe(422);
  });
});
