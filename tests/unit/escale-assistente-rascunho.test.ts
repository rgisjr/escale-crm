import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/channels/selectable", () => ({ listSelectableChannels: vi.fn() }));

import {
  GET as lerAssistenteRota,
  PUT,
} from "@/app/api/v1/campanhas-da-casca/[id]/assistente/route";
import { GET as numerosRota } from "@/app/api/v1/campanhas-da-casca/numeros/route";
import { POST } from "@/app/api/v1/campanhas-da-casca/route";
import { audit } from "@/lib/audit";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { POS_ENVIO_PADRAO, type Assistente } from "@/lib/escale/campanhas/assistente";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bancoDeMentira, chamadasDe } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const LIVRE = "aaaaaaaa-0000-4000-8000-000000000001";
const OFICIAL = "aaaaaaaa-0000-4000-8000-000000000002";
const CAMPANHA = "dddddddd-0000-4000-8000-000000000001";
const C1 = "bbbbbbbb-0000-4000-8000-000000000001";

const ASSISTENTE: Assistente = {
  nome: "Reativação de junho",
  numeroId: LIVRE,
  mensagem: { tipo: "texto", texto: "Oi {{primeiro_nome}}" },
  quando: { modo: "agora" },
  baseLegal: "consent",
  lia: null,
  publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] },
  posEnvio: POS_ENVIO_PADRAO,
  agenteId: null,
  ritmo: {},
  numerosExtras: [],
};
const MODELO = {
  tipo: "modelo" as const,
  nome: "msg1",
  idioma: "pt_BR",
  categoria: "MARKETING",
  corpo: "Oi {{1}}",
  variaveis: { "1": { fonte: "campo" as const, campo: "primeiro_nome", alternativo: null } },
};

beforeEach(() => {
  vi.clearAllMocks();
  authOk("manager");
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  vi.mocked(listSelectableChannels).mockResolvedValue([
    {
      id: LIVRE,
      display_name: "Naiara",
      status: "WORKING",
      phone_number: "+5516999653041",
      aceitaMensagemLivre: true,
    },
    {
      id: OFICIAL,
      display_name: "Bathully",
      status: "WORKING",
      phone_number: "+551153043062",
      aceitaMensagemLivre: false,
    },
  ]);
});

const pedir = (corpo: unknown) =>
  POST(
    new NextRequest("http://x/api/v1/campanhas-da-casca", {
      method: "POST",
      body: JSON.stringify(corpo),
    }),
  );

describe("POST /api/v1/campanhas-da-casca (criar o rascunho)", () => {
  it("cria com as colunas do assistente e audita", async () => {
    const banco = bancoDeMentira({
      tabelas: { campaigns: (c) => (c.op === "insert" ? [{ id: CAMPANHA }] : []) },
    });
    vi.mocked(createAdminClient).mockReturnValue(banco.db as never);
    const res = await pedir(ASSISTENTE);
    expect(res.status).toBe(201);
    expect((await res.json()).data).toEqual({ id: CAMPANHA });
    const [insert] = chamadasDe(banco.chamadas, "campaigns", "insert");
    expect(insert!.dados).toMatchObject({
      organization_id: ORG_ID,
      name: "Reativação de junho",
      escale_quando: null,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "campaign.created", resourceId: CAMPANHA }),
    );
  });

  it("número oficial exige modelo; número não oficial recusa modelo", async () => {
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect((await pedir({ ...ASSISTENTE, numeroId: OFICIAL })).status).toBe(422);
    expect((await pedir({ ...ASSISTENTE, mensagem: MODELO })).status).toBe(422);
  });

  it("modelo precisa estar aprovado e com todas as variáveis", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({ tabelas: { meta_templates: [{ status: "PENDING" }] } }).db as never,
    );
    expect((await pedir({ ...ASSISTENTE, numeroId: OFICIAL, mensagem: MODELO })).status).toBe(422);
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({ tabelas: { meta_templates: [{ status: "APPROVED" }] } }).db as never,
    );
    expect(
      (await pedir({ ...ASSISTENTE, numeroId: OFICIAL, mensagem: { ...MODELO, variaveis: {} } }))
        .status,
    ).toBe(422);
  });

  it("números extras só com número não oficial", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({ tabelas: { meta_templates: [{ status: "APPROVED" }] } }).db as never,
    );
    expect(
      (await pedir({ ...ASSISTENTE, numeroId: OFICIAL, mensagem: MODELO, numerosExtras: [LIVRE] }))
        .status,
    ).toBe(422);
  });

  it("número de outra organização é 409", async () => {
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect(
      (await pedir({ ...ASSISTENTE, numeroId: "aaaaaaaa-0000-4000-8000-0000000000ff" })).status,
    ).toBe(409);
  });

  it("dados fora do schema são 422", async () => {
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect((await pedir({ ...ASSISTENTE, nome: "ab" })).status).toBe(422);
  });
});

