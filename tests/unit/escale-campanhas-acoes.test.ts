import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/app/api/v1/messages/_handler", () => ({ sendMessageHandler: vi.fn() }));
vi.mock("@/lib/atendimento/origem", () => ({ beginServiceAtOrigin: vi.fn() }));

import { DELETE } from "@/app/api/v1/campanhas-da-casca/[id]/route";
import { POST } from "@/app/api/v1/campanhas-da-casca/[id]/[acao]/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import type { CampanhaCarregada } from "@/lib/campanhas/acoes";
import { podeTransitar } from "@/lib/campanhas/maquina-de-estados";
import {
  excluirRascunhoAcao,
  reagendarAcao,
  voltarAoRascunhoAcao,
} from "@/lib/escale/campanhas/acoes";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const ID = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const AGORA = new Date("2026-10-19T12:00:00Z");

const campanha = (status: string, extra: Partial<CampanhaCarregada> = {}): CampanhaCarregada =>
  ({
    id: ID,
    organization_id: ORG_ID,
    name: "Reativação",
    status,
    channel_session_id: "s1",
    message_body: "Oi",
    base_legal: "consent",
    lia_ref: null,
    audience_filter: {},
    audience_version: 1,
    content_version: 1,
    scheduled_at: null,
    intervalo_segundos: null,
    janela_inicio_hora: null,
    janela_fim_hora: null,
    teto_diario: null,
    teto_horario: null,
    description: null,
    ...extra,
  }) as CampanhaCarregada;

/** O admin falso: `select(..., { head: true })` devolve a contagem; o resto, `escrita`. */
function admin(op: {
  campanha?: CampanhaCarregada | null;
  enviados?: number;
  escrita?: Array<{ id: string }>;
}) {
  const chamadas: Array<{ tabela: string; metodo: string; args: unknown[] }> = [];
  const from = vi.fn((tabela: string) => {
    let contar = false;
    const c: Record<string, unknown> = {};
    for (const m of ["select", "eq", "not", "update", "delete"]) {
      c[m] = (...args: unknown[]) => {
        chamadas.push({ tabela, metodo: m, args });
        if (m === "select" && (args[1] as { head?: boolean } | undefined)?.head) contar = true;
        return c;
      };
    }
    c.maybeSingle = () => Promise.resolve({ data: op.campanha ?? null, error: null });
    c.then = (ok: (x: unknown) => unknown, erro?: (e: unknown) => unknown) =>
      Promise.resolve(
        contar
          ? { count: op.enviados ?? 0, error: null }
          : { data: op.escrita ?? [{ id: ID }], error: null },
      ).then(ok, erro);
    return c;
  });
  const db = { from, chamadas };
  vi.mocked(createAdminClient).mockReturnValue(db as never);
  return db;
}

const pedido = (url: string, corpo?: unknown, metodo = "POST") =>
  new NextRequest(new URL(url, "http://x"), {
    method: metodo,
    ...(corpo === undefined
      ? {}
      : { body: JSON.stringify(corpo), headers: { "content-type": "application/json" } }),
  } as never);
const params = (acao?: string) =>
  ({ params: Promise.resolve(acao ? { id: ID, acao } : { id: ID }) }) as never;

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("máquina de estados (N10)", () => {
  it("agendada pode voltar a rascunho", () => {
    expect(podeTransitar("scheduled", "draft")).toEqual({ pode: true });
  });
});

describe("reagendarAcao", () => {
  it("só agendada; só no futuro; grava com compare-and-set no status", async () => {
    const db = admin({});
    expect(
      await reagendarAcao(db as never, campanha("ready"), new Date("2026-10-20T12:00:00Z"), AGORA),
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      await reagendarAcao(
        db as never,
        campanha("scheduled"),
        new Date("2026-10-18T12:00:00Z"),
        AGORA,
      ),
    ).toMatchObject({ ok: false, codigo: "campanha_agenda_invalida" });
    const r = await reagendarAcao(
      db as never,
      campanha("scheduled"),
      new Date("2026-10-20T12:00:00Z"),
      AGORA,
    );
    expect(r).toEqual({ ok: true, scheduled_at: "2026-10-20T12:00:00.000Z" });
    expect(db.chamadas).toContainEqual({
      tabela: "campaigns",
      metodo: "update",
      args: [{ scheduled_at: "2026-10-20T12:00:00.000Z" }],
    });
    expect(db.chamadas).toContainEqual({
      tabela: "campaigns",
      metodo: "eq",
      args: ["status", "scheduled"],
    });
  });

  it("estado que mudou no meio é conflito", async () => {
    const db = admin({ escrita: [] });
    expect(
      await reagendarAcao(
        db as never,
        campanha("scheduled"),
        new Date("2026-10-20T12:00:00Z"),
        AGORA,
      ),
    ).toMatchObject({ ok: false, status: 409 });
  });
});

