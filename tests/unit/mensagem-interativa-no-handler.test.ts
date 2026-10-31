/**
 * Botões e lista saem PELA CADEIA DE ENVIO: a mensagem é gravada como texto numerado com
 * `metadata.interativo`, e só o canal com a capacidade `interativo` (API oficial) leva o objeto
 * `interactive`. Nos demais, o texto numerado que já está no `body` é o que vai.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import type { HandlerCtx } from "@/lib/api/handlers/types";
import { getAdapter } from "@/lib/channels";
import { textoNumeradoDeReserva, type Interativo } from "@/lib/channels/interativo";
import type { SendMessageInput } from "@/lib/schemas";
import { criarDubleDoHandler } from "@/tests/helpers/duble-do-handler";

const ORG = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";
const CONTACT = "33333333-3333-4333-8333-333333333333";
const SESSION = "44444444-4444-4444-8444-444444444444";
const USER = "55555555-5555-4555-8555-555555555555";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
        maybeSingle: async () => ({ data: null, error: null }),
      }),
      maybeSingle: async () => ({ data: null, error: null }),
    }),
    rpc: async () => ({ data: null, error: null }),
  }),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("@/lib/users/nome-do-atendente", () => ({ nomesDosAtendentes: vi.fn(async () => new Map()) }));

const lista: Interativo = {
  tipo: "lista",
  corpo: "Qual aparelho?",
  botaoDaLista: "Escolher",
  linhas: [{ id: "tv", titulo: "TV" }],
};

function conversa(provider: "meta_cloud" | "waha"): Record<string, unknown> {
  return {
    id: CONV,
    organization_id: ORG,
    contact_id: CONTACT,
    channel_session_id: SESSION,
    is_group: false,
    group_chat_id: null,
    provider_conversation_id: null,
    contacts: { phone_number: "+5531998966398", wa_identity: null, wa_lid: null, is_blocked: false },
    channel_sessions: {
      provider,
      waha_session_name: provider === "waha" ? "default" : null,
      meta_phone_number_id: provider === "meta_cloud" ? "1103328999528818" : null,
      zernio_account_id: null,
      status: "WORKING",
      archived_at: null,
    },
  };
}

const ctx: HandlerCtx = { organization_id: ORG, actor: { type: "user", id: USER }, requestId: "req-1" };
const mensagem = (metadata: Record<string, unknown>): SendMessageInput =>
  ({
    conversation_id: CONV,
    type: "text",
    body: textoNumeradoDeReserva(lista),
    metadata,
  }) as SendMessageInput;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mensagem interativa pela cadeia de envio", () => {
  it("canal oficial: a Graph recebe type:interactive com a lista", async () => {
    vi.stubEnv("META_PHONE_NUMBER_ID", "1103328999528818");
    vi.stubEnv("META_SYSTEM_USER_TOKEN", "tok");
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid.I" }] }) }));
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, capturas } = criarDubleDoHandler({
      conversation: conversa("meta_cloud"),
      organizacao: { settings: {}, status: "active" },
    });

    await sendMessageHandler(supabase, ctx, mensagem({ interativo: lista }));

    const corpo = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body)) as Record<string, unknown>;
    expect(corpo).toMatchObject({ type: "interactive", interactive: { type: "list" } });
    // O que fica gravado (e a equipe vê) é o texto numerado.
    expect(capturas.inserts.messages!.at(-1)?.["body"]).toBe("Qual aparelho?\n\n1 - TV");
  });

  it("canal sem a capacidade: o envelope não leva interativo e sai o texto numerado", async () => {
    vi.spyOn(getAdapter("waha"), "isConfigured").mockReturnValue(true);
    const enviar = vi.spyOn(getAdapter("waha"), "send").mockResolvedValue({ externalId: "waha-1" });
    const { supabase } = criarDubleDoHandler({
      conversation: conversa("waha"),
      organizacao: { settings: {}, status: "active" },
    });

    await sendMessageHandler(supabase, ctx, mensagem({ interativo: lista }));

    const envelope = enviar.mock.calls[0]![0];
    expect(envelope.interativo).toBeUndefined();
    expect(envelope.body).toBe("Qual aparelho?\n\n1 - TV");
  });

  it("metadata.interativo inválido no canal oficial é ignorado: sai texto", async () => {
    vi.stubEnv("META_PHONE_NUMBER_ID", "1103328999528818");
    vi.stubEnv("META_SYSTEM_USER_TOKEN", "tok");
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid.T" }] }) }));
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = criarDubleDoHandler({
      conversation: conversa("meta_cloud"),
      organizacao: { settings: {}, status: "active" },
    });

    await sendMessageHandler(supabase, ctx, mensagem({ interativo: { tipo: "lista" } }));

    const corpo = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body)) as Record<string, unknown>;
    expect(corpo.type).toBe("text");
  });
});
