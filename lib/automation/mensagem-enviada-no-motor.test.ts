// @vitest-environment node
/**
 * Gatilho "mensagem enviada pela equipe contendo uma palavra-chave" (`message.sent`).
 * O banco é um dublê por tabela; a ação é um executor que anota qual regra chegou.
 *
 *     pnpm vitest run lib/automation/mensagem-enviada-no-motor.test.ts
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { registerAction } from "@/lib/automation/actions";
import { runAutomationForEvent } from "@/lib/automation/engine";
import type { EventRow } from "@/lib/event-log/dispatcher";

const ORG = "11111111-1111-4111-8111-111111111111";
const MSG = "22222222-2222-4222-8222-222222222222";
const CONTATO = "33333333-3333-4333-8333-333333333333";
const CANAL_A = "44444444-4444-4444-8444-444444444444";
const CANAL_B = "55555555-5555-4555-8555-555555555555";
const FRASE = "Põe estes dados, acessa o aplicativo e pode testar!";

const regrasQueRodaram: string[] = [];
registerAction({
  type: "call_webhook",
  async execute(ctx) {
    regrasQueRodaram.push(ctx.ruleId);
    return { type: "call_webhook", status: "success" };
  },
});

type Linha = Record<string, unknown>;

function bancoFalso(tabelas: Record<string, Linha[]>): SupabaseClient {
  function consulta(tabela: string) {
    const filtros: Array<[string, unknown]> = [];
    const linhas = () => (tabelas[tabela] ?? []).filter((l) => filtros.every(([c, v]) => l[c] === v));
    const q = {
      select: () => q,
      insert: () => q,
      update: () => q,
      order: () => q,
      limit: () => q,
      eq: (c: string, v: unknown) => {
        filtros.push([c, v]);
        return q;
      },
      maybeSingle: async () => ({ data: linhas()[0] ?? { id: "run-1" }, error: null }),
      then: (ok: (r: { data: Linha[]; error: null }) => unknown) => Promise.resolve({ data: linhas(), error: null }).then(ok),
    };
    return q;
  }
  return { from: consulta } as unknown as SupabaseClient;
}

function regra(id: string, triggerConfig: Record<string, unknown>): Linha {
  return {
    id,
    organization_id: ORG,
    trigger_event: "message.sent",
    is_active: true,
    name: `Regra ${id.slice(-2)}`,
    conditions: [],
    actions: [{ type: "call_webhook", config: { url: "https://exemplo.test/hook" } }],
    trigger_config: triggerConfig,
  };
}

const REGRA = "77777777-7777-4777-8777-7777777777a1";

function mundo(mensagem: Partial<Linha>, config: Record<string, unknown> = { palavra_chave: "Põe estes dados", modo: "contem" }) {
  return bancoFalso({
    messages: [
      { id: MSG, organization_id: ORG, body: FRASE, sent_via: "user", direction: "outbound", channel_session_id: CANAL_A, conversation_id: "c1", contact_id: CONTATO, ...mensagem },
    ],
    contacts: [{ id: CONTATO, organization_id: ORG, name: "Maria", is_personal: false }],
    automation_rules: [regra(REGRA, config)],
  });
}

function mensagemEnviada(payload: Record<string, unknown> = { status: "sent", conversation_id: "c1" }): EventRow {
  return {
    id: "evt-1",
    organization_id: ORG,
    event_type: "message.sent",
    entity_kind: "message",
    entity_id: MSG,
    payload,
    metadata: {},
    consumed_by: [],
    attempts: 0,
  };
}

async function rodou(banco: SupabaseClient, evento = mensagemEnviada()): Promise<boolean> {
  regrasQueRodaram.length = 0;
  await runAutomationForEvent(banco, evento);
  return regrasQueRodaram.includes(REGRA);
}

describe("regra de mensagem enviada com palavra-chave", () => {
  it("1. pessoa enviou a frase: a ação roda", async () => {
    expect(await rodou(mundo({}))).toBe(true);
  });
  it("1b. eco do aparelho (external_device) também conta", async () => {
    expect(await rodou(mundo({ sent_via: "external_device" }))).toBe(true);
  });
  it("2. a mesma frase enviada por automação NÃO roda (anti-laço)", async () => {
    expect(await rodou(mundo({ sent_via: "automation" }))).toBe(false);
  });
  it("2b. enviada pela IA também não", async () => {
    expect(await rodou(mundo({ sent_via: "ai" }))).toBe(false);
  });
  it("3. mensagem de pessoa sem a frase não roda", async () => {
    expect(await rodou(mundo({ body: "Bom dia, tudo bem?" }))).toBe(false);
  });
  it("4. status failed no evento não roda", async () => {
    expect(await rodou(mundo({}), mensagemEnviada({ status: "failed", conversation_id: "c1" }))).toBe(false);
  });
  it("5. regra presa a outro canal não roda", async () => {
    expect(await rodou(mundo({}, { palavra_chave: "Põe estes dados", modo: "contem", channel_session_id: CANAL_B }))).toBe(false);
  });
  it("6. regra sem canal roda em qualquer canal; com o canal certo também", async () => {
    expect(await rodou(mundo({ channel_session_id: CANAL_B }))).toBe(true);
    expect(await rodou(mundo({}, { palavra_chave: "põe estes dados", modo: "contem", channel_session_id: CANAL_A }))).toBe(true);
  });
  it("modo igual exige a mensagem inteira", async () => {
    expect(await rodou(mundo({}, { palavra_chave: "Põe estes dados", modo: "igual" }))).toBe(false);
  });
  it("config sem palavra-chave nunca dispara (regra gravada por fora do schema)", async () => {
    expect(await rodou(mundo({}, {}))).toBe(false);
  });
});
