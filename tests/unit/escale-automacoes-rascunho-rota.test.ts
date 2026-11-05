import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/escale/automacoes/rascunho", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/escale/automacoes/rascunho")>()),
  lerRascunho: vi.fn(),
  gravarRascunho: vi.fn(),
  descartarRascunho: vi.fn(),
  criarEsqueleto: vi.fn(),
  descartarEsqueleto: vi.fn(async () => undefined),
  regraDaOrganizacao: vi.fn(),
}));

import { DELETE, GET, PUT } from "@/app/api/v1/automacoes-da-casca/[id]/rascunho/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { requireSupportWrite } from "@/lib/impersonate/support";
import {
  criarEsqueleto,
  descartarEsqueleto,
  descartarRascunho,
  gravarRascunho,
  lerRascunho,
  regraDaOrganizacao,
} from "@/lib/escale/automacoes/rascunho";

const ORG = "11111111-1111-4111-8111-111111111111";
const R1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const NOVA = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

function autenticar(papel: Role): void {
  vi.mocked(requireRole).mockImplementation((async (min: Role) =>
    roleAtLeast(papel, min)
      ? { ok: true, user: { id: "u1", idioma: "pt-BR", organizations: [] }, org: { orgId: ORG, name: "Org", role: papel } }
      : { ok: false, response: new Response(null, { status: 403 }) }) as never);
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (metodo: string, corpo?: unknown) =>
  new NextRequest("http://teste/api", { method: metodo, ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }) });
const desenho = (evento: string) => ({
  caixas: [{ id: "gatilho", type: "gatilho", position: { x: 0, y: 0 }, data: { kind: "gatilho", evento, tela: {} } }],
  ligacoes: [],
});
const corpo = async (r: Response) => (await r.json()) as { data?: Record<string, unknown>; error?: { message: string } };
const acoesAuditadas = () => vi.mocked(audit).mock.calls.map((c) => (c[0] as { action: string }).action);

beforeEach(() => {
  vi.clearAllMocks();
  autenticar("manager");
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("GET rascunho", () => {
  it("agente não lê", async () => {
    autenticar("agent");
    expect((await GET(req("GET"), ctx(R1))).status).toBe(403);
    expect(lerRascunho).not.toHaveBeenCalled();
  });

  it("gerente lê o rascunho da própria organização", async () => {
    vi.mocked(lerRascunho).mockResolvedValue({ nome: "A", desenho: desenho("lead.created") as never, atualizadoEm: "t" });
    const r = await GET(req("GET"), ctx(R1));
    expect(r.status).toBe(200);
    expect((await corpo(r)).data?.rascunho).toMatchObject({ nome: "A", atualizadoEm: "t" });
    expect(lerRascunho).toHaveBeenCalledWith(expect.anything(), ORG, R1);
  });

  it("id que não é uuid: 404", async () => {
    expect((await GET(req("GET"), ctx("abc"))).status).toBe(404);
  });
});

describe("PUT rascunho", () => {
  it("automação nova sem gatilho: 422 com a frase, e nada é criado", async () => {
    const r = await PUT(req("PUT", { nome: "Nova", desenho: desenho("") }), ctx("novo"));
    expect(r.status).toBe(422);
    expect((await corpo(r)).error?.message).toBe("Escolha o gatilho para salvar o rascunho.");
    expect(criarEsqueleto).not.toHaveBeenCalled();
  });

  it("automação nova com gatilho: cria o esqueleto e grava o rascunho nele", async () => {
    vi.mocked(criarEsqueleto).mockResolvedValue(NOVA);
    vi.mocked(gravarRascunho).mockResolvedValue("2026-11-04T12:00:00Z");
    const r = await PUT(req("PUT", { nome: "Nova", desenho: desenho("lead.created") }), ctx("novo"));
    expect(r.status).toBe(200);
    expect((await corpo(r)).data).toEqual({ ruleId: NOVA, atualizadoEm: "2026-11-04T12:00:00Z", criada: true });
    expect(criarEsqueleto).toHaveBeenCalledWith(expect.anything(), { orgId: ORG, userId: "u1", nome: "Nova", evento: "lead.created" });
    expect(gravarRascunho).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ orgId: ORG, ruleId: NOVA, userId: "u1", nome: "Nova" }));
    expect(acoesAuditadas()).toEqual(["automation.rule_created", "automation.draft_saved"]);
  });

  it("se o rascunho da nova falha, o esqueleto recém-criado sai", async () => {
    vi.mocked(criarEsqueleto).mockResolvedValue(NOVA);
    vi.mocked(gravarRascunho).mockRejectedValue(new Error("boom"));
    expect((await PUT(req("PUT", { nome: "Nova", desenho: desenho("lead.created") }), ctx("novo"))).status).toBe(500);
    expect(descartarEsqueleto).toHaveBeenCalledWith(expect.anything(), ORG, NOVA);
  });

  it("regra de outra organização: 404 e nada é gravado", async () => {
    vi.mocked(regraDaOrganizacao).mockResolvedValue(false);
    expect((await PUT(req("PUT", { nome: "A", desenho: desenho("") }), ctx(R1))).status).toBe(404);
    expect(gravarRascunho).not.toHaveBeenCalled();
  });

  it("regra existente grava mesmo sem gatilho escolhido", async () => {
    vi.mocked(regraDaOrganizacao).mockResolvedValue(true);
    vi.mocked(gravarRascunho).mockResolvedValue("t2");
    const r = await PUT(req("PUT", { nome: "A", desenho: desenho("") }), ctx(R1));
    expect(r.status).toBe(200);
    expect((await corpo(r)).data).toEqual({ ruleId: R1, atualizadoEm: "t2", criada: false });
    expect(criarEsqueleto).not.toHaveBeenCalled();
    expect(acoesAuditadas()).toEqual(["automation.draft_saved"]);
  });

  it("corpo inválido: 422", async () => {
    expect((await PUT(req("PUT", { nome: "A" }), ctx(R1))).status).toBe(422);
  });

  it("suporte só leitura não grava", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await PUT(req("PUT", { nome: "A", desenho: desenho("") }), ctx(R1))).status).toBe(403);
    expect(gravarRascunho).not.toHaveBeenCalled();
  });

  it("agente não grava", async () => {
    autenticar("agent");
    expect((await PUT(req("PUT", { nome: "A", desenho: desenho("") }), ctx(R1))).status).toBe(403);
    expect(gravarRascunho).not.toHaveBeenCalled();
  });
});

describe("DELETE rascunho", () => {
  it("descarta o rascunho da regra e audita", async () => {
    vi.mocked(descartarRascunho).mockResolvedValue(undefined);
    expect((await DELETE(req("DELETE"), ctx(R1))).status).toBe(200);
    expect(descartarRascunho).toHaveBeenCalledWith(expect.anything(), ORG, R1);
    expect(acoesAuditadas()).toEqual(["automation.draft_discarded"]);
  });
});
