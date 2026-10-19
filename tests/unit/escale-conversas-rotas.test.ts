import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_NEGOCIOS } from "@/app/api/v1/negocios-do-contato/route";
import { GET, PUT } from "@/app/api/v1/preferencias-de-conversas/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { PREFERENCIAS_PADRAO } from "@/lib/escale/conversas/preferencias";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { listConversationsQuerySchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk, makeDb } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Linha = Record<string, unknown>;
const OUTRA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const C1 = "c1c1c1c1-0000-4000-8000-000000000001";

function banco(linhas: Linha[] = []) {
  const db = makeDb();
  (db.tabelas as unknown as Record<string, Linha[]>).crm_preferencias_de_conversas = linhas;
  return db;
}
const linhasDe = (db: ReturnType<typeof banco>) =>
  (db.tabelas as unknown as Record<string, Linha[]>).crm_preferencias_de_conversas ?? [];
const ler = () => GET();
const gravar = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/v1/preferencias-de-conversas", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
const corpo = async (r: Response) => ((await r.json()) as { data: unknown }).data;

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk();
});

describe("/api/v1/preferencias-de-conversas", () => {
  it("GET devolve as minhas com o padrão onde não há linha, e nunca as da outra pessoa", async () => {
    banco([
      {
        id: "p1",
        organization_id: ORG_ID,
        user_id: USER_ID,
        chave: "secoes",
        valor: { notas: false },
      },
      {
        id: "p2",
        organization_id: ORG_ID,
        user_id: OUTRA,
        chave: "secoes",
        valor: { contato: false },
      },
    ]);
    const data = (await corpo(await ler())) as { preferencias: typeof PREFERENCIAS_PADRAO };
    expect(data.preferencias.secoes.notas).toBe(false);
    expect(data.preferencias.secoes.contato).toBe(true);
    expect(data.preferencias.visualizacao).toEqual(PREFERENCIAS_PADRAO.visualizacao);
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("viewer");
  });

  it("PUT grava uma chave por vez, uma linha por pessoa e chave, audita, e recusa fora da forma", async () => {
    const db = banco();
    expect((await gravar({ chave: "secoes", valor: { notas: false } })).status).toBe(200);
    expect((await gravar({ chave: "secoes", valor: { notas: true, anexos: false } })).status).toBe(
      200,
    );
    const minhas = linhasDe(db).filter((l) => l.user_id === USER_ID);
    expect(minhas).toHaveLength(1);
    expect(minhas[0]).toMatchObject({ chave: "secoes", valor: { notas: true, anexos: false } });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "conversation_prefs.updated",
      metadata: { chave: "secoes" },
    });
    expect((await gravar({ chave: "secoes", valor: { inventada: 1 } })).status).toBe(422);
    expect((await gravar("{quebrado")).status).toBe(400);
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await gravar({ chave: "secoes", valor: {} })).status).toBe(403);
  });
});

describe("/api/v1/negocios-do-contato", () => {
  it("devolve os negócios do contato com a origem e o grupo, abertos primeiro; sem contact_id é 422", async () => {
    const db = makeDb();
    (db.tabelas as unknown as Record<string, Linha[]>).crm_leads = [
      {
        id: "l1",
        organization_id: ORG_ID,
        contact_id: C1,
        pipeline_id: "p1",
        stage_id: "s1",
        status: "won",
        updated_at: "2026-10-18T10:00:00Z",
      },
      {
        id: "l2",
        organization_id: ORG_ID,
        contact_id: C1,
        pipeline_id: "p1",
        stage_id: "s2",
        status: "open",
        updated_at: "2026-10-17T10:00:00Z",
      },
      {
        id: "l3",
        organization_id: ORG_ID,
        contact_id: "outro",
        pipeline_id: "p1",
        stage_id: "s1",
        status: "open",
        updated_at: "2026-10-18T10:00:00Z",
      },
    ];
    (db.tabelas as unknown as Record<string, Linha[]>).crm_pipelines = [
      {
        id: "p1",
        organization_id: ORG_ID,
        name: "Obra Futura",
        is_archived: false,
        group_id: "g1",
      },
    ];
    (db.tabelas as unknown as Record<string, Linha[]>).crm_pipeline_groups = [
      { id: "g1", organization_id: ORG_ID, name: "INSS Vendas" },
    ];
    const r = await GET_NEGOCIOS(
      new NextRequest(`http://localhost/api/v1/negocios-do-contato?contact_id=${C1}`),
    );
    expect(r.status).toBe(200);
    const data = (await corpo(r)) as Array<{
      id: string;
      origem: { nome: string; grupo: string | null };
    }>;
    expect(data.map((n) => n.id)).toEqual(["l2", "l1"]);
    expect(data[0]!.origem).toEqual({ id: "p1", nome: "Obra Futura", grupo: "INSS Vendas" });
    expect(
      (await GET_NEGOCIOS(new NextRequest("http://localhost/api/v1/negocios-do-contato"))).status,
    ).toBe(422);
  });
});

describe("os dois filtros novos da lista do original (A4, A5)", () => {
  it("o schema aceita snoozed e ordem e recusa o resto", () => {
    expect(
      listConversationsQuerySchema.safeParse({ snoozed: "true", ordem: "espera" }).success,
    ).toBe(true);
    expect(listConversationsQuerySchema.safeParse({ snoozed: "talvez" }).success).toBe(false);
    expect(listConversationsQuerySchema.safeParse({ ordem: "nome" }).success).toBe(false);
  });
});
