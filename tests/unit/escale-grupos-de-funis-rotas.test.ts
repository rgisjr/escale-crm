import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import type { Origens } from "@/lib/escale/origens/regras";
import { GET, POST } from "@/app/api/v1/pipeline-groups/route";
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
const MEMBRO = "66666666-6666-4666-8666-666666666666";
vi.mock("@/lib/escale/acesso/membros", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/escale/acesso/membros")>()),
  membrosAtivos: vi.fn(async () => ({ ok: true, ids: [MEMBRO] })),
}));

const G_OBRAS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const G_CRED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const G_VAZIO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const G_ARQ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5";
const G_VIZINHO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const F_LEADS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const F_NAYARA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

const grupoRow = (id: string, name: string, org = ORG_ID, extra: Record<string, unknown> = {}) => ({
  id,
  organization_id: org,
  name,
  color: null,
  icon: "iniciais",
  is_archived: false,
  ...extra,
});

/** Quatro grupos da organização (um vazio, um arquivado), um do vizinho, e dois funis. */
function banco(writeError?: DbOpts["writeError"]) {
  const db = makeDb({
    pipelines: [
      { id: F_LEADS, name: "Leads INSS WhatsApp", organization_id: ORG_ID, is_archived: false, is_default: true, position: 1000, group_id: G_OBRAS },
      { id: F_NAYARA, name: "Funil Nayara", organization_id: ORG_ID, is_archived: false, is_default: false, position: 2000, group_id: G_CRED },
    ] as unknown as PipelineRow[],
    writeError,
  });
  (db.tabelas as unknown as Record<string, unknown[]>).crm_pipeline_groups = [
    grupoRow(G_OBRAS, "INSS de obras"),
    grupoRow(G_CRED, "Credenciados"),
    grupoRow(G_VAZIO, "Parcerias"),
    grupoRow(G_ARQ, "Antigo", ORG_ID, { is_archived: true }),
    grupoRow(G_VIZINHO, "Grupo do vizinho", OUTRA_ORG),
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
const mudar = (id: string, body: unknown) => PATCH(pedido(`/api/v1/pipeline-groups/${id}`, "PATCH", body), ctx(id));
const excluir = (id: string, destino?: string) =>
  DELETE(pedido(`/api/v1/pipeline-groups/${id}${destino ? `?destino=${destino}` : ""}`, "DELETE"), ctx(id));
const mover = (id: string, body: unknown) => PUT(pedido(`/api/v1/pipelines/${id}/grupo`, "PUT", body), ctx(id));
const origensDe = async (res: Response) => ((await res.json()) as { data: Origens }).data;
const escritasEm = (db: ReturnType<typeof banco>, tabela: string) => db.escritas.filter((e) => e.table === tabela);

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  authOk();
});

describe("GET /api/v1/pipeline-groups", () => {
  it("devolve grupos (com cor, ícone e arquivado) e todos os funis da organização, sem os do vizinho", async () => {
    banco();
    const res = await GET();
    expect(res.status).toBe(200);
    const origens = await origensDe(res);
    expect(origens.grupos.map((g) => g.id)).not.toContain(G_VIZINHO);
    expect(origens.grupos.find((g) => g.id === G_ARQ)).toMatchObject({ is_archived: true, icon: "iniciais", color: null });
    expect(origens.funis.find((f) => f.id === F_LEADS)).toMatchObject({ group_id: G_OBRAS, is_default: true, is_archived: false });
    expect(vi.mocked(requireRole).mock.calls[0]![0]).toBe("viewer");
  });
});

