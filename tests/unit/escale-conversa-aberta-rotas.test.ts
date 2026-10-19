import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as ENCERRAR } from "@/app/api/v1/conversas-da-casca/[id]/encerrar/route";
import {
  DELETE as SAIR_DA_ESPERA,
  POST as ESPERA,
} from "@/app/api/v1/conversas-da-casca/[id]/espera/route";
import { GET as EVENTOS } from "@/app/api/v1/conversas-da-casca/[id]/eventos/route";
import { POST as NAO_LIDA } from "@/app/api/v1/conversas-da-casca/[id]/nao-lida/route";
import {
  DELETE as RETOMAR,
  GET as PAUSA,
  POST as PAUSAR,
} from "@/app/api/v1/conversas-da-casca/[id]/pausa/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { ESPERA_SEM_FIM } from "@/lib/escale/conversas/espera";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/followup/intervencao", () => ({
  pausaEnrollment: vi.fn(async () => ({ ok: true })),
  retomaEnrollment: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/app/api/v1/conversations/_handler", () => ({
  patchConversationHandler: vi.fn(async (_s: unknown, _c: unknown, id: string) => ({
    id,
    status: "open",
  })),
}));

const CV = "c0000000-0000-4000-8000-000000000001";
type Linha = Record<string, unknown>;

/** Um Supabase de mentira por tabela: `linhas` responde às leituras; as escritas ficam em `escritas`. */
function banco(
  tabelas: Record<string, Linha[]>,
  rpc: Linha = { data: { id: CV, status: "closed" }, error: null },
) {
  const escritas: Array<{ tabela: string; op: string; valores?: Linha }> = [];
  const from = vi.fn((tabela: string) => {
    const dados = tabelas[tabela] ?? [];
    const cadeia: Record<string, unknown> = {};
    let pendente: { op: string; valores?: Linha } | null = null;
    for (const m of ["select", "eq", "neq", "in", "is", "order", "limit", "not", "gt", "lte"])
      cadeia[m] = vi.fn(() => cadeia);
    cadeia.update = vi.fn((valores: Linha) => {
      pendente = { op: "update", valores };
      return cadeia;
    });
    cadeia.insert = vi.fn((valores: Linha) => {
      pendente = { op: "insert", valores };
      return cadeia;
    });
    cadeia.upsert = vi.fn((valores: Linha) => {
      pendente = { op: "upsert", valores };
      return cadeia;
    });
    cadeia.delete = vi.fn(() => {
      pendente = { op: "delete" };
      return cadeia;
    });
    const fechar = () => {
      if (pendente) escritas.push({ tabela, ...pendente });
      pendente = null;
    };
    cadeia.maybeSingle = vi.fn(async () => {
      fechar();
      return { data: dados[0] ?? null, error: null };
    });
    cadeia.single = vi.fn(async () => {
      fechar();
      return { data: dados[0] ?? null, error: null };
    });
    cadeia.then = (ok: (r: { data: Linha[]; error: null }) => unknown) => {
      fechar();
      return Promise.resolve({ data: dados, error: null }).then(ok);
    };
    return cadeia;
  });
  const db = { from, rpc: vi.fn(async () => rpc) };
  vi.mocked(createClient).mockResolvedValue(db as never);
  vi.mocked(createAdminClient).mockReturnValue(db as never);
  return { escritas, db };
}
const conversa = (extra: Linha = {}): Linha => ({
  id: CV,
  organization_id: ORG_ID,
  status: "open",
  service_revision: 3,
  assigned_to_user_id: USER_ID,
  snooze_until: null,
  metadata: {},
  bot_silenced_until: null,
  contact_id: "ct1",
  ...extra,
});
const req = (metodo: string, corpo?: unknown) =>
  new NextRequest(`http://x/api/v1/conversas-da-casca/${CV}/x`, {
    method: metodo,
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  } as never);
const ctx = { params: Promise.resolve({ id: CV }) };
const corpo = async (r: Response) => ((await r.json()) as { data: unknown }).data;

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("manager");
});

describe("espera (C2, decisão 2)", () => {
  it("POST grava o snooze sem fim, a marca e o evento; DELETE limpa e grava o evento; 404 fora da visão", async () => {
    const { escritas } = banco({ conversations: [conversa()] });
    expect((await ESPERA(req("POST"), ctx)).status).toBe(200);
    const update = escritas.find((e) => e.tabela === "conversations" && e.op === "update")!;
    expect(update.valores).toMatchObject({
      snooze_until: ESPERA_SEM_FIM,
      snoozed_by_user_id: USER_ID,
      metadata: { escale_em_espera: true },
    });
    expect(escritas.find((e) => e.tabela === "crm_eventos_da_conversa")!.valores).toMatchObject({
      tipo: "espera",
      user_id: USER_ID,
    });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "conversation.waiting_set",
    });
    const b2 = banco({
      conversations: [
        conversa({ snooze_until: ESPERA_SEM_FIM, metadata: { escale_em_espera: true, x: 1 } }),
      ],
    });
    expect((await SAIR_DA_ESPERA(req("DELETE"), ctx)).status).toBe(204);
    expect(b2.escritas.find((e) => e.tabela === "conversations")!.valores).toEqual({
      snooze_until: null,
      snoozed_at: null,
      snoozed_by_user_id: null,
      metadata: { x: 1 },
    });
    banco({ conversations: [] });
    expect((await ESPERA(req("POST"), ctx)).status).toBe(404);
  });
});

