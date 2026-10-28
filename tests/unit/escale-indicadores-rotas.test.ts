import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErroDoMotor } from "@/lib/escale/indicadores/motor/erros";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  consultar: vi.fn(),
  camposDaOrganizacao: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: () => ({ pool: true }) }));
vi.mock("@/lib/escale/contatos/lista", () => ({ fusoDaOrganizacao: async () => "America/Sao_Paulo" }));
vi.mock("@/lib/escale/indicadores/campos-da-org", () => ({
  OBJETOS_COM_CAMPOS: ["negocio", "contato", "empresa"],
  objetosCitados: () => [],
  camposDaOrganizacao: mocks.camposDaOrganizacao,
}));
vi.mock("@/lib/escale/indicadores/motor/executar", () => ({ consultar: mocks.consultar }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { GET } from "@/app/api/v1/indicadores-da-casca/catalogo/route";
import { POST } from "@/app/api/v1/indicadores-da-casca/consultar/route";
import { limparCache } from "@/lib/escale/indicadores/motor/cache";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PERGUNTA = { indicadores: ["negocio.ganhos"], variaveis: ["negocio.dono"] };

const requisicao = (corpo: unknown) =>
  new NextRequest("http://localhost/api/v1/indicadores-da-casca/consultar", {
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
  mocks.camposDaOrganizacao.mockResolvedValue(new Map());
  mocks.consultar.mockResolvedValue({ colunas: [], linhas: [{ i0: 1 }], truncado: false, duracaoMs: 3, avisos: [], ignorados: [] });
});

describe("POST consultar", () => {
  it("recusa quem não tem o papel", async () => {
    mocks.requireRole.mockResolvedValue({ ok: false, response: Response.json({ error: { code: "forbidden" } }, { status: 403 }) });
    expect((await POST(requisicao({ pergunta: PERGUNTA }))).status).toBe(403);
    expect(mocks.requireRole).toHaveBeenCalledWith("agent", expect.anything());
  });

  it("devolve as linhas e passa a sessão da pessoa e a organização ativa ao executor", async () => {
    const r = await POST(requisicao({ pergunta: PERGUNTA }));
    expect(r.status).toBe(200);
    expect((await r.json()).data.linhas).toEqual([{ i0: 1 }]);
    expect(mocks.consultar.mock.calls[0]?.[1]).toEqual({ orgId: ORG, userId: USER, fuso: "America/Sao_Paulo" });
  });

  it("`fresco` pula o cache e grava a resposta nova; chave desconhecida é 422", async () => {
    await POST(requisicao({ pergunta: PERGUNTA }));
    await POST(requisicao({ pergunta: PERGUNTA }));
    expect(mocks.consultar).toHaveBeenCalledTimes(1);
    await POST(requisicao({ pergunta: PERGUNTA, fresco: true }));
    expect(mocks.consultar).toHaveBeenCalledTimes(2);
    await POST(requisicao({ pergunta: PERGUNTA }));
    expect(mocks.consultar).toHaveBeenCalledTimes(2);
    expect((await POST(requisicao({ pergunta: PERGUNTA, outra: 1 }))).status).toBe(422);
  });

  it("422 para corpo inválido e para pergunta sem sentido", async () => {
    expect((await POST(requisicao({ pergunta: { indicadores: [] } }))).status).toBe(422);
    expect((await POST(requisicao({ pergunta: { indicadores: ["negocio.ganhos", "conversa.iniciadas"] } }))).status).toBe(422);
    expect(mocks.consultar).not.toHaveBeenCalled();
  });

  it("504 quando a consulta demora e 429 quando a fila está cheia", async () => {
    mocks.consultar.mockRejectedValueOnce(new ErroDoMotor("consulta_demorou"));
    const lenta = await POST(requisicao({ pergunta: PERGUNTA }));
    expect(lenta.status).toBe(504);
    expect((await lenta.json()).error.message).toBe("A consulta demorou mais de 8 segundos. Tente um período menor.");
    mocks.consultar.mockRejectedValueOnce(new ErroDoMotor("fila_cheia"));
    expect((await POST(requisicao({ pergunta: PERGUNTA }))).status).toBe(429);
  });

  it("503 sem SUPABASE_DB_URL e 500 genérico sem vazar a causa", async () => {
    delete process.env.SUPABASE_DB_URL;
    expect((await POST(requisicao({ pergunta: PERGUNTA }))).status).toBe(503);
    process.env.SUPABASE_DB_URL = "postgres://x";
    mocks.consultar.mockRejectedValueOnce(new Error("senha do banco: abc"));
    const r = await POST(requisicao({ pergunta: PERGUNTA }));
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("senha");
  });
});

describe("GET catalogo", () => {
  it("devolve o catálogo sem nenhum sql e com os campos da organização", async () => {
    mocks.camposDaOrganizacao.mockResolvedValue(
      new Map([["campo:negocio:orcamento", { id: "campo:negocio:orcamento", nome: "Orçamento", objeto: "negocio", chave: "orcamento", tipo: "numero" }]]),
    );
    const r = await GET();
    const json = await r.json();
    expect(json.data.assuntos).toHaveLength(9);
    expect(JSON.stringify(json)).not.toContain('"sql"');
    expect(json.data.camposPersonalizados.negocio).toHaveLength(1);
    expect(r.headers.get("Cache-Control")).toBe("private, max-age=60");
  });

  it("avisa que a etapa tem ordem natural sem entregar o fragmento", async () => {
    const json = await (await GET()).json();
    const negocio = json.data.assuntos.find((a: { id: string }) => a.id === "negocio");
    const etapa = negocio.variaveis.find((v: { id: string }) => v.id === "negocio.etapa");
    expect(etapa.ordemNatural).toBe(true);
    expect(negocio.variaveis.find((v: { id: string }) => v.id === "negocio.origem").ordemNatural).toBe(false);
    expect(JSON.stringify(json)).not.toContain("position");
    expect(etapa).toHaveProperty("descricao", null);
  });
});
