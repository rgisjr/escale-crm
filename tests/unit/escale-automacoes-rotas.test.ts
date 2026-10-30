import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { POST as DUPLICAR } from "@/app/api/v1/automacoes-da-casca/[id]/duplicar/route";
import { PUT as FAVORITA } from "@/app/api/v1/automacoes-da-casca/[id]/favorita/route";
import { PUT as ORGANIZACAO } from "@/app/api/v1/automacoes-da-casca/[id]/organizacao/route";
import { POST as EXCLUIR } from "@/app/api/v1/automacoes-da-casca/excluir/route";
import { POST as MOVER } from "@/app/api/v1/automacoes-da-casca/mover/route";
import { DELETE as EXCLUIR_PASTA, PATCH as EDITAR_PASTA } from "@/app/api/v1/automacoes-da-casca/pastas/[id]/route";
import { POST as CRIAR_PASTA } from "@/app/api/v1/automacoes-da-casca/pastas/route";
import { GET } from "@/app/api/v1/automacoes-da-casca/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID } from "@/tests/helpers/stages-db-double";

const R1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const R2 = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const P1 = "1b4e28ba-2fa1-41d2-883f-0016d3cca427";

function autenticar(papel: Role): void {
  vi.mocked(requireRole).mockImplementation((async (min: Role) =>
    roleAtLeast(papel, min)
      ? {
          ok: true,
          user: { id: USER_ID, idioma: "pt-BR", organizations: [] },
          org: { orgId: ORG_ID, name: "Org", role: papel },
        }
      : { ok: false, response: new Response(null, { status: 403 }) }) as never);
}

type Linha = Record<string, unknown>;
type Dados = Partial<Record<string, Linha[]>>;
type Chamada = { tabela: string; metodo: string; args: unknown[] };

/** Um cliente falso que anota cada chamada e responde por tabela. */
function banco(dados: Dados = {}, rpc: { data: unknown; error: { message: string } | null } = { data: "nova", error: null }) {
  const chamadas: Chamada[] = [];
  const db = {
    chamadas,
    rpc: vi.fn(async (nome: string, args: unknown) => {
      chamadas.push({ tabela: "rpc", metodo: nome, args: [args] });
      return rpc;
    }),
    from: vi.fn((tabela: string) => {
      const c: Record<string, unknown> = {};
      const linhas = dados[tabela] ?? [];
      for (const m of ["select", "eq", "is", "in", "order", "limit", "insert", "update", "upsert", "delete"]) {
        c[m] = vi.fn((...args: unknown[]) => {
          chamadas.push({ tabela, metodo: m, args });
          return c;
        });
      }
      c.maybeSingle = vi.fn(async () => ({ data: linhas[0] ?? null, error: null }));
      c.single = vi.fn(async () => ({ data: { id: "nova-pasta" }, error: null }));
      c.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data: linhas, error: null }).then(ok);
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (metodo: string, corpo?: unknown) =>
  new NextRequest(new URL("http://x/api/v1/automacoes-da-casca"), {
    method: metodo,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
const corpo = async (r: Response) => (await r.json()) as { data?: Record<string, unknown>; error?: { message: string } };

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("GET", () => {
  it("devolve automações sem o campo actions, com agentes pela Q1", async () => {
    autenticar("manager");
    const db = banco({
      automation_rules: [
        { id: R1, name: "A", is_active: true, updated_at: "2026-10-01T00:00:00Z", actions: [{ type: "send_ai_message", config: { agent_id: "g1" } }] },
      ],
      crm_automacoes_da_casca: [{ rule_id: R1, pasta_id: P1, forma: "editor" }],
      crm_automacoes_favoritas: [{ rule_id: R1 }],
      crm_pastas_de_automacao: [{ id: P1, nome: "Vendas", cor: "red", icone: "flag" }],
      ai_agents: [{ id: "g1", name: "Ana" }],
    });
    const r = await GET();
    expect(r.status).toBe(200);
    const { data } = await corpo(r);
    const autos = data?.automacoes as Linha[];
    expect(autos[0]).toEqual({
      id: R1, nome: "A", ativa: true, atualizadaEm: "2026-10-01T00:00:00Z",
      pastaId: P1, forma: "editor", favorita: true, agentes: ["g1"],
    });
    expect(autos[0] !== undefined && "actions" in autos[0]).toBe(false);
    expect(data?.pastas).toEqual([{ id: P1, nome: "Vendas", cor: "red", icone: "flag" }]);
    expect(data?.agentes).toEqual([{ id: "g1", nome: "Ana" }]);
    const leitura = db.chamadas.filter((c) => c.tabela === "automation_rules");
    expect(leitura.find((c) => c.metodo === "limit")?.args).toEqual([1000]);
    expect(leitura.find((c) => c.metodo === "eq")?.args).toEqual(["organization_id", ORG_ID]);
  });

  it("agente leva 403", async () => {
    autenticar("agent");
    expect((await GET()).status).toBe(403);
  });
});

describe("pastas", () => {
  it("POST: corpo inválido → 422; chave extra → 422", async () => {
    autenticar("manager");
    banco();
    expect((await CRIAR_PASTA(req("POST", { nome: "" }))).status).toBe(422);
    expect((await CRIAR_PASTA(req("POST", { nome: "a", organization_id: "x" }))).status).toBe(422);
  });

  it("POST: cria com a organização da sessão e os padrões", async () => {
    autenticar("manager");
    const db = banco();
    const r = await CRIAR_PASTA(req("POST", { nome: "Vendas" }));
    expect(r.status).toBe(201);
    const ins = db.chamadas.find((c) => c.metodo === "insert");
    expect(ins?.args[0]).toEqual({ organization_id: ORG_ID, nome: "Vendas", cor: "gray", icone: "folder" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "automation.folder_created" }));
  });

  it("POST: suporte somente leitura não toca no banco", async () => {
    autenticar("manager");
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    const db = banco();
    expect((await CRIAR_PASTA(req("POST", { nome: "a" }))).status).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("PATCH/DELETE: id que não é uuid → 404 sem banco", async () => {
    autenticar("manager");
    const db = banco();
    expect((await EDITAR_PASTA(req("PATCH", { nome: "a" }), ctx("x"))).status).toBe(404);
    expect((await EXCLUIR_PASTA(req("DELETE"), ctx("x"))).status).toBe(404);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("PATCH/DELETE: não encontrada → 404; sucesso audita", async () => {
    autenticar("manager");
    banco({ crm_pastas_de_automacao: [] });
    expect((await EDITAR_PASTA(req("PATCH", { nome: "a" }), ctx(P1))).status).toBe(404);
    expect((await EXCLUIR_PASTA(req("DELETE"), ctx(P1))).status).toBe(404);
    banco({ crm_pastas_de_automacao: [{ id: P1 }] });
    expect((await EDITAR_PASTA(req("PATCH", { nome: "a" }), ctx(P1))).status).toBe(200);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "automation.folder_updated" }));
    expect((await EXCLUIR_PASTA(req("DELETE"), ctx(P1))).status).toBe(200);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "automation.folder_deleted" }));
  });
});

describe("organização", () => {
  it("regra de outra organização → 404", async () => {
    autenticar("manager");
    banco({ automation_rules: [] });
    expect((await ORGANIZACAO(req("PUT", { forma: "fluxo" }), ctx(R1))).status).toBe(404);
  });

  it("pasta inexistente → 422", async () => {
    autenticar("manager");
    banco({ automation_rules: [{ id: R1 }], crm_pastas_de_automacao: [] });
    const r = await ORGANIZACAO(req("PUT", { pasta_id: P1 }), ctx(R1));
    expect(r.status).toBe(422);
    expect((await corpo(r)).error?.message).toBe("A pasta escolhida não existe mais.");
  });

  it("só a forma não audita; com pasta_id audita rule_moved", async () => {
    autenticar("manager");
    const db = banco({ automation_rules: [{ id: R1 }], crm_pastas_de_automacao: [{ id: P1 }] });
    expect((await ORGANIZACAO(req("PUT", { forma: "editor" }), ctx(R1))).status).toBe(200);
    expect(audit).not.toHaveBeenCalled();
    expect(db.chamadas.find((c) => c.metodo === "upsert")?.args[1]).toEqual({ onConflict: "rule_id" });
    expect((await ORGANIZACAO(req("PUT", { pasta_id: P1 }), ctx(R1))).status).toBe(200);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "automation.rule_moved" }));
  });
});

