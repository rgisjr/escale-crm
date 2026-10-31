import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as DA_CONVERSA } from "@/app/api/v1/respostas-rapidas/da-conversa/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/users/nome-do-atendente", () => ({
  nomesDosAtendentes: vi.fn(async () => new Map([["u-canal", "Teresinha"]])),
}));

const CV = "c0000000-0000-4000-8000-000000000001";
const CANAL = "d0000000-0000-4000-8000-000000000001";

const tabelas = {
  conversations: [
    {
      id: CV,
      organization_id: ORG_ID,
      channel_session_id: CANAL,
      assigned_to_user_id: null,
      channel_sessions: { provider: "waha", social_platform: null },
    },
  ],
  crm_setor_da_conversa: [],
  crm_setor_do_dispositivo: [],
  message_templates: [
    {
      id: "f0000000-0000-4000-8000-000000000001",
      organization_id: ORG_ID,
      owner_user_id: null,
      title: "fechamento",
      body: "Oi {{nome}}, PIX {{canal.pix_chave}} — {{atendente.nome}}",
      shortcut: "fechamento",
      created_by_user_id: USER_ID,
      updated_at: "2026-10-18T10:00:00Z",
    },
  ],
  crm_respostas_rapidas_extras: [],
  crm_respostas_rapidas_setores: [],
  channel_sessions: [{ display_name: "joao vendas1", phone_number: "5551999" }],
  channel_variables: [{ channel_session_id: CANAL, chave: "pix_chave", value_text: "51999600190" }],
  channel_routing_policies: [{ id: "pol" }],
  channel_routing_responsibles: [{ user_id: "u-canal" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  authOk("agent");
  vi.mocked(createClient).mockResolvedValue(
    bancoPorTabela(tabelas, { rpc: () => ({ data: false, error: null }) }).db as never,
  );
  vi.mocked(createAdminClient).mockReturnValue(bancoPorTabela(tabelas).db as never);
});

describe("GET /respostas-rapidas/da-conversa — corpo_pronto", () => {
  it("troca {{canal.*}} e {{atendente.*}} e deixa {{nome}} para o compositor", async () => {
    const r = await DA_CONVERSA(new NextRequest(`http://x?conversation_id=${CV}`, { method: "GET" } as never));
    const { data } = (await r.json()) as { data: { respostas: Array<{ corpo: string; corpo_pronto?: string }> } };
    expect(data.respostas).toHaveLength(1);
    expect(data.respostas[0]?.corpo).toContain("{{canal.pix_chave}}");
    expect(data.respostas[0]?.corpo_pronto).toBe("Oi {{nome}}, PIX 51999600190 — Teresinha");
  });

  it("se o canal não puder ser lido, a resposta sai sem corpo_pronto", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("sem service role");
    });
    const r = await DA_CONVERSA(new NextRequest(`http://x?conversation_id=${CV}`, { method: "GET" } as never));
    const { data } = (await r.json()) as { data: { respostas: Array<{ corpo_pronto?: string }> } };
    expect(r.status).toBe(200);
    expect(data.respostas[0]?.corpo_pronto).toBeUndefined();
  });
});