describe("voltarAoRascunhoAcao", () => {
  it("agendada e pronta voltam; limpa a agenda", async () => {
    const db = admin({});
    expect(await voltarAoRascunhoAcao(db as never, campanha("scheduled"))).toEqual({ ok: true });
    expect(db.chamadas).toContainEqual({
      tabela: "campaigns",
      metodo: "update",
      args: [{ status: "draft", scheduled_at: null }],
    });
    expect(await voltarAoRascunhoAcao(admin({}) as never, campanha("ready"))).toEqual({ ok: true });
  });

  it("quem já enviou não volta; concluída não volta", async () => {
    expect(
      await voltarAoRascunhoAcao(admin({ enviados: 3 }) as never, campanha("scheduled")),
    ).toMatchObject({ ok: false, codigo: "campanha_nao_editavel" });
    expect(await voltarAoRascunhoAcao(admin({}) as never, campanha("completed"))).toMatchObject({
      ok: false,
      codigo: "campanha_estado_invalido",
    });
  });
});

describe("excluirRascunhoAcao", () => {
  it("só rascunho que nunca enviou; apaga com o status preso", async () => {
    const db = admin({});
    expect(await excluirRascunhoAcao(db as never, campanha("draft"))).toEqual({ ok: true });
    expect(db.chamadas.some((c) => c.metodo === "delete")).toBe(true);
    expect(await excluirRascunhoAcao(admin({}) as never, campanha("scheduled"))).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(
      await excluirRascunhoAcao(admin({ enviados: 1 }) as never, campanha("draft")),
    ).toMatchObject({ ok: false, codigo: "campanha_nao_editavel" });
  });
});

describe("as rotas do fork", () => {
  it("reagendar: corpo ruim é 422; ok audita campaign.rescheduled", async () => {
    authOk("manager");
    admin({ campanha: campanha("scheduled") });
    expect(
      (await POST(pedido(`/api/v1/campanhas-da-casca/${ID}/reagendar`, {}), params("reagendar")))
        .status,
    ).toBe(422);
    const r = await POST(
      pedido(`/api/v1/campanhas-da-casca/${ID}/reagendar`, {
        scheduled_at: "2099-01-01T12:00:00.000Z",
      }),
      params("reagendar"),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).data).toEqual({ scheduled_at: "2099-01-01T12:00:00.000Z" });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "campaign.rescheduled", resourceId: ID }),
    );
  });

  it("rascunho: audita campaign.back_to_draft; ação desconhecida é 404; campanha que não existe é 404", async () => {
    authOk("manager");
    admin({ campanha: campanha("ready") });
    const r = await POST(pedido(`/api/v1/campanhas-da-casca/${ID}/rascunho`), params("rascunho"));
    expect(r.status).toBe(200);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "campaign.back_to_draft", metadata: { de: "ready" } }),
    );
    expect((await POST(pedido(`/api/v1/campanhas-da-casca/${ID}/xyz`), params("xyz"))).status).toBe(
      404,
    );
    admin({ campanha: null });
    expect(
      (await POST(pedido(`/api/v1/campanhas-da-casca/${ID}/rascunho`), params("rascunho"))).status,
    ).toBe(404);
  });

  it("DELETE: exige gerente; apaga o rascunho e audita campaign.draft_deleted", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    admin({ campanha: campanha("draft") });
    expect(
      (await DELETE(pedido(`/api/v1/campanhas-da-casca/${ID}`, undefined, "DELETE"), params()))
        .status,
    ).toBe(403);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("manager", expect.anything());
    authOk("manager");
    const r = await DELETE(
      pedido(`/api/v1/campanhas-da-casca/${ID}`, undefined, "DELETE"),
      params(),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).data).toEqual({ id: ID });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "campaign.draft_deleted" }),
    );
  });
});