describe("PUT e GET /api/v1/campanhas-da-casca/[id]/assistente", () => {
  const ctx = { params: Promise.resolve({ id: CAMPANHA }) };

  it("salva só rascunho, sobe a versão do conteúdo quando a mensagem muda e audita", async () => {
    const banco = bancoDeMentira({
      tabelas: {
        campaigns: (c) =>
          c.op === "update"
            ? [{ id: CAMPANHA }]
            : [
                {
                  id: CAMPANHA,
                  status: "draft",
                  message_body: "antes",
                  escale_mensagem: null,
                  content_version: 3,
                },
              ],
      },
    });
    vi.mocked(createAdminClient).mockReturnValue(banco.db as never);
    const res = await PUT(
      new NextRequest(`http://x/api/v1/campanhas-da-casca/${CAMPANHA}/assistente`, {
        method: "PUT",
        body: JSON.stringify(ASSISTENTE),
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const [update] = chamadasDe(banco.chamadas, "campaigns", "update");
    expect(update!.dados).toMatchObject({
      content_version: 4,
      message_body: "Oi {{primeiro_nome}}",
    });
    expect(update!.filtros).toContainEqual(["eq", "status", "draft"]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "campaign.wizard_saved" }),
    );
  });

  it("campanha que não é rascunho é 409", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({
        tabelas: {
          campaigns: [
            {
              id: CAMPANHA,
              status: "running",
              message_body: "x",
              escale_mensagem: null,
              content_version: 1,
            },
          ],
        },
      }).db as never,
    );
    const res = await PUT(
      new NextRequest(`http://x/api/v1/campanhas-da-casca/${CAMPANHA}/assistente`, {
        method: "PUT",
        body: JSON.stringify(ASSISTENTE),
      }),
      ctx,
    );
    expect(res.status).toBe(409);
  });

  it("GET devolve o assistente da campanha", async () => {
    vi.mocked(createClient).mockResolvedValue(
      bancoDeMentira({
        tabelas: {
          campaigns: [
            {
              id: CAMPANHA,
              status: "draft",
              name: "Antiga",
              channel_session_id: LIVRE,
              message_body: "Oi",
              base_legal: "consent",
              lia_ref: null,
              agent_id: null,
              intervalo_segundos: null,
              janela_inicio_hora: null,
              janela_fim_hora: null,
              teto_diario: null,
              teto_horario: null,
              escale_mensagem: null,
              escale_publico: null,
              escale_pos_envio: null,
              escale_quando: null,
            },
          ],
        },
      }).db as never,
    );
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({ tabelas: { campaign_channel_sessions: [] } }).db as never,
    );
    const res = await lerAssistenteRota(
      new NextRequest(`http://x/api/v1/campanhas-da-casca/${CAMPANHA}/assistente`),
      ctx,
    );
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toMatchObject({ campanhaId: CAMPANHA, status: "draft", publicoAntigo: true });
    expect(data.assistente.mensagem).toEqual({ tipo: "texto", texto: "Oi" });
  });
});

describe("GET /api/v1/campanhas-da-casca/numeros", () => {
  it("oficial pela capacidade, com o provider e o setor", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({
        tabelas: {
          channel_sessions: [
            { id: LIVRE, provider: "p1" },
            { id: OFICIAL, provider: "p2" },
          ],
          crm_setor_do_dispositivo: [{ channel_session_id: OFICIAL, setor_id: "s1" }],
          crm_setores: [{ id: "s1", nome: "Atendimento" }],
        },
      }).db as never,
    );
    const res = await numerosRota(new NextRequest("http://x/api/v1/campanhas-da-casca/numeros"));
    expect((await res.json()).data).toEqual([
      {
        id: LIVRE,
        nome: "Naiara",
        telefone: "+5516999653041",
        conectado: true,
        oficial: false,
        provider: "p1",
        setor: null,
      },
      {
        id: OFICIAL,
        nome: "Bathully",
        telefone: "+551153043062",
        conectado: true,
        oficial: true,
        provider: "p2",
        setor: "Atendimento",
      },
    ]);
  });
});
