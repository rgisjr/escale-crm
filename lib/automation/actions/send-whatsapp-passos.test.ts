// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionCtx } from "@/lib/automation/types";

const { sendMessageHandler, enviador, lerAtivos } = vi.hoisted(() => ({
  sendMessageHandler: vi.fn(),
  enviador: { texto: vi.fn(), midia: vi.fn() },
  lerAtivos: vi.fn(),
}));

vi.mock("@/app/api/v1/messages/_handler", () => ({ sendMessageHandler }));
vi.mock("@/lib/automation/passos-pelo-handler", () => ({ enviadorPeloHandler: () => enviador }));
vi.mock("@/lib/canais/ativos-do-canal", () => ({ lerAtivosDoCanal: lerAtivos }));
vi.mock("@/lib/agenda/efeito", () => ({ assertAgendaEffectSupabase: vi.fn(async () => undefined) }));
vi.mock("@/lib/agenda/protecao-followup", () => ({ protecaoAgendaSupabase: vi.fn() }));
vi.mock("@/lib/automation/fontes-da-automacao", () => ({ fontesDaAutomacao: vi.fn(async () => ({})) }));
vi.mock("@/lib/atendimento/origem-automacao", () => ({
  serviceForAutomation: vi.fn(async () => ({ conversation_id: "conversa-1" })),
}));
vi.mock("@/lib/automation/throttle", () => ({
  espacarEnvio: vi.fn(async () => undefined),
  checkDailyLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock("@/lib/automation/janela-do-canal", () => ({ adiarAteAJanelaAbrir: vi.fn(async () => null) }));
vi.mock("@/lib/canais/horario-comercial", () => ({ adiarAteHorarioComercial: vi.fn(async () => null) }));

import { getAction } from "@/lib/automation/actions";
import "@/lib/automation/actions/send-whatsapp";
import { actionSchema } from "@/lib/schemas/webhooks";

const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";

function ctx(): ActionCtx {
  return {
    admin: {} as ActionCtx["admin"],
    organizationId: ORG,
    ruleId: "regra-1",
    ruleName: "Boas-vindas",
    event: { id: "evento-1" } as ActionCtx["event"],
    requestId: "req-1",
    context: { contact: { id: "contato-1", phone_number: "+5511999998888" } },
  };
}

function executar(config: Record<string, unknown>) {
  const acao = getAction("send_whatsapp_message");
  if (!acao) throw new Error("send_whatsapp_message não está registrada");
  return acao.execute(ctx(), config);
}

beforeEach(() => {
  vi.clearAllMocks();
  enviador.texto.mockResolvedValue(undefined);
  enviador.midia.mockResolvedValue(undefined);
  lerAtivos.mockResolvedValue({ bv1: "ativo-bv1" });
  sendMessageHandler.mockResolvedValue({ id: "m1", status: "sent" });
});

describe("send_whatsapp_message com passos", () => {
  it("envia o áudio do número e depois o texto, na ordem", async () => {
    const r = await executar({
      channel_session_id: CANAL,
      passos: [
        { tipo: "midia", asset: "var:bv1" },
        { tipo: "texto", texto: "Oi!" },
      ],
    });
    expect(r).toMatchObject({ status: "success", detail: { passos: 2 } });
    expect(enviador.midia).toHaveBeenCalledWith({ assetId: "ativo-bv1" }, "rule:regra-1:evento-1:0:0");
    expect(enviador.texto).toHaveBeenCalledWith("Oi!", "rule:regra-1:evento-1:0:1");
    expect(sendMessageHandler).not.toHaveBeenCalled();
  });
  it("áudio ausente no número falha antes de enviar qualquer coisa", async () => {
    const r = await executar({
      channel_session_id: CANAL,
      passos: [
        { tipo: "texto", texto: "Oi!" },
        { tipo: "midia", asset: "var:bv9" },
      ],
    });
    expect(r).toMatchObject({ status: "failed", error: "ativo_ausente_no_numero:bv9" });
    expect(enviador.texto).not.toHaveBeenCalled();
  });
  it("passos inválidos falham sem enviar", async () => {
    const r = await executar({ channel_session_id: CANAL, passos: [] });
    expect(r).toMatchObject({ status: "failed", error: "passos_invalidos" });
  });
  it("com template continua o caminho de sempre", async () => {
    const r = await executar({ channel_session_id: CANAL, template: "Olá" });
    expect(r).toMatchObject({ status: "success" });
    expect(sendMessageHandler).toHaveBeenCalledTimes(1);
    expect(enviador.texto).not.toHaveBeenCalled();
  });
});

describe("schema da ação send_whatsapp_message", () => {
  const base = { type: "send_whatsapp_message" };
  it("recusa template e passos juntos, e recusa nenhum dos dois", () => {
    const passos = [{ tipo: "texto", texto: "oi" }];
    expect(actionSchema.safeParse({ ...base, config: { channel_session_id: CANAL, template: "x", passos } }).success).toBe(false);
    expect(actionSchema.safeParse({ ...base, config: { channel_session_id: CANAL } }).success).toBe(false);
    expect(actionSchema.safeParse({ ...base, config: { channel_session_id: CANAL, passos } }).success).toBe(true);
    expect(actionSchema.safeParse({ ...base, config: { channel_session_id: CANAL, template: "x" } }).success).toBe(true);
  });
});
