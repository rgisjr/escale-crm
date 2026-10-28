import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { DELETE } from "@/app/api/v1/indicadores-da-casca/graficos/[id]/route";
import { POST as DUPLICAR } from "@/app/api/v1/indicadores-da-casca/graficos/[id]/duplicar/route";
import { GET } from "@/app/api/v1/indicadores-da-casca/paineis/[id]/graficos/route";
import { PATCH } from "@/app/api/v1/indicadores-da-casca/paineis/[id]/layout/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID } from "@/tests/helpers/stages-db-double";

const P1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const G1 = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const G2 = "1d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

function autenticar(papel: Role): void {
  vi.mocked(requireRole).mockImplementation((async (min: Role) =>
    roleAtLeast(papel, min)
      ? { ok: true, user: { id: USER_ID, idioma: "pt-BR", organizations: [] }, org: { orgId: ORG_ID, name: "Org", role: papel } }
      : { ok: false, response: new Response(null, { status: 403 }) }) as never);
}

type Resposta = { data: unknown; error: { message: string } | null };
type Chamada = { tabela: string; metodo: string; args: unknown[] };

/** Cliente falso: anota cada chamada e responde por tabela e operação (select/insert/update/delete). */
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
        const atual = lista.length > 1 ? (lista.shift() as Resposta) : (lista[0] as Resposta);
        return atual;
      };
      for (const m of ["select", "eq", "is", "order", "limit", "insert", "update", "delete"]) {
        c[m] = vi.fn((...args: unknown[]) => {
          chamadas.push({ tabela, metodo: m, args });
          if (["insert", "update", "delete"].includes(m)) operacao = m;
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
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (corpo?: unknown) =>
  new NextRequest("http://localhost/x", { method: "PATCH", body: corpo === undefined ? undefined : JSON.stringify(corpo) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  autenticar("manager");
});

describe("GET paineis/:id/graficos", () => {
  it("devolve os gráficos e corrige layout inválido", async () => {
    banco({
      "crm_paineis.select": PAINEL,
      "crm_graficos.select": {
        data: [
          { id: G1, nome: "A", descricao: null, tipo: "barra", layout: { x: 20, y: 0, w: 6, h: 4 }, pergunta: {}, opcoes: {} },
          { id: G2, nome: "B", descricao: null, tipo: "numero", layout: { x: 0, y: 1, w: 6, h: 4 }, pergunta: {}, opcoes: null },
        ],
        error: null,
      },
    });
    autenticar("agent");
    const r = await GET(req(), ctx(P1));
    const json = await r.json();
    expect(r.status).toBe(200);
    expect(json.data.graficos[0].layout).toEqual({ x: 0, y: 9999, w: 6, h: 4 });
    expect(json.data.graficos[1].layout).toEqual({ x: 0, y: 1, w: 6, h: 4 });
  });
  it("painel não lido é 404; viewer é 403; id inválido não toca o banco", async () => {
    banco({ "crm_paineis.select": { data: null, error: null } });
    expect((await GET(req(), ctx(P1))).status).toBe(404);
    autenticar("viewer");
    expect((await GET(req(), ctx(P1))).status).toBe(403);
    autenticar("agent");
    const db = banco({});
    expect((await GET(req(), ctx("nao-e-uuid"))).status).toBe(404);
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("PATCH paineis/:id/layout", () => {
  const item = (id: string, over = {}) => ({ id, x: 0, y: 0, w: 6, h: 4, ...over });
  it("agente é 403", async () => {
    autenticar("agent");
    banco({});
    expect((await PATCH(req({ itens: [item(G1)] }), ctx(P1))).status).toBe(403);
  });
  it("gerente grava um update por item com a organização da sessão", async () => {
    const db = banco({ "crm_paineis.select": PAINEL, "crm_graficos.update": { data: null, error: null } });
    const r = await PATCH(req({ itens: [item(G1), item(G2, { x: 6 })] }), ctx(P1));
    expect(r.status).toBe(200);
    expect((await r.json()).data.salvos).toBe(2);
    const updates = db.chamadas.filter((c) => c.tabela === "crm_graficos" && c.metodo === "update");
    expect(updates).toHaveLength(2);
    const orgs = db.chamadas.filter((c) => c.tabela === "crm_graficos" && c.metodo === "eq" && c.args[0] === "organization_id");
    expect(orgs.every((c) => c.args[1] === ORG_ID)).toBe(true);
  });
  it("422 para item fora da grade e para 31 itens", async () => {
    banco({ "crm_paineis.select": PAINEL });
    expect((await PATCH(req({ itens: [item(G1, { x: 20, w: 6 })] }), ctx(P1))).status).toBe(422);
    const muitos = Array.from({ length: 31 }, () => item(G1));
    expect((await PATCH(req({ itens: muitos }), ctx(P1))).status).toBe(422);
  });
  it("suporte somente leitura devolve a resposta da trava", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 423 }) as never);
    banco({});
    expect((await PATCH(req({ itens: [item(G1)] }), ctx(P1))).status).toBe(423);
  });
});

describe("POST graficos/:id/duplicar", () => {
  const original = { id: G1, painel_id: P1, nome: "Vendas", descricao: null, tipo: "barra", layout: { x: 0, y: 0, w: 6, h: 4 }, pergunta: { a: 1 }, opcoes: {} };
  it("insere a cópia no fim da grade com o nome certo", async () => {
    const db = banco({
      "crm_graficos.select": [
        { data: original, error: null },
        { data: [{ layout: { x: 0, y: 0, w: 6, h: 4 } }, { layout: { x: 6, y: 2, w: 6, h: 4 } }], error: null },
      ],
      "crm_graficos.insert": { data: { id: "novo" }, error: null },
    });
    const r = await DUPLICAR(req(), ctx(G1));
    expect(r.status).toBe(201);
    const insert = db.chamadas.find((c) => c.metodo === "insert")?.args[0] as Record<string, unknown>;
    expect(insert).toMatchObject({
      nome: "Vendas (cópia)",
      painel_id: P1,
      organization_id: ORG_ID,
      layout: { x: 0, y: 6, w: 6, h: 4 },
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "dashboard.chart_cloned" }));
  });
  it("limite de gráficos vira 409 com o texto da Clint", async () => {
    banco({
      "crm_graficos.select": [{ data: original, error: null }, { data: [], error: null }],
      "crm_graficos.insert": { data: null, error: { message: "limite_de_graficos" } },
    });
    const r = await DUPLICAR(req(), ctx(G1));
    expect(r.status).toBe(409);
    expect((await r.json()).error.message).toContain("até 30 charts");
  });
  it("não encontrado é 404 e id inválido não toca o banco", async () => {
    banco({ "crm_graficos.select": { data: null, error: null } });
    expect((await DUPLICAR(req(), ctx(G1))).status).toBe(404);
    const db = banco({});
    expect((await DUPLICAR(req(), ctx("x"))).status).toBe(404);
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("DELETE graficos/:id", () => {
  it("zero linhas é 404; uma é 200 com auditoria", async () => {
    banco({ "crm_graficos.delete": { data: [], error: null } });
    expect((await DELETE(req(), ctx(G1))).status).toBe(404);
    banco({ "crm_graficos.delete": { data: [{ id: G1 }], error: null } });
    const r = await DELETE(req(), ctx(G1));
    expect(r.status).toBe(200);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "dashboard.chart_deleted" }));
  });
  it("agente é 403", async () => {
    autenticar("agent");
    banco({});
    expect((await DELETE(req(), ctx(G1))).status).toBe(403);
  });
});
