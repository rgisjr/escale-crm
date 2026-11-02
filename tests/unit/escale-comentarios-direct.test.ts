// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const liberar = vi.hoisted(() => vi.fn());
vi.mock("@/lib/escale/comentarios/liberar", () => ({ liberarDirect: liberar }));

import type { SocialMessage } from "@/lib/channels/social/parser";
import { PREFIXO_DO_LIBERAR, SILENCIO_DA_AUTOMACAO_MS } from "@/lib/escale/comentarios/constantes";
import {
  aoReceberDirect,
  directCasa,
  extrasDoDirect,
  gatilhoDoDirect,
  limparCacheDasRegrasDeDirect,
  SEM_EXTRAS,
} from "@/lib/escale/comentarios/direct";

/** Fase 10D: o direct que entra, o silêncio da IA e os gatilhos de story. */
const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";
const ID_DO_DISPARO = "33333333-3333-4333-8333-333333333333";

describe("extrasDoDirect", () => {
  it("mention, resposta a story, botão e seguidor (no topo e dentro de message)", () => {
    expect(extrasDoDirect({ metadata: { isStoryMention: true } }).mencaoEmStory).toBe(true);
    expect(extrasDoDirect({ message: { metadata: { storyReply: { storyId: "s1", storyUrl: "https://x" } } } }).respostaAStory).toEqual({
      storyId: "s1",
      storyUrl: "https://x",
    });
    expect(extrasDoDirect({ metadata: { postbackPayload: "p" } }).botao).toBe("p");
    expect(extrasDoDirect({ metadata: { quickReplyPayload: "q" } }).botao).toBe("q");
    expect(extrasDoDirect({ message: { sender: { instagramProfile: { isFollower: false } } } }).seguidor).toBe(false);
  });
  it("payload vazio ou lixo → tudo falso/nulo e nunca lança", () => {
    for (const lixo of [{}, null, "x", 3, [], { message: "x", metadata: [] }]) {
      expect(extrasDoDirect(lixo)).toEqual(SEM_EXTRAS);
    }
  });
});

describe("gatilhoDoDirect", () => {
  it("escolhe o gatilho; toque no liberar não dispara nenhum", () => {
    expect(gatilhoDoDirect(SEM_EXTRAS)).toBe("instagram.message_received");
    expect(gatilhoDoDirect({ ...SEM_EXTRAS, mencaoEmStory: true })).toBe("instagram.story_mention");
    expect(gatilhoDoDirect({ ...SEM_EXTRAS, respostaAStory: { storyId: "s", storyUrl: null } })).toBe("instagram.story_reply");
    expect(gatilhoDoDirect({ ...SEM_EXTRAS, botao: `${PREFIXO_DO_LIBERAR}${ID_DO_DISPARO}` })).toBeNull();
  });
});

const payload = (texto: string, canal = CANAL) => ({
  contact_id: "c1",
  conversation_id: "v1",
  message_id: "m1",
  channel_session_id: canal,
  plataforma: "instagram",
  conta_id: "acc",
  conversa_zernio_id: "z1",
  texto,
  recebida_em: "2026-11-02T10:00:00Z",
  seguidor: null,
  story: null,
});

describe("directCasa", () => {
  const cfg = (filtro: unknown) => ({ channel_session_id: CANAL, filtro });
  it("conta errada não casa; mention casa sempre; mensagem pelo filtro", () => {
    expect(directCasa("instagram.message_received", cfg({ modo: "qualquer" }), payload("oi"))).toBe(true);
    expect(directCasa("instagram.message_received", { ...cfg({ modo: "qualquer" }), channel_session_id: "outra" }, payload("oi"))).toBe(false);
    expect(directCasa("instagram.story_mention", cfg({ modo: "qualquer" }), payload(""))).toBe(true);
    const palavra = cfg({ modo: "palavras", condicoes: [{ operador: "palavra_inteira", valor: "eu quero" }], combinar: "qualquer" });
    expect(directCasa("instagram.message_received", palavra, payload("Eu QUERO o link"))).toBe(true);
    expect(directCasa("instagram.message_received", palavra, payload("quero"))).toBe(false);
    expect(directCasa("comment.received", cfg({ modo: "qualquer" }), payload("oi"))).toBe(false);
    expect(directCasa("instagram.message_received", "lixo", payload("oi"))).toBe(false);
  });
});

interface Estado {
  regras: Array<{ id: string; trigger_event: string; trigger_config: unknown }>;
  silencio: string | null;
  updates: Array<Record<string, unknown>>;
  leiturasDeRegras: number;
  eventos: Array<Record<string, unknown>>;
  erroDoEvento?: boolean;
}
function banco(estado: Estado): SupabaseClient {
  return {
    from: (tabela: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        maybeSingle: async () => ({ data: { bot_silenced_until: estado.silencio }, error: null }),
        update: (v: Record<string, unknown>) => {
          estado.updates.push(v);
          return q;
        },
        then: (ok: (v: unknown) => unknown) => {
          if (tabela === "automation_rules") estado.leiturasDeRegras += 1;
          return ok(tabela === "automation_rules" ? { data: estado.regras, error: null } : { error: null });
        },
      };
      return q;
    },
    rpc: async (_nome: string, args: Record<string, unknown>) => {
      estado.eventos.push(args);
      return { error: estado.erroDoEvento ? { message: "boom" } : null };
    },
  } as unknown as SupabaseClient;
}
const msg = (texto: string | null, extra: Partial<SocialMessage> = {}): SocialMessage =>
  ({
    platform: "instagram",
    participantId: "u1",
    accountId: "acc",
    conversationId: "z1",
    externalId: "social:acc:m1",
    direction: "inbound",
    kind: "message",
    text: texto,
    sentAt: "2026-11-02T10:00:00Z",
    attachments: [],
    ...extra,
  }) as unknown as SocialMessage;
