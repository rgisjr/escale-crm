// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contato = vi.hoisted(() => vi.fn());
vi.mock("@/lib/channels/zernio/ingest", () => ({ upsertSocialContact: contato }));

import { receberComentario } from "@/lib/escale/comentarios/receber";
import { ingestSocialInbound } from "@/lib/channels/social/ingest";

/** Fase 10B: a entrada do `comment.received` (só vira contato e evento se uma automação quer). */
const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";
const CANAL_DA_ENTRADA = { organizationId: ORG, channelSessionId: CANAL, contaId: "acc-1", plataforma: "instagram" };

const webhook = (extra: { autor?: Record<string, unknown>; comment?: Record<string, unknown>; account?: Record<string, unknown> } = {}) => ({
  event: "comment.received",
  id: "evt-z-1",
  account: { id: "acc-1", platform: "instagram", ...extra.account },
  comment: {
    id: "c-1",
    text: "quero o link",
    createdAt: "2026-11-01T10:00:00.000Z",
    isReply: false,
    platformPostId: "179",
    postId: "zp-1",
    author: { id: "u-1", username: "fulano", name: "Fulano", isOwnAccount: false, ...extra.autor },
    ...extra.comment,
  },
  post: { content: "Legenda" },
});

const regraDoCanal = (canal = CANAL) => ({
  trigger_config: {
    channel_session_id: canal,
    escopo: "todos",
    caminhos: [{ id: "qualquer", publicacoes: [], filtro: { modo: "qualquer" }, resposta: null }],
  },
});

function banco(regras: unknown[], emit: { error: { message: string } | null } = { error: null }) {
  const rpc = vi.fn(async () => emit);
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) q[m] = () => q;
  q.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data: regras, error: null }).then(ok);
  const db = { from: () => q, rpc } as unknown as SupabaseClient;
  return { db, rpc };
}

beforeEach(() => {
  contato.mockReset();
  contato.mockResolvedValue("33333333-3333-4333-8333-333333333333");
});

describe("receberComentario", () => {
  it.each([
    ["da própria conta", webhook({ autor: { isOwnAccount: true } }), "comentario_da_propria_conta"],
    ["de live", webhook({ comment: { isLive: true } }), "comentario_de_live"],
    ["de outra conta", webhook({ account: { id: "acc-2" } }), "comentario_de_outra_conta"],
    ["ilegível", { event: "comment.received" }, "comentario_ilegivel"],
  ])("comentário %s é ignorado sem criar contato", async (_nome, payload, motivo) => {
    const { db, rpc } = banco([regraDoCanal()]);
    expect(await receberComentario(db, CANAL_DA_ENTRADA, payload)).toEqual({ status: "ignored", reason: motivo });
    expect(contato).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sem regra que case → ignored e sem contato", async () => {
    const { db } = banco([regraDoCanal("99999999-9999-4999-8999-999999999999")]);
    expect(await receberComentario(db, CANAL_DA_ENTRADA, webhook())).toEqual({ status: "ignored", reason: "nenhum_caminho_casou" });
    expect(contato).not.toHaveBeenCalled();
  });

  it("com regra que casa → contato pela identidade do direct e emit_event", async () => {
    const { db, rpc } = banco([regraDoCanal()]);
    expect(await receberComentario(db, CANAL_DA_ENTRADA, webhook())).toEqual({ status: "ingested" });
    expect(contato).toHaveBeenCalledWith(db, ORG, "instagram:acc-1:u-1", "Fulano");
    const args = (rpc.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
    expect(args).toMatchObject({
      p_event_type: "comment.received",
      p_entity_kind: "contact",
      p_entity_id: "33333333-3333-4333-8333-333333333333",
      p_organization_id: ORG,
      p_metadata: { source: "zernio_comment", zernio_event_id: "evt-z-1" },
    });
    expect(args.p_payload).toMatchObject({
      contact_id: "33333333-3333-4333-8333-333333333333",
      channel_session_id: CANAL,
      conta_id: "acc-1",
      comentario: { id: "c-1", publicacao_id: "179", publicacao_zernio_id: "zp-1", autor: { id: "u-1" } },
    });
  });

  it("erro do emit_event lança (a rota responde 500 e o Zernio reentrega)", async () => {
    const { db } = banco([regraDoCanal()], { error: { message: "boom" } });
    await expect(receberComentario(db, CANAL_DA_ENTRADA, webhook())).rejects.toThrow(/comentario_emit_event_failed/);
  });
});

describe("ingestSocialInbound", () => {
  it("comment.received vai para receberComentario, não para o parser de mensagem", async () => {
    const { db, rpc } = banco([regraDoCanal()]);
    const sessao = { zernio_account_id: "acc-1", metadata: { social_platform: "instagram" } };
    const consulta: Record<string, unknown> = {};
    for (const m of ["select", "eq", "is"]) consulta[m] = () => consulta;
    consulta.maybeSingle = async () => ({ data: sessao, error: null });
    const regras: Record<string, unknown> = {};
    for (const m of ["select", "eq"]) regras[m] = () => regras;
    regras.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data: [regraDoCanal()], error: null }).then(ok);
    const completo = {
      from: (tabela: string) => (tabela === "channel_sessions" ? consulta : regras),
      rpc,
    } as unknown as SupabaseClient;
    const r = await ingestSocialInbound(completo, ORG, CANAL, webhook());
    expect(r).toEqual({ status: "ingested" });
    expect(rpc).toHaveBeenCalled();
    expect(db).toBeDefined();
  });
});
