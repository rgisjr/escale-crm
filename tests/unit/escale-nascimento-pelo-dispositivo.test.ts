import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  decisaoDoDispositivo,
  destinosDasCondicoesValem,
  nascimentoPeloDispositivo,
} from "@/lib/escale/conversas/criacao-de-negocio-banco";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/leads/activity-emitter", () => ({
  emitLeadActivity: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const ORG = "a0000000-0000-4000-8000-0000000000aa";
const CV = "c0000000-0000-4000-8000-000000000001";
const MSG = "d0000000-0000-4000-8000-000000000001";
const O = "e0000000-0000-4000-8000-000000000001";
const E = "e0000000-0000-4000-8000-000000000002";
const regra = {
  id: "r1",
  nome: "Condição 1",
  tipo: "contem",
  mensagens: ["orçamento"],
  origem_id: O,
  etapa_id: E,
  tags: ["vip"],
  manter_atendente: true,
};
const base = (
  config: Record<string, unknown> | null,
  primeira = MSG,
  extra: Record<string, unknown[]> = {},
) =>
  bancoPorTabela(
    {
      conversations: [{ id: CV, channel_session_id: "cs1", assigned_to_user_id: null }],
      crm_criacao_de_negocio: config ? [config] : [],
      messages: [{ id: primeira }],
      crm_leads: [{ id: "lead-novo", owner_user_id: "dono-1" }],
      ...extra,
    },
    {
      rpc: (nome) =>
        nome === "fn_escale_nascer_negocio_do_dispositivo"
          ? { data: "lead-novo", error: null }
          : { data: null, error: null },
    },
  );
const consulta = {
  organizationId: ORG,
  conversationId: CV,
  texto: "Quero um orçamento",
  messageId: MSG,
};

beforeEach(() => vi.clearAllMocks());

describe("decisaoDoDispositivo (N3)", () => {
  it("sem configuração = o padrão de hoje", async () => {
    expect(await decisaoDoDispositivo(base(null).db as never, consulta)).toEqual({
      tipo: "padrao",
    });
  });
  it("desligado, sem texto, não é a primeira, sem regra = nenhum", async () => {
    expect(
      await decisaoDoDispositivo(base({ ligado: false, regras: [regra] }).db as never, consulta),
    ).toEqual({ tipo: "nenhum", motivo: "desligado" });
    expect(
      await decisaoDoDispositivo(base({ ligado: true, regras: [regra] }).db as never, {
        ...consulta,
        texto: null,
      }),
    ).toEqual({ tipo: "nenhum", motivo: "sem_regra" });
    expect(
      await decisaoDoDispositivo(
        base({ ligado: true, regras: [regra] }, "outra").db as never,
        consulta,
      ),
    ).toEqual({ tipo: "nenhum", motivo: "nao_e_a_primeira" });
    expect(
      await decisaoDoDispositivo(base({ ligado: true, regras: [regra] }).db as never, {
        ...consulta,
        texto: "oi",
      }),
    ).toEqual({ tipo: "nenhum", motivo: "sem_regra" });
  });
  it("a primeira mensagem de mídia (sem texto) casa com 'Qualquer mensagem'", async () => {
    const qualquer = { ...regra, id: "r2", tipo: "qualquer", mensagens: [] };
    expect(
      await decisaoDoDispositivo(base({ ligado: true, regras: [regra, qualquer] }).db as never, {
        ...consulta,
        texto: null,
      }),
    ).toMatchObject({ tipo: "regra", regra: { id: "r2" } });
  });
  it("a condição que casa", async () => {
    expect(
      await decisaoDoDispositivo(base({ ligado: true, regras: [regra] }).db as never, consulta),
    ).toMatchObject({ tipo: "regra", regra: { id: "r1" } });
  });
});

describe("nascimentoPeloDispositivo (N5–N7)", () => {
  it("padrão devolve null (o original segue)", async () => {
    expect(
      await nascimentoPeloDispositivo(
        base(null).db as never,
        {
          organizationId: ORG,
          contactId: "ct",
          conversationId: CV,
          nomeDoContato: null,
          texto: consulta.texto,
          messageId: consulta.messageId,
        },
        null,
      ),
    ).toBeNull();
  });
  it("nenhum vira 'pelo_dispositivo'; a regra nasce pela RPC com as tags e mantém o atendente", async () => {
    const off = base({ ligado: false, regras: [] });
    expect(
      await nascimentoPeloDispositivo(
        off.db as never,
        {
          organizationId: ORG,
          contactId: "ct",
          conversationId: CV,
          nomeDoContato: null,
          texto: consulta.texto,
          messageId: consulta.messageId,
        },
        null,
      ),
    ).toEqual({ criado: false, motivo: "pelo_dispositivo", detalhe: "desligado" });
    const on = base({ ligado: true, regras: [regra] });
    const r = await nascimentoPeloDispositivo(
      on.db as never,
      {
        organizationId: ORG,
        contactId: "ct",
        conversationId: CV,
        nomeDoContato: "Maria",
        texto: consulta.texto,
        messageId: consulta.messageId,
      },
      { display_name: "Maria", name: null, phone_number: null },
    );
    expect(r).toEqual({ criado: true, leadId: "lead-novo", pipelineId: O, stageId: E });
    expect(on.db.rpc).toHaveBeenCalledWith(
      "fn_escale_nascer_negocio_do_dispositivo",
      expect.objectContaining({
        p_pipeline: O,
        p_stage: E,
        p_title: "Maria",
        p_tags_do_contato: ["vip"],
      }),
    );
    expect(on.db.rpc).toHaveBeenCalledWith(
      "fn_conversation_assign",
      expect.objectContaining({
        p_conversation_id: CV,
        p_to_user_id: "dono-1",
        p_reason: "routing",
      }),
    );
  });
});

describe("destinosDasCondicoesValem (revisão da Frente C)", () => {
  const etapa = (extra: Record<string, unknown> = {}) => ({
    id: E,
    pipeline_id: O,
    is_archived: false,
    is_won: false,
    is_lost: false,
    crm_pipelines: { is_archived: false },
    ...extra,
  });
  const valem = (linhas: Record<string, unknown>[]) =>
    destinosDasCondicoesValem(bancoPorTabela({ crm_stages: linhas }).db as never, ORG, [
      { origem_id: O, etapa_id: E },
    ]);
  it("vale: etapa da organização, do funil, aberta", async () => {
    expect(await valem([etapa()])).toBe(true);
  });
  it("não vale: etapa inexistente, de outro funil, arquivada, ganho/perda ou funil arquivado", async () => {
    expect(await valem([])).toBe(false);
    expect(await valem([etapa({ pipeline_id: "outro" })])).toBe(false);
    expect(await valem([etapa({ is_archived: true })])).toBe(false);
    expect(await valem([etapa({ is_won: true })])).toBe(false);
    expect(await valem([etapa({ is_lost: true })])).toBe(false);
    expect(await valem([etapa({ crm_pipelines: { is_archived: true } })])).toBe(false);
  });
});