describe("POST /api/v1/pipeline-groups", () => {
  it("cria o grupo na organização da sessão e devolve as origens relidas", async () => {
    const db = banco();
    const res = await criar({ name: "  Novos  " });
    expect(res.status).toBe(201);
    expect(escritasEm(db, "crm_pipeline_groups")[0]).toMatchObject({
      tipo: "insert",
      patch: { organization_id: ORG_ID, name: "Novos" },
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_group.created" }));
  });

  it("nome repetido (sem caixa nem acento, inclusive de arquivado) é 422 e nada é gravado", async () => {
    const db = banco();
    expect((await criar({ name: "antigo" })).status).toBe(422);
    expect(db.escritas).toEqual([]);
  });

  it("corpo que não é JSON é 400; índice único vencendo a corrida é 409", async () => {
    banco();
    expect((await criar("{quebrado")).status).toBe(400);
    banco((_n, tabela) => (tabela === "crm_pipeline_groups" ? { code: "23505", message: "duplicate key" } : null));
    expect((await criar({ name: "Novos" })).status).toBe(409);
  });

  it("quem não é gerente para no requireRole; o suporte somente leitura para antes", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await criar({ name: "Novos" })).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 423 }) as never);
    expect((await criar({ name: "Novos" })).status).toBe(423);
  });
});

