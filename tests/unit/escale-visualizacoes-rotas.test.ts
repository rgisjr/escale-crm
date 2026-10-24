import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { GET, POST } from "@/app/api/v1/pipeline-views/route";
import { DELETE, PATCH } from "@/app/api/v1/pipeline-views/[id]/route";
import { ORG_ID, OUTRA_ORG, authOk, makeDb, type PipelineRow } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const G = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const F_LEADS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const F_NAYARA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const F_MORTO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3";
const F_VIZINHO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4";
const V_TIME = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const V_VIZINHO = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const V_NOVA = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
const P_ANA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const P_BIA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd2";

/** Três origens da organização (uma arquivada), uma do vizinho, e uma visualização de cada lado. */
function banco() {
  const db = makeDb({
    pipelines: [
      { id: F_LEADS, name: "Leads", organization_id: ORG_ID, is_archived: false, is_default: true, position: 1000, group_id: G },
      { id: F_NAYARA, name: "Nayara", organization_id: ORG_ID, is_archived: false, is_default: false, position: 2000, group_id: G },
      { id: F_MORTO, name: "Morto", organization_id: ORG_ID, is_archived: true, is_default: false, position: 3000, group_id: G },
      { id: F_VIZINHO, name: "Do vizinho", organization_id: OUTRA_ORG, is_archived: false, is_default: false, position: 1000, group_id: null },
    ] as unknown as PipelineRow[],
  });
  const tabelas = db.tabelas as unknown as Record<string, unknown[]>;
  tabelas.crm_pipeline_groups = [
    { id: G, organization_id: ORG_ID, name: "INSS", color: null, icon: "iniciais", is_archived: false },
  ];
  tabelas.crm_pipeline_views = [
    { id: V_TIME, organization_id: ORG_ID, name: "Time comercial", acesso: "escolhidos" },
    { id: V_VIZINHO, organization_id: OUTRA_ORG, name: "Do vizinho", acesso: "todos" },
  ];
  tabelas.crm_pipeline_view_origens = [
    { view_id: V_TIME, organization_id: ORG_ID, pipeline_id: F_NAYARA, position: 1 },
    { view_id: V_TIME, organization_id: ORG_ID, pipeline_id: F_MORTO, position: 2 },
    { view_id: V_TIME, organization_id: ORG_ID, pipeline_id: F_LEADS, position: 3 },
    { view_id: V_VIZINHO, organization_id: OUTRA_ORG, pipeline_id: F_VIZINHO, position: 1 },
  ];
  tabelas.crm_pipeline_view_pessoas = [{ view_id: V_TIME, organization_id: ORG_ID, user_id: P_ANA }];
  return db;
}

/** Faz o `rpc` do dublê devolver o erro que o Postgres devolveria. */
function rpcFalha(db: ReturnType<typeof banco>, code: string) {
  (db.client as { rpc: unknown }).rpc = async (nome: string, args: unknown) => {
    db.rpcs.push({ nome, args });
    return { data: null, error: { code, message: `erro ${code}` } };
  };
}

function pedido(caminho: string, method: string, body?: unknown): NextRequest {
  if (body === undefined) return new NextRequest(`http://localhost${caminho}`, { method });
  return new NextRequest(`http://localhost${caminho}`, {
    method,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const criar = (body: unknown) => POST(pedido("/api/v1/pipeline-views", "POST", body));
const mudar = (id: string, body: unknown) => PATCH(pedido(`/api/v1/pipeline-views/${id}`, "PATCH", body), ctx(id));
const excluir = (id: string) => DELETE(pedido(`/api/v1/pipeline-views/${id}`, "DELETE"), ctx(id));
const listaDe = async (res: Response) => ((await res.json()) as { data: Visualizacao[] }).data;
const novaValida = { id: V_NOVA, name: "Análise", acesso: "todos", origens: [F_LEADS, F_NAYARA] };

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  authOk();
});

describe("GET /api/v1/pipeline-views", () => {
  it("devolve as visualizações da organização com origens na ordem e pessoas, sem as do vizinho", async () => {
    banco();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await listaDe(res)).toEqual([
      { id: V_TIME, name: "Time comercial", acesso: "escolhidos", origens: [F_NAYARA, F_MORTO, F_LEADS], pessoas: [P_ANA] },
    ]);
    expect(vi.mocked(requireRole).mock.calls[0]![0]).toBe("viewer");
  });
});