describe("favorita", () => {
  it("true faz upsert, false faz delete, regra alheia → 404", async () => {
    autenticar("manager");
    let db = banco({ automation_rules: [{ id: R1 }] });
    expect((await FAVORITA(req("PUT", { favorita: true }), ctx(R1))).status).toBe(200);
    expect(db.chamadas.some((c) => c.tabela === "crm_automacoes_favoritas" && c.metodo === "upsert")).toBe(true);
    db = banco({ automation_rules: [{ id: R1 }] });
    expect((await FAVORITA(req("PUT", { favorita: false }), ctx(R1))).status).toBe(200);
    expect(db.chamadas.some((c) => c.tabela === "crm_automacoes_favoritas" && c.metodo === "delete")).toBe(true);
    banco({ automation_rules: [] });
    expect((await FAVORITA(req("PUT", { favorita: true }), ctx(R1))).status).toBe(404);
  });
});

describe("duplicar", () => {
  it("chama a RPC com o nome da cópia e audita", async () => {
    autenticar("manager");
    const db = banco({ automation_rules: [{ name: "Vendas" }] });
    const r = await DUPLICAR(req("POST"), ctx(R1));
    expect(r.status).toBe(201);
    expect(db.chamadas.find((c) => c.tabela === "rpc")?.args[0]).toEqual({ p_regra: R1, p_nome: "Vendas (cópia)" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "automation.rule_cloned" }));
  });

  it("regra não lida → 404", async () => {
    autenticar("manager");
    banco({ automation_rules: [] });
    expect((await DUPLICAR(req("POST"), ctx(R1))).status).toBe(404);
  });
});

describe("lote", () => {
  it("mover: 101 ids → 422; devolve movidas e falhas", async () => {
    autenticar("manager");
    banco({ automation_rules: [{ id: R1 }] });
    const muitos = Array.from({ length: 101 }, () => R1);
    expect((await MOVER(req("POST", { ids: muitos, pasta_id: null }))).status).toBe(422);
    const r = await MOVER(req("POST", { ids: [R1, R2], pasta_id: null }));
    expect((await corpo(r)).data).toEqual({ movidas: [R1], falhas: [R2] });
  });

  it("excluir: devolve excluidas e falhas e audita uma vez por excluída", async () => {
    autenticar("manager");
    banco({ automation_rules: [{ id: R1 }] });
    const r = await EXCLUIR(req("POST", { ids: [R1, R2] }));
    expect((await corpo(r)).data).toEqual({ excluidas: [R1], falhas: [R2] });
    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "automation.rule_deleted", resourceId: R1 }));
  });
});
