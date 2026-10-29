import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/escale/indicadores/graficos/banco", () => ({ lerGraficos: vi.fn() }));
vi.mock("@/lib/escale/indicadores/paineis/banco", async (importar) => ({
  ...(await importar<Record<string, unknown>>()),
  lerPainel: vi.fn(),
}));
vi.mock("@/lib/escale/indicadores/modelos/banco", async (importar) => ({
  ...(await importar<Record<string, unknown>>()),
  lerTemplatesDaOrganizacao: vi.fn(),
  lerTemplate: vi.fn(),
  criarPainelComGraficos: vi.fn(),
  tornarTemplate: vi.fn(),
  excluirTemplate: vi.fn(),
}));

import { DELETE } from "@/app/api/v1/indicadores-da-casca/modelos/[id]/route";
import { GET } from "@/app/api/v1/indicadores-da-casca/modelos/route";
import { POST as USAR } from "@/app/api/v1/indicadores-da-casca/modelos/usar/route";
import { POST as TORNAR } from "@/app/api/v1/indicadores-da-casca/paineis/[id]/tornar-template/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { lerGraficos } from "@/lib/escale/indicadores/graficos/banco";
import { criarPainelComGraficos, ErroDoModelo, excluirTemplate, lerTemplate, lerTemplatesDaOrganizacao, tornarTemplate } from "@/lib/escale/indicadores/modelos/banco";
import { lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID } from "@/tests/helpers/stages-db-double";

const ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const U1 = "22222222-2222-4222-8222-222222222222";
const O1 = "44444444-4444-4444-8444-444444444444";

function autenticar(papel: Role): void {
  vi.mocked(requireRole).mockImplementation((async (min: Role) =>
    roleAtLeast(papel, min)
      ? { ok: true, user: { id: USER_ID, idioma: "pt-BR", organizations: [] }, org: { orgId: ORG_ID, name: "Org", role: papel } }
      : { ok: false, response: new Response(null, { status: 403 }) }) as never);
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const usar = (corpo: unknown) =>
  USAR(new NextRequest(new URL("http://x/api/v1/indicadores-da-casca/modelos/usar"), { method: "POST", body: JSON.stringify(corpo) }));
const resposta = async (r: Response | { json: () => Promise<unknown> }) => (await r.json()) as { data?: Record<string, unknown>; error?: { message: string } };
const VAZIOS = { gruposDeOrigem: [], origens: [], usuarios: [], tags: [] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  vi.mocked(createClient).mockResolvedValue({} as never);
  vi.mocked(criarPainelComGraficos).mockResolvedValue({ id: "novo" });
  autenticar("manager");
});

describe("GET modelos", () => {
  it("agente → 403; gerente → os 4 do sistema (traduzidos) + os da organização", async () => {
    autenticar("agent");
    expect((await GET()).status).toBe(403);
    autenticar("manager");
    vi.mocked(lerTemplatesDaOrganizacao).mockResolvedValue([
      { origem: "organizacao", id: ID, nome: "Meu", cor: "marca", icone: "user", graficos: 2, criadoEm: "2026-10-28" },
    ]);
    const r = await GET();
    const { modelos } = (await resposta(r)).data as { modelos: Array<{ origem: string; nome: string }> };
    expect(modelos).toHaveLength(5);
    expect(modelos.filter((m) => m.origem === "sistema").map((m) => m.nome)).toContain("Conversão de vendas");
    expect(r.headers.get("Cache-Control")).toBe("private, max-age=30");
  });
});