const entrada = (m: SocialMessage, extras = SEM_EXTRAS) => ({
  organizationId: ORG,
  channelSessionId: CANAL,
  contactId: "c1",
  conversationId: "v1",
  messageId: "m1",
  msg: m,
  extras,
});
const regra = (filtro: unknown) => ({
  id: "r1",
  trigger_event: "instagram.message_received",
  trigger_config: { channel_session_id: CANAL, filtro },
});

beforeEach(() => {
  liberar.mockReset();
  limparCacheDasRegrasDeDirect();
});

describe("aoReceberDirect", () => {
  it("sem regra: não cala a IA, não emite e não atualiza", async () => {
    const e: Estado = { regras: [], silencio: null, updates: [], leiturasDeRegras: 0, eventos: [] };
    expect(await aoReceberDirect(banco(e), entrada(msg("oi")))).toEqual({ calarIa: false });
    expect(e.eventos).toHaveLength(0);
    expect(e.updates).toHaveLength(0);
  });

  it("regra que casa: cala a IA por 10 min e emite o evento certo", async () => {
    const e: Estado = { regras: [regra({ modo: "qualquer" })], silencio: null, updates: [], leiturasDeRegras: 0, eventos: [] };
    const antes = Date.now();
    expect(await aoReceberDirect(banco(e), entrada(msg("oi")))).toEqual({ calarIa: true });
    const ate = Date.parse(String(e.updates[0]?.bot_silenced_until));
    expect(ate).toBeGreaterThanOrEqual(antes + SILENCIO_DA_AUTOMACAO_MS - 1000);
    expect(e.updates[0]).toMatchObject({ last_handoff_reason: "automacao_do_instagram" });
    expect(e.eventos[0]).toMatchObject({ p_event_type: "instagram.message_received", p_entity_kind: "contact", p_entity_id: "c1" });
    expect((e.eventos[0]?.p_payload as { texto: string }).texto).toBe("oi");
  });

  it("não encurta um silêncio maior", async () => {
    const e: Estado = {
      regras: [regra({ modo: "qualquer" })],
      silencio: "9999-01-01T00:00:00Z",
      updates: [],
      leiturasDeRegras: 0,
      eventos: [],
    };
    await aoReceberDirect(banco(e), entrada(msg("oi")));
    expect(e.updates).toHaveLength(0);
    expect(e.eventos).toHaveLength(1);
  });

  it("filtro que não casa: IA responde como hoje", async () => {
    const e: Estado = {
      regras: [regra({ modo: "palavras", condicoes: [{ operador: "contem", valor: "preço" }], combinar: "qualquer" })],
      silencio: null,
      updates: [],
      leiturasDeRegras: 0,
      eventos: [],
    };
    expect(await aoReceberDirect(banco(e), entrada(msg("bom dia")))).toEqual({ calarIa: false });
    expect(e.eventos).toHaveLength(0);
  });

  it("mention de página do Facebook e saída não fazem nada", async () => {
    const e: Estado = { regras: [regra({ modo: "qualquer" })], silencio: null, updates: [], leiturasDeRegras: 0, eventos: [] };
    const face = msg("x", { platform: "facebook" });
    expect(await aoReceberDirect(banco(e), entrada(face, { ...SEM_EXTRAS, mencaoEmStory: true }))).toEqual({ calarIa: false });
    expect(await aoReceberDirect(banco(e), entrada(msg("x", { direction: "outbound" })))).toEqual({ calarIa: false });
    expect(e.eventos).toHaveLength(0);
  });

  it("toque no liberar: chama liberarDirect, cala a IA e não emite", async () => {
    const e: Estado = { regras: [regra({ modo: "qualquer" })], silencio: null, updates: [], leiturasDeRegras: 0, eventos: [] };
    const r = await aoReceberDirect(banco(e), entrada(msg(null), { ...SEM_EXTRAS, botao: `${PREFIXO_DO_LIBERAR}${ID_DO_DISPARO}`, seguidor: true }));
    expect(r).toEqual({ calarIa: true });
    expect(liberar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ disparoId: ID_DO_DISPARO, seguidor: true, contaId: "acc" }));
    expect(e.eventos).toHaveLength(0);
    expect(e.updates).toHaveLength(1);
  });

  it("cache: duas mensagens em 30 s fazem uma leitura das regras", async () => {
    const e: Estado = { regras: [regra({ modo: "qualquer" })], silencio: null, updates: [], leiturasDeRegras: 0, eventos: [] };
    const admin = banco(e);
    await aoReceberDirect(admin, entrada(msg("a")));
    await aoReceberDirect(admin, entrada(msg("b")));
    expect(e.leiturasDeRegras).toBe(1);
  });

  it("erro do emit_event não lança", async () => {
    const e: Estado = { regras: [regra({ modo: "qualquer" })], silencio: null, updates: [], leiturasDeRegras: 0, eventos: [], erroDoEvento: true };
    await expect(aoReceberDirect(banco(e), entrada(msg("oi")))).resolves.toEqual({ calarIa: true });
  });
});