describe("PATCH /api/v1/pipeline-groups/:id", () => {
  it("renomeia filtrando por id e organização", async () => {
    const db = banco();
    expect((await mudar(G_OBRAS, { name: "INSS Obras 2026" })).status).toBe(200);
    const escrita = escritasEm(db, "crm_pipeline_groups")[0]!;
    expect(escrita.patch).toEqual({ name: "INSS Obras 2026" });
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", G_OBRAS], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_group.updated" }));
  });

  it("pessoas: grava settings.escale_pessoas no grupo e audita", async () => {
    const db = banco();
    const res = await mudar(G_OBRAS, { pessoas: [MEMBRO] });
    expect(res.status).toBe(200);
    const escrita = escritasEm(db, "crm_pipeline_groups")[0]!;
    expect(escrita.patch).toEqual({ settings: { escale_pessoas: [MEMBRO] } });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_group.updated" }));
  });

  it("quem já estava na lista do grupo e saiu da equipe não trava o salvar: sai da lista", async () => {
    const SAIU = "33333333-3333-4333-8333-333333333333";
    const db = banco();
    (db.tabelas as unknown as Partial<Record<string, Array<Record<string, unknown>>>>).crm_pipeline_groups![0]!.settings = {
      escale_pessoas: [MEMBRO, SAIU],
    };
    const res = await mudar(G_OBRAS, { pessoas: [MEMBRO, SAIU] });
    expect(res.status).toBe(200);
    expect(escritasEm(db, "crm_pipeline_groups")[0]!.patch).toEqual({ settings: { escale_pessoas: [MEMBRO] } });
  });

  it("pessoas com quem não é membro ativo: 422 e nada gravado", async () => {
    const db = banco();
    const res = await mudar(G_OBRAS, { pessoas: ["77777777-7777-4777-8777-777777777777"] });
    expect(res.status).toBe(422);
    expect(escritasEm(db, "crm_pipeline_groups")).toHaveLength(0);
  });

  it("customiza cor da paleta e ícone; cor fora da paleta é 422", async () => {
    const db = banco();
    expect((await mudar(G_OBRAS, { color: "#0091ff", icon: "pessoas" })).status).toBe(200);
    expect(escritasEm(db, "crm_pipeline_groups")[0]!.patch).toEqual({ color: "#0091ff", icon: "pessoas" });
    expect((await mudar(G_OBRAS, { color: "#123456" })).status).toBe(422);
    expect((await mudar(G_OBRAS, { icon: "foguete" })).status).toBe(422);
  });

  it("volta para a cor automática com color: null", async () => {
    const db = banco();
    expect((await mudar(G_OBRAS, { color: null })).status).toBe(200);
    expect(escritasEm(db, "crm_pipeline_groups")[0]!.patch).toEqual({ color: null });
  });

  it("arquiva e desarquiva, com o código de auditoria de cada um", async () => {
    banco();
    expect((await mudar(G_CRED, { is_archived: true })).status).toBe(200);
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ action: "pipeline_group.archived" }));
    expect((await mudar(G_ARQ, { is_archived: false })).status).toBe(200);
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ action: "pipeline_group.unarchived" }));
  });

  it("não arquiva o único grupo ativo", async () => {
    const db = banco();
    (db.tabelas as unknown as Record<string, unknown[]>).crm_pipeline_groups = [grupoRow(G_OBRAS, "INSS de obras")];
    expect((await mudar(G_OBRAS, { is_archived: true })).status).toBe(422);
    expect(db.escritas).toEqual([]);
  });

  it("corpo vazio é 422; grupo do vizinho é 404 e nada é gravado", async () => {
    const db = banco();
    expect((await mudar(G_OBRAS, {})).status).toBe(422);
    expect((await mudar(G_VIZINHO, { name: "Meu agora" })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});

describe("DELETE /api/v1/pipeline-groups/:id", () => {
  it("grupo vazio sai direto, filtrando por id e organização", async () => {
    const db = banco();
    expect((await excluir(G_VAZIO)).status).toBe(200);
    expect(escritasEm(db, "crm_pipelines")).toEqual([]);
    const apagou = escritasEm(db, "crm_pipeline_groups")[0]!;
    expect(apagou.tipo).toBe("delete");
    expect(apagou.filtros).toEqual(expect.arrayContaining([["id", G_VAZIO], ["organization_id", ORG_ID]]));
  });

  it("grupo com origens sem destino é 422 e nada é gravado", async () => {
    const db = banco();
    expect((await excluir(G_OBRAS)).status).toBe(422);
    expect(db.escritas).toEqual([]);
  });

  it("com destino, move as origens primeiro e só depois exclui", async () => {
    const db = banco();
    const res = await excluir(G_OBRAS, G_CRED);
    expect(res.status).toBe(200);
    expect(db.escritas.map((e) => `${e.tipo}:${e.table}`)).toEqual(["update:crm_pipelines", "delete:crm_pipeline_groups"]);
    expect(db.escritas[0]!.patch).toEqual({ group_id: G_CRED });
    expect(db.escritas[0]!.filtros).toEqual(expect.arrayContaining([["organization_id", ORG_ID], ["group_id", G_OBRAS]]));
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_group.deleted", metadata: { name: "INSS de obras", funis: 1, destino: G_CRED } }),
    );
    expect((await origensDe(res)).funis.find((f) => f.id === F_LEADS)?.group_id).toBe(G_CRED);
  });

  it("destino arquivado, do vizinho ou o próprio grupo é 422", async () => {
    const db = banco();
    for (const destino of [G_ARQ, G_VIZINHO, G_OBRAS]) {
      expect((await excluir(G_OBRAS, destino)).status).toBe(422);
    }
    expect(db.escritas).toEqual([]);
  });

  it("grupo do vizinho é 404", async () => {
    banco();
    expect((await excluir(G_VIZINHO)).status).toBe(404);
  });
});

describe("PUT /api/v1/pipelines/:id/grupo", () => {
  it("põe o funil no grupo, filtrando por funil e organização", async () => {
    const db = banco();
    expect((await mover(F_NAYARA, { group_id: G_OBRAS })).status).toBe(200);
    const escrita = escritasEm(db, "crm_pipelines")[0]!;
    expect(escrita.patch).toEqual({ group_id: G_OBRAS });
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", F_NAYARA], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline.group_changed", metadata: { de: G_CRED, para: G_OBRAS } }),
    );
  });

  it("group_id nulo ou que não é uuid é 422 — toda origem tem grupo", async () => {
    banco();
    expect((await mover(F_LEADS, { group_id: null })).status).toBe(422);
    expect((await mover(F_LEADS, { group_id: "obras" })).status).toBe(422);
  });

  it("grupo arquivado ou do vizinho é 404 e o funil não muda", async () => {
    const db = banco();
    expect((await mover(F_NAYARA, { group_id: G_ARQ })).status).toBe(404);
    expect((await mover(F_NAYARA, { group_id: G_VIZINHO })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });

  it("funil fora da organização é 404; pedir o grupo atual não grava nem audita", async () => {
    const db = banco();
    expect((await mover("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9", { group_id: G_CRED })).status).toBe(404);
    expect((await mover(F_LEADS, { group_id: G_OBRAS })).status).toBe(200);
    expect(db.escritas).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });
});