describe("POST usar", () => {
  it("sistema → 201; cria '{modelo} 2' com cor/ícone do modelo e o filtro fixo em cada gráfico", async () => {
    const r = await usar({ modelo: { origem: "sistema", id: "atendimentos" }, filtros: { ...VAZIOS, usuarios: [U1] } });
    expect(r.status).toBe(201);
    const [, orgId, , painel, graficos, opcoes] = vi.mocked(criarPainelComGraficos).mock.calls[0]!;
    expect(orgId).toBe(ORG_ID);
    expect(painel).toEqual({ nome: "Atendimentos 2", cor: "#48DEA8", icone: "smile" });
    expect(opcoes).toEqual({ comoModelo: false });
    expect(graficos).toHaveLength(9);
    for (const g of graficos) {
      const p = g.pergunta as { filtroFixo?: { usuarios?: string[] } };
      expect(p.filtroFixo?.usuarios).toEqual([U1]);
    }
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "dashboard.created_from_template" }));
  });

  it("filtros vazios mantêm o fixo do modelo (nenhum)", async () => {
    await usar({ modelo: { origem: "sistema", id: "atendimentos" }, filtros: VAZIOS });
    const graficos = vi.mocked(criarPainelComGraficos).mock.calls[0]![4];
    expect((graficos[0]!.pergunta as { filtroFixo?: unknown }).filtroFixo).toBeUndefined();
  });

  it("template da organização: copia os gráficos; inexistente → 404 com o texto da Clint", async () => {
    vi.mocked(lerTemplate).mockResolvedValueOnce(null);
    const nao = await usar({ modelo: { origem: "organizacao", id: ID }, filtros: VAZIOS });
    expect(nao.status).toBe(404);
    expect((await resposta(nao)).error?.message).toBe("Template não encontrado. Recarregue e tente novamente.");
    vi.mocked(lerTemplate).mockResolvedValueOnce({ id: ID, nome: "Meu", cor: "marca", icone: "user" });
    vi.mocked(lerGraficos).mockResolvedValueOnce([
      { id: "g", nome: "G", descricao: null, tipo: "numero", layout: { x: 0, y: 0, w: 6, h: 4 }, pergunta: { indicadores: ["negocio.quantidade"] }, opcoes: {} },
    ]);
    const ok = await usar({ modelo: { origem: "organizacao", id: ID }, filtros: { ...VAZIOS, origens: [O1] } });
    expect(ok.status).toBe(201);
    const [, , , painel, graficos] = vi.mocked(criarPainelComGraficos).mock.calls[0]!;
    expect(painel).toMatchObject({ nome: "Meu 2" });
    expect((graficos[0]!.pergunta as { filtroFixo: unknown }).filtroFixo).toEqual({ origens: [O1] });
  });

  it("corpo inválido → 422; limite → 409; falha → 500 com o texto da Clint; suporte somente leitura", async () => {
    expect((await usar({ modelo: { origem: "sistema", id: "nao-existe" }, filtros: VAZIOS })).status).toBe(422);
    expect((await usar({ modelo: { origem: "sistema", id: "atendimentos" }, filtros: { usuarios: ["x"] } })).status).toBe(422);
    vi.mocked(criarPainelComGraficos).mockRejectedValueOnce(new ErroDoModelo("limite"));
    expect((await usar({ modelo: { origem: "sistema", id: "atendimentos" }, filtros: VAZIOS })).status).toBe(409);
    vi.mocked(criarPainelComGraficos).mockRejectedValueOnce(new ErroDoModelo("falhou"));
    const falhou = await usar({ modelo: { origem: "sistema", id: "atendimentos" }, filtros: VAZIOS });
    expect(falhou.status).toBe(500);
    expect((await resposta(falhou)).error?.message).toBe("Falha ao criar dashboard a partir do template.");
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 403 }) as never);
    expect((await usar({ modelo: { origem: "sistema", id: "atendimentos" }, filtros: VAZIOS })).status).toBe(403);
  });

  it("agente → 403 sem tocar no banco", async () => {
    autenticar("agent");
    expect((await usar({ modelo: { origem: "sistema", id: "atendimentos" }, filtros: VAZIOS })).status).toBe(403);
    expect(criarPainelComGraficos).not.toHaveBeenCalled();
  });

  it("o organization_id gravado é o da sessão, mesmo com outro no corpo (corpo estrito recusa)", async () => {
    const r = await usar({ modelo: { origem: "sistema", id: "atendimentos" }, filtros: VAZIOS, organization_id: "outra" });
    expect(r.status).toBe(422);
  });
});

describe("POST tornar-template", () => {
  const tornar = (id: string) => TORNAR(new NextRequest(new URL("http://x/t"), { method: "POST" }), ctx(id));
  it("201 e audit; painel não lido → 404; erro → 500 com o texto da Clint", async () => {
    vi.mocked(lerPainel).mockResolvedValueOnce({ id: ID, nome: "P", cor: "marca", icone: "user" } as never);
    vi.mocked(tornarTemplate).mockResolvedValueOnce({ id: "copia" });
    expect((await tornar(ID)).status).toBe(201);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "dashboard.template_created", metadata: { origem: ID } }));
    vi.mocked(lerPainel).mockResolvedValueOnce(null);
    expect((await tornar(ID)).status).toBe(404);
    expect((await tornar("nao-uuid")).status).toBe(404);
    vi.mocked(lerPainel).mockResolvedValueOnce({ id: ID, nome: "P", cor: "marca", icone: "user" } as never);
    vi.mocked(tornarTemplate).mockRejectedValueOnce(new Error("x"));
    const erro = await tornar(ID);
    expect(erro.status).toBe(500);
    expect((await resposta(erro)).error?.message).toBe("Falha na criação do template.");
  });
});

describe("DELETE modelos/:id", () => {
  const excluir = (id: string) => DELETE(new NextRequest(new URL("http://x/m"), { method: "DELETE" }), ctx(id));
  it("200; inexistente → 404; erro → 500", async () => {
    vi.mocked(excluirTemplate).mockResolvedValueOnce(undefined);
    expect((await excluir(ID)).status).toBe(200);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "dashboard.template_deleted" }));
    vi.mocked(excluirTemplate).mockRejectedValueOnce(new ErroDoModelo("nao_encontrado"));
    expect((await excluir(ID)).status).toBe(404);
    expect((await excluir("nao-uuid")).status).toBe(404);
    vi.mocked(excluirTemplate).mockRejectedValueOnce(new Error("x"));
    const r = await excluir(ID);
    expect(r.status).toBe(500);
    expect((await resposta(r)).error?.message).toBe("Falha na exclusão do template.");
  });
});
