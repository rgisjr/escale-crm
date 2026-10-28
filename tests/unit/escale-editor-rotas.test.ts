import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ camposDaOrganizacao: vi.fn(), consultar: vi.fn() }));

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: () => ({}) }));
vi.mock("@/lib/escale/contatos/lista", () => ({ fusoDaOrganizacao: async () => "America/Sao_Paulo" }));
vi.mock("@/lib/escale/indicadores/campos-da-org", () => ({
  OBJETOS_COM_CAMPOS: ["negocio", "contato", "empresa"],
  objetosCitados: () => [],
  camposDaOrganizacao: mocks.camposDaOrganizacao,
}));
vi.mock("@/lib/escale/indicadores/motor/executar", () => ({ consultar: mocks.consultar }));

import { PATCH } from "@/app/api/v1/indicadores-da-casca/graficos/[id]/route";
import { POST } from "@/app/api/v1/indicadores-da-casca/graficos/route";
import { GET as OPCOES } from "@/app/api/v1/indicadores-da-casca/opcoes/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { limparCache } from "@/lib/escale/indicadores/motor/cache";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID } from "@/tests/helpers/stages-db-double";

const P1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const P2 = "8c9e6679-7425-40de-944b-e07fc1f90ae7";
const G1 = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const PERGUNTA = { indicadores: ["negocio.quantidade"], variaveis: ["negocio.origem"] };
const CORPO = { painelId: P1, nome: "Negócios por origem", tipo: "barra", pergunta: PERGUNTA, opcoes: {} };

function autenticar(papel: Role): void {
  vi.mocked(requireRole).mockImplementation((async (min: Role) =>
    roleAtLeast(papel, min)
      ? { ok: true, user: { id: USER_ID, idioma: "pt-BR", organizations: [] }, org: { orgId: ORG_ID, name: "Org", role: papel, timezone: "America/Sao_Paulo" } }
      : { ok: false, response: new Response(null, { status: 403 }) }) as never);
}

type Resposta = { data: unknown; error: { message: string } | null; count?: number };
type Chamada = { tabela: string; metodo: string; args: unknown[] };

