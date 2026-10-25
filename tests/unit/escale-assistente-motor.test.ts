import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/v1/messages/_handler", () => ({ sendMessageHandler: vi.fn() }));
vi.mock("@/lib/atendimento/origem", () => ({ beginServiceAtOrigin: vi.fn() }));
// Sem nome de provedor no teste: a capacidade é o que decide "oficial".
vi.mock("@/lib/channels/selectable", () => ({
  aceitaMensagemLivre: (p: string | null) => p === "livre",
}));

import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import { testarAcao, type CampanhaCarregada } from "@/lib/campanhas/acoes";
import { candidatosPorIds } from "@/lib/campanhas/consulta-de-audiencia";
import { prepararCampanha } from "@/lib/campanhas/preparacao";
import { beginServiceAtOrigin } from "@/lib/atendimento/origem";
import type { MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import { candidatosDaCasca } from "@/lib/escale/campanhas/candidatos";
import { custoPreparado } from "@/lib/escale/campanhas/custo";
import { modeloDaCampanha } from "@/lib/escale/campanhas/modelo";
import { bancoDeMentira, chamadasDe } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID } from "@/tests/helpers/stages-db-double";

const C1 = "bbbbbbbb-0000-4000-8000-000000000001";
const C2 = "bbbbbbbb-0000-4000-8000-000000000002";
const CAMPANHA = "dddddddd-0000-4000-8000-000000000001";
const NUMERO = "aaaaaaaa-0000-4000-8000-000000000001";

const contato = (id: string, name: string | null, phone: string | null = "+5511999990001") => ({
  id,
  created_at: "2026-10-01T00:00:00+00:00",
  name,
  display_name: null,
  phone_number: phone,
  is_blocked: false,
  is_personal: false,
  is_anonymized: false,
  consent: null,
});

const MODELO: MensagemDeModelo = {
  tipo: "modelo",
  nome: "msg1",
  idioma: "pt_BR",
  categoria: "MARKETING",
  corpo: "Oi, {{1}}! {{2}}",
  variaveis: {
    "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null },
    "2": { fonte: "campo", campo: "saudacao", alternativo: null },
  },
};

beforeEach(() => vi.clearAllMocks());

describe("candidatosPorIds", () => {
  it("na ordem dada, sem repetir, só pessoa e não mesclado", async () => {
    const banco = bancoDeMentira({
      tabelas: { contacts: [contato(C1, "Ana"), contato(C2, "Bia")] },
    });
    const r = await candidatosPorIds(banco.db as never, {
      organizationId: ORG_ID,
      ids: [C2, C1, C2],
      corpo: "Oi {{nome}}",
    });
    expect(r.map((c) => c.contactId)).toEqual([C2, C1]);
    const [consulta] = chamadasDe(banco.chamadas, "contacts", "select");
    expect(consulta!.filtros).toEqual(
      expect.arrayContaining([
        ["eq", "kind", "person"],
        ["is", "is_merged_into", null],
      ]),
    );
  });
});

describe("candidatosDaCasca", () => {
  it("campanha do original (sem público da casca) segue o filtro antigo", async () => {
    expect(
      await candidatosDaCasca(bancoDeMentira().db as never, {
        organization_id: ORG_ID,
        escale_publico: null,
        escale_mensagem: null,
        message_body: "x",
      }),
    ).toBeNull();
  });

  it("resolve o público no banco e devolve o modelo", async () => {
    const banco = bancoDeMentira({
      rpc: {
        // G7-2 (9401): o público inteiro vem numa linha só, como um uuid[].
        fn_escale_ids_do_publico: () => ({ data: [C1], error: null }),
      },
      tabelas: { contacts: [contato(C1, "Ana")], organizations: [{ timezone: "UTC" }] },
    });
    const r = await candidatosDaCasca(banco.db as never, {
      organization_id: ORG_ID,
      escale_publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] },
      escale_mensagem: MODELO,
      message_body: MODELO.corpo,
    });
    expect(r?.candidatos.map((c) => c.contactId)).toEqual([C1]);
    expect(r?.modelo?.nome).toBe("msg1");
    expect(banco.rpcs[0]!.args.p_publico).toMatchObject({ selecao: { tipo: "ids", ids: [C1] } });
  });
});

