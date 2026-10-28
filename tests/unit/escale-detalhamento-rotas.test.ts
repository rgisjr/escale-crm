import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErroDoMotor } from "@/lib/escale/indicadores/motor/erros";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  detalhar: vi.fn(),
  detalharParaCsv: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: () => ({ pool: true }) }));
vi.mock("@/lib/escale/contatos/lista", () => ({ fusoDaOrganizacao: async () => "America/Sao_Paulo" }));
vi.mock("@/lib/escale/indicadores/campos-da-org", () => ({
  OBJETOS_COM_CAMPOS: ["negocio", "contato", "empresa"],
  objetosCitados: () => [],
  camposDaOrganizacao: async () => new Map(),
}));
vi.mock("@/lib/escale/indicadores/motor/executar", () => ({
  detalhar: mocks.detalhar,
  detalharParaCsv: mocks.detalharParaCsv,
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { POST as CSV } from "@/app/api/v1/indicadores-da-casca/detalhar/csv/route";
import { POST } from "@/app/api/v1/indicadores-da-casca/detalhar/route";
import { limparCache } from "@/lib/escale/indicadores/motor/cache";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PEDIDO = { pergunta: { indicadores: ["negocio.ganhos"] }, indicador: "negocio.ganhos" };
const requisicao = (corpo: unknown, caminho = "detalhar") =>
  new NextRequest(`http://localhost/api/v1/indicadores-da-casca/${caminho}`, {
    method: "POST",
    body: JSON.stringify(corpo),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  limparCache();
  process.env.SUPABASE_DB_URL = "postgres://x";
  mocks.requireRole.mockResolvedValue({
    ok: true,
    user: { id: USER, idioma: "pt-BR" },
    org: { orgId: ORG, timezone: "America/Sao_Paulo" },
  });
  mocks.detalhar.mockResolvedValue({ colunas: [{ chave: "id", nome: "ID", formato: null }], linhas: [{ id: "x" }], total: 1, teto: false });
  mocks.detalharParaCsv.mockImplementation(async (_p, _s, _d, aoReceber: (l: Record<string, unknown>) => void) => {
    aoReceber({ id: "x", valor: 1500 });
    return {
      colunas: [
        { chave: "id", nome: "ID", formato: null },
        { chave: "valor", nome: "Valor", formato: "valor" },
      ],
      linhas: 1,
      truncado: false,
    };
  });
});

describe("POST detalhar", () => {
  it("exige o papel agent e devolve a página com a sessão da pessoa", async () => {
    const r = await POST(requisicao(PEDIDO));
    expect(r.status).toBe(200);
    expect(mocks.requireRole).toHaveBeenCalledWith("agent", expect.anything());
    const json = await r.json();
    expect(json.data).toMatchObject({ total: 1, pagina: 1, porPagina: 10 });
    expect(mocks.detalhar.mock.calls[0]?.[1]).toEqual({ orgId: ORG, userId: USER, fuso: "America/Sao_Paulo" });
  });

  it("recusa quem não tem o papel (403)", async () => {
    mocks.requireRole.mockResolvedValue({ ok: false, response: Response.json({ error: { code: "forbidden" } }, { status: 403 }) });
    expect((await POST(requisicao(PEDIDO))).status).toBe(403);
  });

  it("422 para página 0 e para indicador sem detalhamento, com o texto da Clint", async () => {
    expect((await POST(requisicao({ ...PEDIDO, pagina: 0 }))).status).toBe(422);
    const r = await POST(
      requisicao({ pergunta: { indicadores: ["negocio.taxa_de_conversao"] }, indicador: "negocio.taxa_de_conversao" }),
    );
    expect(r.status).toBe(422);
    expect((await r.json()).error.message).toBe("Essa métrica ainda não suporta detalhamento.");
    expect(mocks.detalhar).not.toHaveBeenCalled();
  });

  it("504 quando demora e 500 sem vazar a causa", async () => {
    mocks.detalhar.mockRejectedValueOnce(new ErroDoMotor("consulta_demorou"));
    expect((await POST(requisicao(PEDIDO))).status).toBe(504);
    mocks.detalhar.mockRejectedValueOnce(new Error("senha: abc"));
    const r = await POST(requisicao({ ...PEDIDO, pagina: 2 }));
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("senha");
  });
});

describe("POST detalhar/csv", () => {
  it("devolve text/csv em formato brasileiro, audita e não marca truncamento", async () => {
    const r = await CSV(requisicao(PEDIDO, "detalhar/csv"));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/csv");
    expect(r.headers.get("content-disposition")).toContain("attachment");
    expect(r.headers.get("x-escale-truncado")).toBeNull();
    expect(await r.text()).toBe('ID,Valor\r\nx,"1500,00"\r\n');
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "dashboard.chart_drilldown_exported" }));
  });

  it("marca x-escale-truncado quando bateu o teto", async () => {
    mocks.detalharParaCsv.mockResolvedValueOnce({ colunas: [], linhas: 20000, truncado: true });
    const r = await CSV(requisicao(PEDIDO, "detalhar/csv"));
    expect(r.headers.get("x-escale-truncado")).toBe("1");
  });

  it("recusa viewer (403) e corpo com página", async () => {
    expect((await CSV(requisicao({ ...PEDIDO, pagina: 1 }, "detalhar/csv"))).status).toBe(422);
    mocks.requireRole.mockResolvedValue({ ok: false, response: Response.json({}, { status: 403 }) });
    expect((await CSV(requisicao(PEDIDO, "detalhar/csv"))).status).toBe(403);
  });
});