/** Cliente falso: responde por `tabela.operacao`. */
function banco(respostas: Record<string, Resposta | Resposta[]>) {
  const chamadas: Chamada[] = [];
  const db = {
    chamadas,
    from: vi.fn((tabela: string) => {
      let operacao = "select";
      const c: Record<string, unknown> = {};
      const proxima = (): Resposta => {
        const r = respostas[`${tabela}.${operacao}`];
        const lista = Array.isArray(r) ? r : r ? [r] : [{ data: [], error: null }];
        return lista.length > 1 ? (lista.shift() as Resposta) : (lista[0] as Resposta);
      };
      for (const m of ["select", "eq", "is", "in", "order", "limit", "insert", "update", "not"]) {
        c[m] = vi.fn((...args: unknown[]) => {
          chamadas.push({ tabela, metodo: m, args });
          if (["insert", "update"].includes(m)) operacao = m;
          return c;
        });
      }
      c.maybeSingle = vi.fn(async () => {
        const r = proxima();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      });
      c.single = vi.fn(async () => proxima());
      c.then = (ok: (r: Resposta) => unknown) => Promise.resolve(proxima()).then(ok);
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const PAINEL = { data: { id: P1, nome: "Vendas", cor: "marca", icone: "briefcase", created_at: "2026-07-07", padrao: false }, error: null };
const requisicao = (metodo: string, corpo: unknown, url = "http://localhost/api") =>
  new NextRequest(url, { method: metodo, body: JSON.stringify(corpo), headers: { "content-type": "application/json" } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  limparCache();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  mocks.camposDaOrganizacao.mockResolvedValue(new Map());
  process.env.SUPABASE_DB_URL = "postgres://x";
  autenticar("manager");
});

describe("POST /graficos", () => {
  it("agente leva 403", async () => {
    autenticar("agent");
    expect((await POST(requisicao("POST", CORPO))).status).toBe(403);
  });

  it("suporte somente leitura recebe a resposta da trava", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 423 }) as never);
    expect((await POST(requisicao("POST", CORPO))).status).toBe(423);
  });

  it("corpo sem nome → 422", async () => {
    banco({});
    const { nome: _n, ...semNome } = CORPO;
    expect((await POST(requisicao("POST", semNome))).status).toBe(422);
  });

  it("assuntos misturados → 422 com o erro", async () => {
    banco({});
    const r = await POST(requisicao("POST", { ...CORPO, pergunta: { indicadores: ["negocio.quantidade", "conversa.iniciadas"] } }));
    expect(r.status).toBe(422);
    expect(JSON.stringify(await r.json())).toContain("mesmo assunto");
  });

  it("painel não lido → 404", async () => {
    banco({ "crm_paineis.select": { data: null, error: null } });
    expect((await POST(requisicao("POST", CORPO))).status).toBe(404);
  });

  it("cria na organização da sessão, no fim da grade, e audita", async () => {
    const db = banco({
      "crm_paineis.select": PAINEL,
      "crm_graficos.select": { data: [{ layout: { x: 0, y: 0, w: 12, h: 8 } }], error: null },
      "crm_graficos.insert": { data: { id: G1 }, error: null },
    });
    const r = await POST(requisicao("POST", CORPO));
    expect(r.status).toBe(201);
    const insert = db.chamadas.find((c) => c.metodo === "insert")?.args[0];
    expect(insert).toMatchObject({ organization_id: ORG_ID, criado_por: USER_ID, painel_id: P1, layout: { x: 0, y: 8, w: 12, h: 8 } });
    expect(vi.mocked(audit).mock.calls[0]?.[0]).toMatchObject({ action: "dashboard.chart_created" });
  });

  it("limite_de_graficos → 409 com o texto da Clint", async () => {
    banco({
      "crm_paineis.select": PAINEL,
      "crm_graficos.insert": { data: null, error: { message: "limite_de_graficos" } },
    });
    const r = await POST(requisicao("POST", CORPO));
    expect(r.status).toBe(409);
    expect(JSON.stringify(await r.json())).toContain("até 30 charts");
  });
});

