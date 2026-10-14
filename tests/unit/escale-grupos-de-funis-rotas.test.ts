import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import type { Origens } from "@/lib/escale/origens/regras";
import { POST } from "@/app/api/v1/pipeline-groups/route";
import { DELETE, PATCH } from "@/app/api/v1/pipeline-groups/[id]/route";
import { PUT } from "@/app/api/v1/pipelines/[id]/grupo/route";
import {
  ORG_ID,
  OUTRA_ORG,
  authOk,
  makeDb,
  type DbOpts,
  type PipelineRow,
} from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const G_OBRAS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const G_CRED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const G_VIZINHO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const F_LEADS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const F_NAYARA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

/** Dois grupos da organização, um do vizinho, e dois funis vivos (um em grupo, um solto). */
function banco(writeError?: DbOpts["writeError"]) {
  const db = makeDb({
    pipelines: [
      { id: F_LEADS, name: "Leads INSS WhatsApp", organization_id: ORG_ID, is_archived: false, position: 1000, group_id: G_OBRAS },
      { id: F_NAYARA, name: "Funil Nayara", organization_id: ORG_ID, is_archived: false, position: 2000, group_id: null },
    ] as unknown as PipelineRow[],
    writeError,
  });
  (db.tabelas as unknown as Record<string, unknown[]>).crm_pipeline_groups = [
    { id: G_OBRAS, organization_id: ORG_ID, name: "INSS de obras" },
    { id: G_CRED, organization_id: ORG_ID, name: "Credenciados" },
    { id: G_VIZINHO, organization_id: OUTRA_ORG, name: "Grupo do vizinho" },
  ];
  return db;
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
const criar = (body: unknown) => POST(pedido("/api/v1/pipeline-groups", "POST", body));
const renomear = (id: string, body: unknown) => PATCH(pedido(`/api/v1/pipeline-groups/${id}`, "PATCH", body), ctx(id));
const excluir = (id: string) => DELETE(pedido(`/api/v1/pipeline-groups/${id}`, "DELETE"), ctx(id));
const mover = (id: string, body: unknown) => PUT(pedido(`/api/v1/pipelines/${id}/grupo`, "PUT", body), ctx(id));
const origensDe = async (res: Response) => ((await res.json()) as { data: Origens }).data;

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  authOk();
});

describe("POST /api/v1/pipeline-groups", () => {
  it("cria o grupo na organização da sessão e devolve as origens relidas, sem as do vizinho", async () => {
    const db = banco();
    const res = await criar({ name: "  Parcerias  " });
    expect(res.status).toBe(201);
    const escrita = db.escritas.find((e) => e.table === "crm_pipeline_groups");
    expect(escrita).toMatchObject({ tipo: "insert", patch: { organization_id: ORG_ID, name: "Parcerias" } });
    const origens = await origensDe(res);
    expect(origens.grupos.map((g) => g.name)).toContain("Parcerias");
    expect(origens.grupos.map((g) => g.id)).not.toContain(G_VIZINHO);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_group.created", organizationId: ORG_ID }),
    );
  });

  it("nome repetido (sem olhar caixa nem acento) é 422 e nada é gravado", async () => {
    const db = banco();
    const res = await criar({ name: "inss DE óbras" });
    expect(res.status).toBe(422);
    expect(db.escritas).toEqual([]);
  });

  it("nome em branco é 422; corpo que não é JSON é 400", async () => {
    banco();
    expect((await criar({ name: "   " })).status).toBe(422);
    expect((await criar("{quebrado")).status).toBe(400);
  });

  it("o índice único do banco vencendo a corrida vira 409", async () => {
    banco((_n, tabela) => (tabela === "crm_pipeline_groups" ? { code: "23505", message: "duplicate key" } : null));
    expect((await criar({ name: "Parcerias" })).status).toBe(409);
  });

  it("quem não é gerente para no requireRole, antes de abrir o banco", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await criar({ name: "Parcerias" })).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("o suporte em modo somente leitura para antes de tudo", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 423 }) as never);
    expect((await criar({ name: "Parcerias" })).status).toBe(423);
    expect(requireRole).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/pipeline-groups/:id", () => {
  it("renomeia filtrando por id e organização", async () => {
    const db = banco();
    const res = await renomear(G_OBRAS, { name: "INSS Obras 2026" });
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipeline_groups");
    expect(escrita?.tipo).toBe("update");
    expect(escrita?.patch).toEqual({ name: "INSS Obras 2026" });
    expect(escrita?.filtros).toEqual(expect.arrayContaining([["id", G_OBRAS], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_group.renamed" }));
  });

  it("mudar só a caixa do próprio nome é permitido", async () => {
    banco();
    expect((await renomear(G_OBRAS, { name: "INSS de Obras" })).status).toBe(200);
  });

  it("grupo de outra organização é 404, como se não existisse, e nada é gravado", async () => {
    const db = banco();
    expect((await renomear(G_VIZINHO, { name: "Meu agora" })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});

describe("DELETE /api/v1/pipeline-groups/:id", () => {
  it("exclui filtrando por id e organização e audita quantos funis ficaram sem grupo", async () => {
    const db = banco();
    const res = await excluir(G_OBRAS);
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipeline_groups");
    expect(escrita?.tipo).toBe("delete");
    expect(escrita?.filtros).toEqual(expect.arrayContaining([["id", G_OBRAS], ["organization_id", ORG_ID]]));
    expect(db.escritas.filter((e) => e.table === "crm_pipelines")).toEqual([]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_group.deleted", metadata: { name: "INSS de obras", funis: 1 } }),
    );
    expect((await origensDe(res)).grupos.map((g) => g.id)).not.toContain(G_OBRAS);
  });

  it("grupo de outra organização é 404 e nada é apagado", async () => {
    const db = banco();
    expect((await excluir(G_VIZINHO)).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});

describe("PUT /api/v1/pipelines/:id/grupo", () => {
  it("põe o funil no grupo, filtrando por funil e organização", async () => {
    const db = banco();
    const res = await mover(F_NAYARA, { group_id: G_CRED });
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines");
    expect(escrita?.patch).toEqual({ group_id: G_CRED });
    expect(escrita?.filtros).toEqual(expect.arrayContaining([["id", F_NAYARA], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline.group_changed", metadata: { de: null, para: G_CRED } }),
    );
  });

  it("group_id null tira o funil do grupo", async () => {
    const db = banco();
    expect((await mover(F_LEADS, { group_id: null })).status).toBe(200);
    expect(db.escritas.find((e) => e.table === "crm_pipelines")?.patch).toEqual({ group_id: null });
  });

  it("grupo do vizinho é 404 e o funil não muda", async () => {
    const db = banco();
    expect((await mover(F_NAYARA, { group_id: G_VIZINHO })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });

  it("funil que não está na organização é 404", async () => {
    banco();
    expect((await mover("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9", { group_id: G_CRED })).status).toBe(404);
  });

  it("pedir o grupo em que o funil já está não grava nem audita", async () => {
    const db = banco();
    expect((await mover(F_LEADS, { group_id: G_OBRAS })).status).toBe(200);
    expect(db.escritas).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("group_id que não é uuid é 422", async () => {
    banco();
    expect((await mover(F_LEADS, { group_id: "obras" })).status).toBe(422);
  });
});
