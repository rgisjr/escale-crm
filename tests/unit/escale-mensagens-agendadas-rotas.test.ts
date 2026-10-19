import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as REMOVER } from "@/app/api/v1/mensagens-agendadas/[id]/route";
import { GET as CONTAGEM } from "@/app/api/v1/mensagens-agendadas/contagem/route";
import { GET as LISTAR, POST as CRIAR } from "@/app/api/v1/mensagens-agendadas/route";
import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import { audit } from "@/lib/audit";
import { enviarAgendada } from "@/lib/escale/conversas/envio-agendado";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/app/api/v1/messages/_handler", () => ({
  sendMessageHandler: vi.fn(async () => ({ id: "m1" })),
}));

const CV = "c0000000-0000-4000-8000-000000000001";
const CT = "c0000000-0000-4000-8000-000000000002";
const CS = "c0000000-0000-4000-8000-000000000003";
type Linha = Record<string, unknown>;

/** O mesmo Supabase de mentira da Task 3 (copie `banco` de tests/unit/escale-conversa-aberta-rotas.test.ts se preferir importar). */
function banco(tabelas: Record<string, Linha[]>, contagem = 0) {
  const escritas: Array<{ tabela: string; op: string; valores?: unknown }> = [];
  const from = vi.fn((tabela: string) => {
    const dados = tabelas[tabela] ?? [];
    const cadeia: Record<string, unknown> = {};
    let pendente: { op: string; valores?: unknown } | null = null;
    for (const m of [
      "select",
      "eq",
      "neq",
      "in",
      "is",
      "order",
      "limit",
      "not",
      "gt",
      "gte",
      "lte",
      "lt",
      "or",
      "ilike",
      "range",
    ])
      cadeia[m] = vi.fn(() => cadeia);
    cadeia.update = vi.fn((valores: unknown) => {
      pendente = { op: "update", valores };
      return cadeia;
    });
    cadeia.insert = vi.fn((valores: unknown) => {
      pendente = { op: "insert", valores };
      return cadeia;
    });
    const fechar = () => {
      if (pendente) escritas.push({ tabela, ...pendente });
      pendente = null;
    };
    cadeia.maybeSingle = vi.fn(async () => {
      fechar();
      return { data: dados[0] ?? null, error: null };
    });
    cadeia.single = vi.fn(async () => {
      fechar();
      return { data: dados[0] ?? null, error: null };
    });
    cadeia.then = (ok: (r: { data: Linha[]; error: null; count: number }) => unknown) => {
      fechar();
      return Promise.resolve({ data: dados, error: null, count: contagem || dados.length }).then(
        ok,
      );
    };
    return cadeia;
  });
  const db = { from };
  vi.mocked(createClient).mockResolvedValue(db as never);
  vi.mocked(createAdminClient).mockReturnValue(db as never);
  return { escritas, db };
}
const req = (metodo: string, url = "http://x/api/v1/mensagens-agendadas", corpo?: unknown) =>
  new NextRequest(url, {
    method: metodo,
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  } as never);
const corpo = async (r: Response) =>
  (await r.json()) as { data: unknown; meta?: unknown; error?: { message: string } };
const DAQUI_A_1H = new Date(Date.now() + 3_600_000).toISOString();

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(sendMessageHandler).mockClear();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("agent");
});

describe("POST (criar)", () => {
  it("grava uma linha por mensagem com criado_por = eu e audita; data passada → 422; conversa fora da visão → 404", async () => {
    const { escritas } = banco({
      conversations: [{ id: CV, organization_id: ORG_ID, contact_id: CT, channel_session_id: CS }],
    });
    const r = await CRIAR(
      req("POST", undefined, {
        conversation_id: CV,
        enviar_em: DAQUI_A_1H,
        mensagens: [
          { tipo: "texto", corpo: "Oi" },
          { tipo: "template", template: { name: "boas_vindas", language: "pt_BR", values: {} } },
        ],
      }),
    );
    expect(r.status).toBe(201);
    const insert = escritas.find((e) => e.tabela === "crm_mensagens_agendadas")!;
    expect(insert.valores).toHaveLength(2);
    expect((insert.valores as Linha[])[0]).toMatchObject({
      organization_id: ORG_ID,
      conversation_id: CV,
      contact_id: CT,
      channel_session_id: CS,
      tipo: "texto",
      corpo: "Oi",
      criado_por: USER_ID,
      enviar_em: DAQUI_A_1H,
    });
    expect((insert.valores as Linha[])[1]).toMatchObject({
      tipo: "template",
      template: { name: "boas_vindas", language: "pt_BR", values: {} },
      corpo: null,
    });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "conversation_message.scheduled",
    });

    const r2 = await CRIAR(
      req("POST", undefined, {
        conversation_id: CV,
        enviar_em: "2020-01-01T10:00:00.000Z",
        mensagens: [{ tipo: "texto", corpo: "Oi" }],
      }),
    );
    expect(r2.status).toBe(422);
    expect((await corpo(r2)).error?.message).toBe(
      "Não é possível agendar para uma data/hora no passado",
    );

    banco({ conversations: [] });
    expect(
      (
        await CRIAR(
          req("POST", undefined, {
            conversation_id: CV,
            enviar_em: DAQUI_A_1H,
            mensagens: [{ tipo: "texto", corpo: "Oi" }],
          }),
        )
      ).status,
    ).toBe(404);
  });
});

