// @vitest-environment node
/**
 * Fase 10B: o gatilho `comment.received` no motor de automações. O banco é um dublê mínimo (o mesmo
 * de `lib/automation/regra-por-fonte-no-motor.test.ts`); o fork é dublado nas bordas (disparos).
 *
 *     pnpm vitest run tests/unit/escale-comentarios-motor.test.ts
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
const reivindicar = vi.hoisted(() => vi.fn());
const concluir = vi.hoisted(() => vi.fn());
vi.mock("@/lib/escale/comentarios/disparos", () => ({
  reivindicarDisparos: reivindicar,
  concluirDisparo: concluir,
}));

import { registerAction } from "@/lib/automation/actions";
import { runAutomationForEvent } from "@/lib/automation/engine";
import type { EventRow } from "@/lib/event-log/dispatcher";
import {
  GATILHOS_SO_DA_CASCA,
  TRIGGER_EVENTS,
  TRIGGER_EVENTS_DO_ORIGINAL,
  createAutomationRuleSchema,
} from "@/lib/schemas/webhooks";

const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";
const OUTRO_CANAL = "55555555-5555-4555-8555-555555555555";
const CONTATO = "33333333-3333-4333-8333-333333333333";
const REGRA_CASA = "77777777-7777-4777-8777-7777777777a1";
const REGRA_OUTRA_CONTA = "77777777-7777-4777-8777-7777777777b1";

const rodaram: string[] = [];
registerAction({
  type: "call_webhook",
  async execute(ctx) {
    rodaram.push(ctx.ruleId);
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

const configDo = (canal: string) => ({
  channel_session_id: canal,
  escopo: "todos",
  caminhos: [{ id: "qualquer", publicacoes: [], filtro: { modo: "qualquer" }, resposta: null }],
});
const regra = (id: string, canal: string): Linha => ({
  id,
  organization_id: ORG,
  trigger_event: "comment.received",
  is_active: true,
  name: "Comentário",
  conditions: [],
  actions: [{ type: "call_webhook", config: { url: "https://exemplo.test/hook" } }],
  trigger_config: configDo(canal),
});

const comentario = (): EventRow => ({
  id: "evt-1",
  organization_id: ORG,
  event_type: "comment.received",
  entity_kind: "contact",
  entity_id: CONTATO,
  payload: {
    contact_id: CONTATO,
    channel_session_id: CANAL,
    plataforma: "instagram",
    conta_id: "acc-1",
    comentario: {
      id: "c-1",
      texto: "quero o link",
      comentado_em: "2026-11-01T10:00:00.000Z",
      publicacao_id: "179",
      publicacao_zernio_id: null,
      autor: { id: "u-1", usuario: "fulano", nome: "Fulano" },
    },
    publicacao: { legenda: null, miniatura: null, link: null },
  },
  metadata: {},
  consumed_by: [],
  attempts: 0,
});

const mundo = () =>
  bancoFalso({
    contacts: [{ id: CONTATO, organization_id: ORG, is_personal: false }],
    automation_rules: [regra(REGRA_CASA, CANAL), regra(REGRA_OUTRA_CONTA, OUTRO_CANAL)],
  });

beforeEach(() => {
  rodaram.length = 0;
  reivindicar.mockReset();
  concluir.mockReset();
  reivindicar.mockImplementation(async (_a: unknown, _r: unknown, regras: unknown[]) => regras);
});

describe("gatilho de comentário no motor", () => {
  it("só a regra com a conta certa é reivindicada e roda; depois fecha o disparo com o runId", async () => {
    const r = await runAutomationForEvent(mundo(), comentario());
    expect(r.status).toBe("ok");
    expect(reivindicar.mock.calls[0]?.[2].map((x: { id: string }) => x.id)).toEqual([REGRA_CASA]);
    expect(rodaram).toEqual([REGRA_CASA]);
    expect(concluir).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ runId: "run-1" }));
  });

  it("reivindicar devolve [] → comentario_ja_tratado, sem run nem ação", async () => {
    reivindicar.mockResolvedValue([]);
    const r = await runAutomationForEvent(mundo(), comentario());
    expect(r).toMatchObject({ status: "ok", detail: "comentario_ja_tratado" });
    expect(rodaram).toEqual([]);
    expect(concluir).not.toHaveBeenCalled();
  });

  it("nenhuma regra casa a conta → no_match, sem tocar o fork", async () => {
    const outroCanal = { ...comentario(), payload: { ...comentario().payload, channel_session_id: "99999999-9999-4999-8999-999999999999" } };
    const r = await runAutomationForEvent(mundo(), outroCanal);
    expect(r).toMatchObject({ detail: "no_match" });
    expect(reivindicar).not.toHaveBeenCalled();
  });

  it("evento de outro tipo não chama nada do fork", async () => {
    const banco = bancoFalso({
      crm_leads: [{ id: "l1", organization_id: ORG, contact_id: null, source_metadata: {} }],
      automation_rules: [{ ...regra("77777777-7777-4777-8777-7777777777c1", CANAL), trigger_event: "lead.created", trigger_config: {} }],
    });
    await runAutomationForEvent(banco, {
      ...comentario(),
      event_type: "lead.created",
      entity_kind: "crm_lead",
      entity_id: "l1",
      payload: { lead_id: "l1" },
    });
    expect(reivindicar).not.toHaveBeenCalled();
    expect(concluir).not.toHaveBeenCalled();
  });
});

describe("schema do motor com o gatilho de comentário", () => {
  const passo = { type: "send_instagram_message", config: { texto: "Oi!", botoes: [] } };
  const corpo = (extra: Record<string, unknown> = {}) => ({
    name: "Comentário",
    trigger_event: "comment.received",
    trigger_config: configDo(CANAL),
    actions: [passo],
    ...extra,
  });

  it("aceita uma regra de comentário completa", () => {
    expect(createAutomationRuleSchema.safeParse(corpo()).success).toBe(true);
  });
  it("recusa sem conta, com a mensagem da Clint", () => {
    const r = createAutomationRuleSchema.safeParse(corpo({ trigger_config: configDo("") }));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain("Selecione um dispositivo para ver as publicações.");
  });
  it("recusa o passo Instagram com outro gatilho", () => {
    const r = createAutomationRuleSchema.safeParse(corpo({ trigger_event: "lead.won", trigger_config: {} }));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain("O passo Instagram funciona com os gatilhos");
  });
  it("o designer original não lista o gatilho", () => {
    expect(TRIGGER_EVENTS).toContain("comment.received");
    expect(TRIGGER_EVENTS_DO_ORIGINAL).not.toContain("comment.received");
    expect(GATILHOS_SO_DA_CASCA).toEqual(["comment.received"]);
  });
});