describe("PATCH /graficos/:id", () => {
  const atual = { data: { id: G1, painel_id: P1, nome: "A", descricao: null, tipo: "linha", layout: { x: 0, y: 0, w: 12, h: 8 }, pergunta: PERGUNTA, opcoes: {} }, error: null };

  it("id que não é uuid → 404 sem tocar no banco", async () => {
    const db = banco({});
    expect((await PATCH(requisicao("PATCH", { nome: "x" }), ctx("lixo"))).status).toBe(404);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("gráfico não lido → 404", async () => {
    banco({ "crm_graficos.select": { data: null, error: null } });
    expect((await PATCH(requisicao("PATCH", { nome: "x" }), ctx(G1))).status).toBe(404);
  });

  it("só o nome → update só do nome", async () => {
    const db = banco({ "crm_graficos.select": atual, "crm_graficos.update": { data: [{ id: G1 }], error: null } });
    expect((await PATCH(requisicao("PATCH", { nome: "Novo" }), ctx(G1))).status).toBe(200);
    const update = db.chamadas.find((c) => c.metodo === "update")?.args[0] as Record<string, unknown>;
    expect(update.nome).toBe("Novo");
    expect(update).not.toHaveProperty("painel_id");
    expect(vi.mocked(audit).mock.calls[0]?.[0]).toMatchObject({ action: "dashboard.chart_updated" });
  });

  it("mover para painel com 30 → 409 sem update", async () => {
    const db = banco({
      "crm_graficos.select": [atual, { data: null, error: null, count: 30 }],
      "crm_paineis.select": { ...PAINEL, data: { ...PAINEL.data, id: P2 } },
    });
    const r = await PATCH(requisicao("PATCH", { painelId: P2 }), ctx(G1));
    expect(r.status).toBe(409);
    expect(db.chamadas.some((c) => c.metodo === "update")).toBe(false);
  });

  it("mover para painel com 12 → update com painel_id e layout no fim do destino", async () => {
    const db = banco({
      "crm_graficos.select": [atual, { data: null, error: null, count: 12 }, { data: [{ layout: { x: 0, y: 0, w: 12, h: 4 } }], error: null }],
      "crm_paineis.select": { ...PAINEL, data: { ...PAINEL.data, id: P2 } },
      "crm_graficos.update": { data: [{ id: G1 }], error: null },
    });
    expect((await PATCH(requisicao("PATCH", { painelId: P2 }), ctx(G1))).status).toBe(200);
    expect(db.chamadas.find((c) => c.metodo === "update")?.args[0]).toMatchObject({ painel_id: P2, layout: { x: 0, y: 4, w: 12, h: 8 } });
  });

  it("zero linhas atualizadas → 404", async () => {
    banco({ "crm_graficos.select": atual, "crm_graficos.update": { data: [], error: null } });
    expect((await PATCH(requisicao("PATCH", { nome: "x" }), ctx(G1))).status).toBe(404);
  });
});

describe("GET /opcoes", () => {
  const pedido = (dimensao: string) => new NextRequest(`http://localhost/api?dimensao=${encodeURIComponent(dimensao)}`);

  it("agente leva 403", async () => {
    autenticar("agent");
    expect((await OPCOES(pedido("negocio.etapa"))).status).toBe(403);
  });

  it("id com ponto e vírgula → 422", async () => {
    banco({});
    expect((await OPCOES(pedido("negocio.etapa;drop"))).status).toBe(422);
  });

  it("dimensão inexistente → 404", async () => {
    banco({});
    expect((await OPCOES(pedido("negocio.nao_existe"))).status).toBe(404);
  });

  it("etapas vêm de crm_stages com a organização e o nome da origem como grupo", async () => {
    const db = banco({
      "crm_pipelines.select": { data: [{ id: "p1", name: "Vendas" }], error: null },
      "crm_stages.select": { data: [{ id: "e1", name: "Novo", pipeline_id: "p1", position: 1 }], error: null },
    });
    const r = await OPCOES(pedido("negocio.etapa"));
    expect((await r.json()).data.opcoes).toEqual([{ valor: "e1", rotulo: "Novo", grupo: "Vendas" }]);
    expect(db.chamadas.some((c) => c.tabela === "crm_stages" && c.metodo === "eq" && c.args[1] === ORG_ID)).toBe(true);
  });

  it("status do negócio vem da lista fixa", async () => {
    banco({});
    const json = await (await OPCOES(pedido("negocio.status"))).json();
    expect(json.data.opcoes.map((o: { valor: string }) => o.valor)).toEqual(["open", "won", "lost"]);
  });

  it("motivo de perda sai pelo motor, sem nulos, com limite 200", async () => {
    banco({});
    mocks.consultar.mockResolvedValue({
      colunas: [],
      linhas: [{ v0: "Preço", v0_rotulo: "Preço" }, { v0: null }, { v0: "Prazo" }],
      truncado: false,
      duracaoMs: 1,
      avisos: [],
      ignorados: [],
    });
    const json = await (await OPCOES(pedido("negocio.motivo_de_perda"))).json();
    expect(json.data.opcoes.map((o: { valor: string }) => o.valor)).toEqual(["Preço", "Prazo"]);
    expect(mocks.consultar.mock.calls[0]?.[2]).toMatchObject({ variaveis: ["negocio.motivo_de_perda"], limite: 200 });
  });

  it("campo personalizado de seleção devolve as opções da definição", async () => {
    banco({});
    mocks.camposDaOrganizacao.mockResolvedValue(
      new Map([["campo:negocio:plano", { id: "campo:negocio:plano", nome: "Plano", objeto: "negocio", chave: "plano", tipo: "texto", opcoes: [{ value: "a", label: "Ouro" }] }]]),
    );
    const json = await (await OPCOES(pedido("campo:negocio:plano"))).json();
    expect(json.data.opcoes).toEqual([{ valor: "a", rotulo: "Ouro" }]);
  });
});