describe("GET (listar) e contagem", () => {
  it("lista pendentes com contato e dispositivo e devolve meta; a contagem agrupa por conversa", async () => {
    banco(
      {
        crm_mensagens_agendadas: [
          {
            id: "a1",
            conversation_id: CV,
            contact_id: CT,
            channel_session_id: CS,
            tipo: "texto",
            corpo: "Oi",
            template: null,
            enviar_em: DAQUI_A_1H,
            criado_por: USER_ID,
            status: "pendente",
            erro: null,
            created_at: DAQUI_A_1H,
            contacts: {
              name: "Ana",
              display_name: null,
              phone_number: "+5511",
              avatar_storage_path: null,
            },
            channel_sessions: {
              display_name: "Comercial",
              phone_number: "+5511",
              provider: "meta_cloud",
              status: "WORKING",
            },
          },
        ],
      },
      1,
    );
    const r = await LISTAR(
      req("GET", "http://x/api/v1/mensagens-agendadas?pagina=1&por_pagina=10"),
    );
    expect(r.status).toBe(200);
    const { data, meta } = await corpo(r);
    expect(meta).toEqual({ total: 1, pagina: 1, por_pagina: 10 });
    expect((data as Array<{ contato: unknown; dispositivo: unknown }>)[0]).toMatchObject({
      contato: { nome: "Ana", telefone: "+5511", tem_foto: false },
      dispositivo: { nome: "Comercial", provider: "meta_cloud", status: "WORKING" },
    });

    banco({
      crm_mensagens_agendadas: [
        { conversation_id: CV },
        { conversation_id: CV },
        { conversation_id: "outra" },
      ],
    });
    const c = await CONTAGEM(
      req("GET", `http://x/api/v1/mensagens-agendadas/contagem?conversation_ids=${CV},outra`),
    );
    expect((await corpo(c)).data).toEqual({ [CV]: 2, outra: 1 });
    expect(
      (await CONTAGEM(req("GET", "http://x/api/v1/mensagens-agendadas/contagem?conversation_ids=")))
        .status,
    ).toBe(422);
  });
});

describe("DELETE (remover)", () => {
  it("marca removida pela sessão e audita; 404 quando a RLS não deixa", async () => {
    const { escritas } = banco({ crm_mensagens_agendadas: [{ id: "a1", conversation_id: CV }] });
    expect(
      (
        await REMOVER(req("DELETE", "http://x/api/v1/mensagens-agendadas/a1"), {
          params: Promise.resolve({ id: "c0000000-0000-4000-8000-0000000000a1" }),
        })
      ).status,
    ).toBe(204);
    expect(escritas.find((e) => e.tabela === "crm_mensagens_agendadas")!.valores).toEqual({
      status: "removida",
    });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "conversation_message.unscheduled",
    });
    banco({ crm_mensagens_agendadas: [] });
    expect(
      (
        await REMOVER(req("DELETE", "http://x/api/v1/mensagens-agendadas/a1"), {
          params: Promise.resolve({ id: "c0000000-0000-4000-8000-0000000000a1" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("enviarAgendada (o passo do cron)", () => {
  const base = {
    id: "a1",
    organization_id: ORG_ID,
    conversation_id: CV,
    criado_por: USER_ID,
    tipo: "texto" as const,
    corpo: "Oi",
    template: null,
    canal: { status: "WORKING", provider: "meta_cloud" },
    lastInboundAt: new Date(Date.now() - 60_000).toISOString(),
  };
  it("envia texto dentro da janela em nome de quem agendou; fora da janela falha sem chamar o envio; template fora da janela envia", async () => {
    const { db } = banco({});
    const ok = await enviarAgendada(db as never, base, new Date(), "r1");
    expect(ok).toEqual({ status: "enviada", message_id: "m1" });
    expect(vi.mocked(sendMessageHandler)).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        organization_id: ORG_ID,
        actor: { type: "user", id: USER_ID },
        requestId: "r1",
      }),
      { conversation_id: CV, type: "text", body: "Oi" },
    );

    const fora = await enviarAgendada(
      db as never,
      { ...base, lastInboundAt: "2020-01-01T00:00:00Z" },
      new Date(),
      "r2",
    );
    expect(fora).toEqual({ status: "falhou", erro: "Fora da janela de 24h" });
    expect(vi.mocked(sendMessageHandler)).toHaveBeenCalledTimes(1);

    const tpl = await enviarAgendada(
      db as never,
      {
        ...base,
        tipo: "template",
        corpo: null,
        template: { name: "oi", language: "pt_BR", values: { "body:1": "Ana" } },
        lastInboundAt: "2020-01-01T00:00:00Z",
      },
      new Date(),
      "r3",
    );
    expect(tpl.status).toBe("enviada");
    expect(vi.mocked(sendMessageHandler).mock.calls.at(-1)?.[2]).toEqual({
      conversation_id: CV,
      type: "template",
      template_name: "oi",
      template_language: "pt_BR",
      template_values: { "body:1": "Ana" },
    });

    const caido = await enviarAgendada(
      db as never,
      { ...base, canal: { status: "STOPPED", provider: "meta_cloud" } },
      new Date(),
      "r4",
    );
    expect(caido).toEqual({ status: "falhou", erro: "Dispositivo desconectado" });

    vi.mocked(sendMessageHandler).mockRejectedValueOnce(new Error("provider caiu"));
    expect(await enviarAgendada(db as never, base, new Date(), "r5")).toEqual({
      status: "falhou",
      erro: "provider caiu",
    });
  });
});