describe("prepararCampanha com o público da casca e o modelo", () => {
  it("congela os valores do modelo, o corpo legível e tira quem não tem o dado", async () => {
    const banco = bancoDeMentira();
    const resumo = await prepararCampanha(banco.db as never, {
      campanhaId: CAMPANHA,
      organizationId: ORG_ID,
      filtro: {},
      corpo: MODELO.corpo,
      contentVersion: 1,
      agora: new Date("2026-11-20T12:00:00.000Z"),
      candidatos: [
        {
          contactId: C1,
          nome: "Ana Souza",
          telefone: "+5511999990001",
          bloqueado: false,
          pessoal: false,
          anonimizado: false,
          recusouMarketing: false,
        },
        {
          contactId: C2,
          nome: null,
          telefone: "+5511999990002",
          bloqueado: false,
          pessoal: false,
          anonimizado: false,
          recusouMarketing: false,
        },
      ],
      modelo: MODELO,
    });
    expect(resumo).toMatchObject({
      total: 2,
      elegiveis: 1,
      excluidos: 1,
      motivos: { variavel_ausente: 1 },
    });
    const [insert] = chamadasDe(banco.chamadas, "campaign_recipients", "insert");
    const [ana, sem] = insert!.dados as Array<Record<string, unknown>>;
    expect(ana).toMatchObject({
      contact_id: C1,
      status: "pending",
      rendered_body: "Oi, Ana! {{saudacao}}",
      variables: { nome: "Ana Souza", modelo: { "1": "Ana", "2": "{{saudacao}}" } },
    });
    expect(sem).toMatchObject({
      contact_id: C2,
      status: "skipped",
      exclusion_reason: "variavel_ausente",
    });
  });

  it("sem candidatos, o filtro antigo continua obrigatório", async () => {
    await expect(
      prepararCampanha(bancoDeMentira().db as never, {
        campanhaId: CAMPANHA,
        organizationId: ORG_ID,
        filtro: {},
        corpo: "x",
        contentVersion: 1,
        agora: new Date(),
      }),
    ).rejects.toThrow(/Filtro de audiência inválido/);
  });
});

describe("modeloDaCampanha e custoPreparado", () => {
  it("lê o modelo só quando a mensagem é modelo", () => {
    expect(modeloDaCampanha(MODELO)?.nome).toBe("msg1");
    expect(modeloDaCampanha({ tipo: "texto", texto: "oi" })).toBeNull();
    expect(modeloDaCampanha(null)).toBeNull();
  });

  it("número que não aceita texto livre é oficial; a categoria vem do modelo; falha vira nulo", async () => {
    const oficial = bancoDeMentira({ tabelas: { channel_sessions: [{ provider: "oficial" }] } });
    expect(
      await custoPreparado(
        oficial.db as never,
        { organization_id: ORG_ID, escale_mensagem: MODELO },
        NUMERO,
      ),
    ).toEqual({
      escale_numero_oficial: true,
      escale_categoria_do_modelo: "MARKETING",
    });
    const quebrado = bancoDeMentira({ erroNaTabela: { channel_sessions: "x" } });
    expect(await custoPreparado(quebrado.db as never, { organization_id: ORG_ID }, NUMERO)).toEqual(
      {
        escale_numero_oficial: null,
        escale_categoria_do_modelo: null,
      },
    );
  });
});

describe("testarAcao com modelo", () => {
  it("manda o modelo com os valores do contato de teste", async () => {
    vi.mocked(beginServiceAtOrigin).mockResolvedValue({ conversation_id: "conv-1" } as never);
    vi.mocked(sendMessageHandler).mockResolvedValue({ status: "sent" } as never);
    const banco = bancoDeMentira({ tabelas: { contacts: [contato(C1, "Ana Souza")] } });
    const c: CampanhaCarregada = {
      id: CAMPANHA,
      organization_id: ORG_ID,
      name: "Teste",
      status: "ready",
      channel_session_id: NUMERO,
      message_body: MODELO.corpo,
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
      escale_mensagem: MODELO,
    };
    const r = await testarAcao(
      banco.db as never,
      c,
      C1,
      new Date("2026-11-20T12:00:00.000Z"),
      "America/Sao_Paulo",
    );
    expect(r.ok).toBe(true);
    const entrada = vi.mocked(sendMessageHandler).mock.calls[0]![2] as Record<string, unknown>;
    expect(entrada).toMatchObject({
      type: "template",
      template_name: "msg1",
      template_language: "pt_BR",
      template_values: { "1": "Ana", "2": "Bom dia" },
      body: "Oi, Ana! Bom dia",
    });
  });
});