describe("POST /api/v1/pipeline-views", () => {
  it("grava pela função, com a organização da sessão, e responde 201 com a lista relida", async () => {
    const db = banco();
    const res = await criar({ ...novaValida, pessoas: [P_ANA] });
    expect(res.status).toBe(201);
    expect(db.rpcs).toEqual([
      {
        nome: "fn_escale_salvar_visualizacao",
        args: { p_id: V_NOVA, p_org: ORG_ID, p_nome: "Análise", p_acesso: "todos", p_origens: [F_LEADS, F_NAYARA], p_pessoas: [] },
      },
    ]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_view.created", resourceId: V_NOVA, organizationId: ORG_ID }),
    );
  });

  it("acesso escolhidos leva as pessoas, sem repetir", async () => {
    const db = banco();
    await criar({ ...novaValida, acesso: "escolhidos", pessoas: [P_ANA, P_BIA, P_ANA] });
    expect((db.rpcs[0]!.args as { p_pessoas: string[] }).p_pessoas).toEqual([P_ANA, P_BIA]);
  });

  it("recusa com 422, sem gravar: nome repetido, origem arquivada ou do vizinho, mais de 20 e escolhidos sem ninguém", async () => {
    const db = banco();
    expect((await criar({ ...novaValida, name: "time COMERCIAL" })).status).toBe(422);
    expect((await criar({ ...novaValida, origens: [F_LEADS, F_MORTO] })).status).toBe(422);
    expect((await criar({ ...novaValida, origens: [F_VIZINHO] })).status).toBe(422);
    const vinteEUma = Array.from({ length: 21 }, (_, i) => `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, "0")}`);
    expect((await criar({ ...novaValida, origens: vinteEUma })).status).toBe(422);
    expect((await criar({ ...novaValida, acesso: "escolhidos", pessoas: [] })).status).toBe(422);
    expect(db.rpcs).toEqual([]);
  });

  it("id de uma visualização que já existe na organização é 409, sem gravar nem auditar", async () => {
    const db = banco();
    const res = await criar({ ...novaValida, id: V_TIME, name: "Outro nome" });
    expect(res.status).toBe(409);
    expect(await res.text()).toContain("Essa visualização já existe.");
    expect(db.rpcs).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("23505 da chave primária (id de outra organização) também é 'já existe', não 'mesmo nome'", async () => {
    const db = banco();
    (db.client as { rpc: unknown }).rpc = async (nome: string, args: unknown) => {
      db.rpcs.push({ nome, args });
      return {
        data: null,
        error: {
          code: "23505",
          message: 'duplicate key value violates unique constraint "crm_pipeline_views_pkey"',
        },
      };
    };
    const res = await criar(novaValida);
    expect(res.status).toBe(409);
    expect(await res.text()).toContain("Essa visualização já existe.");
  });

  it("corpo que não é JSON é 400; chave a mais é 422", async () => {
    banco();
    expect((await criar("{quebrado")).status).toBe(400);
    expect((await criar({ ...novaValida, organization_id: OUTRA_ORG })).status).toBe(422);
  });

  it("os erros do banco têm nome: 23505 é 409, 23503 é 422, 42501 é 403", async () => {
    for (const [code, status] of [
      ["23505", 409],
      ["23503", 422],
      ["42501", 403],
    ] as const) {
      const db = banco();
      rpcFalha(db, code);
      expect((await criar(novaValida)).status).toBe(status);
    }
    expect(audit).not.toHaveBeenCalled();
  });

  it("quem não é gerente para no requireRole; o suporte somente leitura para antes", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await criar(novaValida)).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 423 }) as never);
    expect((await criar(novaValida)).status).toBe(423);
  });
});

describe("PATCH /api/v1/pipeline-views/:id", () => {
  it("trocar só o nome mantém acesso e pessoas, e tira a origem arquivada", async () => {
    const db = banco();
    expect((await mudar(V_TIME, { name: "Time de vendas" })).status).toBe(200);
    expect(db.rpcs[0]!.args).toEqual({
      p_id: V_TIME,
      p_org: ORG_ID,
      p_nome: "Time de vendas",
      p_acesso: "escolhidos",
      p_origens: [F_NAYARA, F_LEADS],
      p_pessoas: [P_ANA],
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_view.updated", resourceId: V_TIME }));
  });

  it("mantém as origens que a RLS esconde desta sessão ao renomear (B4-3)", async () => {
    const db = banco();
    const F_ESCONDIDA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9";
    (db.tabelas as unknown as Record<string, unknown[]>).crm_pipeline_view_origens!.push({
      view_id: V_TIME,
      organization_id: ORG_ID,
      pipeline_id: F_ESCONDIDA,
      position: 4,
    });
    const res = await mudar(V_TIME, { name: "Time comercial 2" });
    expect(res.status).toBe(200);
    expect((db.rpcs[0]!.args as { p_origens: string[] }).p_origens).toEqual([
      F_NAYARA,
      F_LEADS,
      F_ESCONDIDA,
    ]);
  });

  it("com as escondidas, passar de 20 origens ainda é 422 e nada é gravado", async () => {
    const db = banco();
    const tabelas = db.tabelas as unknown as Record<string, unknown[]>;
    for (let i = 0; i < 19; i += 1)
      tabelas.crm_pipeline_view_origens!.push({
        view_id: V_TIME,
        organization_id: ORG_ID,
        pipeline_id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(100000000000 + i)}`,
        position: 10 + i,
      });
    const res = await mudar(V_TIME, { name: "Time comercial 3" });
    expect(res.status).toBe(422);
    expect(db.rpcs).toEqual([]);
  });

  it("trocar as origens e passar para todos", async () => {
    const db = banco();
    await mudar(V_TIME, { origens: [F_LEADS], acesso: "todos" });
    expect(db.rpcs[0]!.args).toMatchObject({ p_origens: [F_LEADS], p_acesso: "todos", p_pessoas: [] });
  });

  it("visualização do vizinho ou inexistente é 404; corpo vazio é 422", async () => {
    const db = banco();
    expect((await mudar(V_VIZINHO, { name: "Minha" })).status).toBe(404);
    expect((await mudar(V_NOVA, { name: "Minha" })).status).toBe(404);
    expect((await mudar(V_TIME, {})).status).toBe(422);
    expect(db.rpcs).toEqual([]);
  });
});

describe("DELETE /api/v1/pipeline-views/:id", () => {
  it("apaga filtrando por id e organização e audita", async () => {
    const db = banco();
    const res = await excluir(V_TIME);
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipeline_views")!;
    expect(escrita.tipo).toBe("delete");
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", V_TIME], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_view.deleted", resourceId: V_TIME }));
  });

  it("visualização do vizinho é 404 e nada é apagado", async () => {
    const db = banco();
    expect((await excluir(V_VIZINHO)).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});
