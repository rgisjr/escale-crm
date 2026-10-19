import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as LIBERAR } from "@/app/api/v1/conversas-da-casca/[id]/liberar/route";
import {
  DELETE as CANCELAR,
  POST as ALTERAR,
} from "@/app/api/v1/conversas-da-casca/[id]/setor/route";
import { GET as MINHAS } from "@/app/api/v1/permissoes-de-atendimento/minhas/route";
import { audit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const CV = "c0000000-0000-4000-8000-000000000001";
const S1 = "a0000000-0000-4000-8000-000000000001";
const S2 = "a0000000-0000-4000-8000-000000000002";
const OUTRO = "b0000000-0000-4000-8000-000000000009";
const conversa = (extra: Record<string, unknown> = {}) => ({
  id: CV,
  organization_id: ORG_ID,
  status: "open",
  service_revision: 1,
  assigned_to_user_id: OUTRO,
  snooze_until: null,
  metadata: {},
  bot_silenced_until: null,
  contact_id: "ct",
  last_inbound_at: null,
  channel_session_id: "cs",
  ...extra,
});
const req = (metodo: string, corpo?: unknown) =>
  new NextRequest("http://x", {
    method: metodo,
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  } as never);
const ctx = { params: Promise.resolve({ id: CV }) };

function usar(
  tabelas: Parameters<typeof bancoPorTabela>[0],
  pode: Record<string, boolean> = {},
  rpcExtra: Record<string, unknown> = {},
) {
  const b = bancoPorTabela(tabelas, {
    rpc: (nome, args) => {
      if (nome === "fn_crm_pode")
        return { data: pode[(args as { p_chave: string }).p_chave] ?? false, error: null };
      if (nome in rpcExtra) return rpcExtra[nome];
      return { data: [conversa({ assigned_to_user_id: null })], error: null };
    },
  });
  vi.mocked(createClient).mockResolvedValue(b.db as never);
  return b;
}

beforeEach(() => {
  vi.mocked(audit).mockClear();
  authOk("agent");
});

describe("Alterar setor (Em transferência)", () => {
  it("grava o setor novo em transferência com os anteriores e solta o atendente", async () => {
    const { escritas, db } = usar({
      conversations: [conversa()],
      crm_setor_da_conversa: [],
      crm_setor_do_dispositivo: [{ channel_session_id: "cs", setor_id: S1 }],
      crm_setores: [{ id: S2 }],
    });
    const r = await ALTERAR(req("POST", { setor_id: S2 }), ctx);
    expect(r.status).toBe(200);
    expect(escritas.find((e) => e.tabela === "crm_setor_da_conversa")!.valores).toMatchObject({
      conversation_id: CV,
      organization_id: ORG_ID,
      setor_id: S2,
      em_transferencia: true,
      setor_anterior_id: S1,
      atendente_anterior_id: OUTRO,
      transferido_por: USER_ID,
    });
    expect(db.rpc).toHaveBeenCalledWith(
      "fn_conversation_assign",
      expect.objectContaining({
        p_conversation_id: CV,
        p_to_user_id: null,
        p_reason: "release",
        p_expected_assignee: OUTRO,
        p_enforce_expected: true,
      }),
    );
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "conversation.sector_transfer",
    });
    usar({
      conversations: [conversa()],
      crm_setor_da_conversa: [{ conversation_id: CV, setor_id: S2 }],
      crm_setor_do_dispositivo: [],
      crm_setores: [{ id: S2 }],
    });
    expect((await ALTERAR(req("POST", { setor_id: S2 }), ctx)).status).toBe(422);
  });
  it("cancelar volta o setor anterior e reatribui ao atendente anterior; sem transferência → 409", async () => {
    const { escritas, db } = usar({
      conversations: [conversa({ assigned_to_user_id: null })],
      crm_setor_da_conversa: [
        {
          conversation_id: CV,
          setor_id: S2,
          em_transferencia: true,
          setor_anterior_id: S1,
          atendente_anterior_id: OUTRO,
        },
      ],
    });
    expect((await CANCELAR(req("DELETE"), ctx)).status).toBe(204);
    expect(escritas.find((e) => e.tabela === "crm_setor_da_conversa")!.valores).toMatchObject({
      setor_id: S1,
      em_transferencia: false,
      setor_anterior_id: null,
      atendente_anterior_id: null,
    });
    expect(db.rpc).toHaveBeenCalledWith(
      "fn_conversation_assign",
      expect.objectContaining({
        p_to_user_id: OUTRO,
        p_reason: "transfer",
        p_expected_assignee: null,
        p_enforce_expected: true,
      }),
    );
    usar({
      conversations: [conversa()],
      crm_setor_da_conversa: [{ conversation_id: CV, setor_id: S2, em_transferencia: false }],
    });
    expect((await CANCELAR(req("DELETE"), ctx)).status).toBe(409);
  });
});

describe("liberar o atendimento de outra pessoa", () => {
  it("com 'Alterar atendentes' libera; com 'do setor' só sendo membro do setor efetivo; sem nada → 403", async () => {
    const { db } = usar({ conversations: [conversa()] }, { CHAT_CHANGE_ATTENDANT_ALL: true });
    expect((await LIBERAR(req("POST"), ctx)).status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith(
      "fn_conversation_assign",
      expect.objectContaining({
        p_to_user_id: null,
        p_expected_assignee: OUTRO,
        p_reason: "release",
      }),
    );
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "conversation.released_by_other",
    });
    usar(
      {
        conversations: [conversa()],
        crm_setor_da_conversa: [],
        crm_setor_do_dispositivo: [{ channel_session_id: "cs", setor_id: S1 }],
        crm_setores_membros: [{ setor_id: S1, user_id: USER_ID }],
      },
      { CHAT_CHANGE_ATTENDANT_TEAM: true },
    );
    expect((await LIBERAR(req("POST"), ctx)).status).toBe(200);
    usar(
      {
        conversations: [conversa()],
        crm_setor_da_conversa: [],
        crm_setor_do_dispositivo: [{ channel_session_id: "cs", setor_id: S1 }],
        crm_setores_membros: [],
      },
      { CHAT_CHANGE_ATTENDANT_TEAM: true },
    );
    expect((await LIBERAR(req("POST"), ctx)).status).toBe(403);
    usar(
      { conversations: [conversa({ assigned_to_user_id: null })] },
      { CHAT_CHANGE_ATTENDANT_ALL: true },
    );
    expect((await LIBERAR(req("POST"), ctx)).status).toBe(409);
  });
});

describe("as minhas permissões", () => {
  it("devolve as 9 editáveis pela fn_crm_pode", async () => {
    usar({}, { CHAT_VIEW_TEAM: true, CHAT_BULK_ACTIONS: false });
    const { data } = (await (await MINHAS(new NextRequest("http://x"))).json()) as {
      data: Record<string, boolean>;
    };
    expect(Object.keys(data)).toHaveLength(9);
    expect(data.CHAT_VIEW_TEAM).toBe(true);
    expect(data.CHAT_BULK_ACTIONS).toBe(false);
  });
});