describe("encerrar e reabrir", () => {
  it("encerrar chama fn_service_status com a revisão lida e grava o evento; reabrir usa o handler do original", async () => {
    const { escritas, db } = banco({ conversations: [conversa()] });
    const r = await ENCERRAR(req("POST", {}), ctx);
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith(
      "fn_service_status",
      expect.objectContaining({ p_conversation: CV, p_status: "closed", p_expected: 3 }),
    );
    expect(escritas.find((e) => e.tabela === "crm_eventos_da_conversa")!.valores).toMatchObject({
      tipo: "encerrado",
    });
    const { POST: REABRIR } = await import("@/app/api/v1/conversas-da-casca/[id]/reabrir/route");
    const b2 = banco({ conversations: [conversa({ status: "closed" })] });
    expect((await REABRIR(req("POST", {}), ctx)).status).toBe(200);
    expect(b2.escritas.find((e) => e.tabela === "crm_eventos_da_conversa")!.valores).toMatchObject({
      tipo: "reaberto",
    });
  });
});

describe("não lida e eventos", () => {
  it("não lida põe 1 pela sessão e audita; eventos junta atribuições e eventos do fork", async () => {
    const { escritas } = banco({ conversations: [conversa()] });
    expect((await NAO_LIDA(req("POST"), ctx)).status).toBe(200);
    expect(escritas.find((e) => e.tabela === "conversations")!.valores).toEqual({
      unread_count_for_assignee: 1,
    });
    banco({
      conversations: [conversa()],
      conversation_assignment_events: [
        {
          id: "a1",
          from_user_id: null,
          to_user_id: USER_ID,
          changed_by: USER_ID,
          reason: "claim",
          created_at: "2026-10-18T10:00:00Z",
        },
      ],
      crm_eventos_da_conversa: [
        { id: "e1", tipo: "espera", user_id: USER_ID, created_at: "2026-10-18T11:00:00Z" },
      ],
    });
    const data = (await corpo(await EVENTOS(req("GET"), ctx))) as Array<{
      tipo: string;
      em: string;
    }>;
    expect(data.map((e) => e.tipo)).toEqual(["atendente", "espera"]);
  });
});

describe("pausa (D4)", () => {
  // sempre no futuro: a rota recusa pausa que já venceu
  const ATE = new Date(Date.now() + 3_600_000).toISOString();
  it("GET descreve; POST grava a pausa, o bot_silenced_until e pausa os follow-ups; DELETE retoma", async () => {
    const { escritas } = banco({
      conversations: [conversa({ bot_silenced_until: null })],
      crm_pausas_de_automacao: [],
      followup_enrollments: [{ id: "f1", status: "active", next_eval_at: "2026-10-19T10:00:00Z" }],
    });
    const estado = (await corpo(await PAUSA(req("GET"), ctx))) as {
      pausa: unknown;
      followups: { ativos: number };
    };
    expect(estado.pausa).toBeNull();
    expect(estado.followups.ativos).toBe(1);
    expect((await PAUSAR(req("POST", { ate: ATE }), ctx)).status).toBe(200);
    expect(escritas.find((e) => e.tabela === "conversations")!.valores).toEqual({
      bot_silenced_until: ATE,
    });
    expect(escritas.find((e) => e.tabela === "crm_pausas_de_automacao")!.valores).toMatchObject({
      ate: ATE,
      user_id: USER_ID,
      enrollments: ["f1"],
    });
    expect((await PAUSAR(req("POST", { ate: "2020-01-01T00:00:00Z" }), ctx)).status).toBe(422);
    const b2 = banco({
      conversations: [conversa({ bot_silenced_until: "infinity" })],
      crm_pausas_de_automacao: [
        {
          conversation_id: CV,
          ate: null,
          user_id: USER_ID,
          enrollments: ["f1"],
          created_at: "2026-10-18T10:00:00Z",
        },
      ],
    });
    expect((await RETOMAR(req("DELETE"), ctx)).status).toBe(204);
    expect(b2.escritas.find((e) => e.tabela === "conversations")!.valores).toEqual({
      bot_silenced_until: null,
    });
    expect(
      b2.escritas.find((e) => e.tabela === "crm_pausas_de_automacao" && e.op === "delete"),
    ).toBeTruthy();
  });
});
