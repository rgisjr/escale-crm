import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/campanhas/acoes", () => ({
  carregarCampanha: vi.fn(),
  prepararAcao: vi.fn(),
  iniciarAcao: vi.fn(),
  agendarAcao: vi.fn(),
}));

import { GET as foraDaListaRota } from "@/app/api/v1/campanhas-da-casca/[id]/fora-da-lista/route";
import { POST } from "@/app/api/v1/campanhas-da-casca/[id]/[acao]/route";
import { audit } from "@/lib/audit";
import {
  agendarAcao,
  carregarCampanha,
  iniciarAcao,
  prepararAcao,
  type CampanhaCarregada,
} from "@/lib/campanhas/acoes";
import { nomeDaCopia } from "@/lib/escale/campanhas/acoes-do-assistente";
import { caminhoDaAcao } from "@/hooks/escale/useCampanhasDaCasca";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bancoDeMentira, chamadasDe } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const ID = "dddddddd-0000-4000-8000-000000000001";
const COPIA = "dddddddd-0000-4000-8000-000000000002";
const C1 = "bbbbbbbb-0000-4000-8000-000000000001";

const campanha = (extra: Partial<CampanhaCarregada> = {}): CampanhaCarregada => ({
  id: ID,
  organization_id: ORG_ID,
  name: "Reativação",
  status: "draft",
  channel_session_id: "aaaaaaaa-0000-4000-8000-000000000001",
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
  escale_mensagem: { tipo: "texto", texto: "Oi" },
  escale_publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] },
  escale_quando: null,
  ...extra,
});

const acao = (nome: string, corpo?: unknown) =>
  POST(
    new NextRequest(`http://x/api/v1/campanhas-da-casca/${ID}/${nome}`, {
      method: "POST",
      body: corpo ? JSON.stringify(corpo) : undefined,
    }),
    {
      params: Promise.resolve({ id: ID, acao: nome }),
    },
  );

beforeEach(() => {
  vi.clearAllMocks();
  authOk("manager");
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
});

describe("preparar", () => {
  it("prepara pelo motor do original e devolve os motivos de quem ficou fora", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({ ok: true, campanha: campanha() });
    vi.mocked(prepararAcao).mockResolvedValue({
      ok: true,
      resumo: { total: 3, elegiveis: 2, excluidos: 1 },
    });
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({
        rpc: {
          fn_escale_fora_da_lista: () => ({
            data: [{ motivo: "sem_telefone", quantidade: 1 }],
            error: null,
          }),
        },
      }).db as never,
    );
    const res = await acao("preparar");
    expect(res.status).toBe(200);
    expect((await res.json()).data.resumo).toEqual({
      total: 3,
      elegiveis: 2,
      excluidos: 1,
      motivos: [{ motivo: "sem_telefone", quantidade: 1 }],
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.prepared" }));
  });

  it("sem destinatário é recusado antes do motor", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({
      ok: true,
      campanha: campanha({ escale_publico: { selecao: null, avulsos: [], removidos: [] } }),
    });
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    const res = await acao("preparar");
    expect(res.status).toBe(422);
    expect(prepararAcao).not.toHaveBeenCalled();
  });
});

describe("enviar", () => {
  it("sem agendamento, inicia", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({
      ok: true,
      campanha: campanha({ status: "ready" }),
    });
    vi.mocked(iniciarAcao).mockResolvedValue({ ok: true, retomada: false });
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    const res = await acao("enviar");
    expect((await res.json()).data).toEqual({ modo: "iniciada", quando: null });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.started" }));
  });

  it("com agendamento no futuro, agenda; no passado, recusa", async () => {
    const futuro = new Date(Date.now() + 3_600_000).toISOString();
    vi.mocked(carregarCampanha).mockResolvedValue({
      ok: true,
      campanha: campanha({ status: "ready", escale_quando: futuro }),
    });
    vi.mocked(agendarAcao).mockResolvedValue({ ok: true });
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect((await (await acao("enviar")).json()).data).toEqual({
      modo: "agendada",
      quando: futuro,
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.scheduled" }));

    vi.mocked(carregarCampanha).mockResolvedValue({
      ok: true,
      campanha: campanha({ status: "ready", escale_quando: "2020-01-01T00:00:00.000Z" }),
    });
    expect((await acao("enviar")).status).toBe(422);
  });

  it("só campanha pronta", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({
      ok: true,
      campanha: campanha({ status: "draft" }),
    });
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect((await acao("enviar")).status).toBe(409);
  });
});

describe("duplicar", () => {
  it("copia tudo, com o nome + ' Cópia', e o rodízio", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({
      ok: true,
      campanha: campanha({ status: "completed" }),
    });
    const banco = bancoDeMentira({
      tabelas: {
        campaigns: (c) =>
          c.op === "insert"
            ? [{ id: COPIA }]
            : [
                {
                  name: "Reativação",
                  channel_session_id: "aaaaaaaa-0000-4000-8000-000000000001",
                  pipeline_id: "p",
                  stage_id: "s",
                  agent_id: "g",
                  escale_pos_envio: { tags: ["x"] },
                },
              ],
        campaign_channel_sessions: (c) =>
          c.filtros.some(([, , v]) => v === ID)
            ? [{ channel_session_id: "aaaaaaaa-0000-4000-8000-000000000009" }]
            : [],
        channel_sessions: [{ id: "aaaaaaaa-0000-4000-8000-000000000009" }],
      },
    });
    vi.mocked(createAdminClient).mockReturnValue(banco.db as never);
    const res = await acao("duplicar");
    expect((await res.json()).data).toEqual({ id: COPIA });
    const [insert] = chamadasDe(banco.chamadas, "campaigns", "insert");
    expect(insert!.dados).toMatchObject({
      name: "Reativação Cópia",
      pipeline_id: "p",
      stage_id: "s",
      agent_id: "g",
      escale_pos_envio: { tags: ["x"] },
    });
    expect(chamadasDe(banco.chamadas, "campaign_channel_sessions", "insert")).toHaveLength(1);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.duplicated" }));
  });

  it("o nome da cópia cabe nos 80", () => {
    expect(nomeDaCopia("x".repeat(80))).toHaveLength(80);
    expect(nomeDaCopia("x".repeat(80)).endsWith(" Cópia")).toBe(true);
  });

  it("o hook da lista duplica pela rota do fork", () => {
    expect(caminhoDaAcao({ id: ID, acao: "duplicar" })).toEqual({
      metodo: "post",
      url: `/api/v1/campanhas-da-casca/${ID}/duplicar`,
    });
  });
});

describe("GET fora-da-lista", () => {
  it("devolve os motivos", async () => {
    vi.mocked(createClient).mockResolvedValue(
      bancoDeMentira({
        rpc: {
          fn_escale_fora_da_lista: () => ({
            data: [{ motivo: "duplicado", quantidade: 2 }],
            error: null,
          }),
        },
      }).db as never,
    );
    const res = await foraDaListaRota(
      new NextRequest(`http://x/api/v1/campanhas-da-casca/${ID}/fora-da-lista`),
      {
        params: Promise.resolve({ id: ID }),
      },
    );
    expect((await res.json()).data).toEqual([{ motivo: "duplicado", quantidade: 2 }]);
  });
});
