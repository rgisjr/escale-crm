// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextoDaAcao } from "@/lib/escale/comentarios/rota-da-acao";

import { bancoFalso, type Chamada, type Resposta } from "./helpers/banco-falso";

const auditar = vi.fn();
const upsertSocialContact = vi.fn();
vi.mock("@/lib/audit", () => ({ audit: (e: unknown) => auditar(e) }));
vi.mock("@/lib/channels/zernio/ingest", () => ({ upsertSocialContact: (...a: unknown[]) => upsertSocialContact(...a) }));

const { apagarAMao, concluirAcao, mandarDirectAMao, ocultarAMao, reservarAcao, responderAMao } = await import(
  "@/lib/escale/comentarios/acoes-manuais"
);

/** Fase 10A: as ações à mão da caixa (resposta, direct, ocultar, apagar). */
const AGORA = new Date("2026-11-02T12:00:00.000Z");
const RECENTE = "2026-11-02T10:00:00.000Z";
const AUTOR = { id: "u1", usuario: "ana", nome: "Ana" };

type Eventos = string[];
function montar(opcoes: {
  disparoEnviado?: boolean;
  acaoInsert?: Resposta;
  zernio?: { status: number; corpo: unknown };
} = {}) {
  const eventos: Eventos = [];
  const { admin, chamadas, rpcs } = bancoFalso((c: Chamada) => {
    if (c.tabela === "escale_disparos_de_comentario") return { data: opcoes.disparoEnviado ? [{ id: "d-1" }] : [], error: null };
    if (c.tabela === "escale_acoes_no_comentario" && c.operacao === "insert") {
      eventos.push("reserva");
      return opcoes.acaoInsert ?? { data: [{ id: "a-1" }], error: null };
    }
    if (c.tabela === "escale_acoes_no_comentario" && c.operacao === "update") {
      if (c.valores?.status === "feito" || (c.valores?.status === "falhou" && c.valores?.motivo !== "interrompido")) {
        eventos.push(`conclusao:${String(c.valores.status)}`);
      }
      return { data: null, error: null };
    }
    if (c.tabela === "messages" && c.operacao === "insert") {
      eventos.push("mensagem");
      return { data: [{ id: "m-1" }], error: null };
    }
    return undefined;
  });
  const zernio = opcoes.zernio ?? { status: 200, corpo: { messageId: "zm-9", data: { commentId: "novo-1" } } };
  const fetchMock = vi.fn(async () => {
    eventos.push("zernio");
    return new Response(JSON.stringify(zernio.corpo), { status: zernio.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  const ctx: ContextoDaAcao = {
    requestId: "req-1",
    userId: "user-1",
    organizationId: "org-1",
    papel: "agent",
    admin,
    conta: { id: "canal-1", nome: "Conta", plataforma: "instagram", contaId: "zacc-1", conectada: true, podeApagar: false },
    chave: "sk-segredo",
    comentarioId: "cm-1",
    publicacaoId: "post-1",
    corpo: {},
  };
  return { ctx, chamadas, eventos, fetchMock, rpcs };
}
const chamadaDoZernio = (m: ReturnType<typeof vi.fn>) => {
  const [url, init] = m.mock.calls[0] as unknown as [string, RequestInit];
  return { url, init, corpo: init.body ? JSON.parse(init.body as string) : undefined };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AGORA);
  upsertSocialContact.mockReset().mockImplementation(async () => {
    return "contato-1";
  });
  auditar.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("mandarDirectAMao", () => {
  it("ordem: reserva → contato → mensagem → Zernio → conclusão", async () => {
    const { ctx, eventos } = montar();
    upsertSocialContact.mockImplementation(async () => {
      eventos.push("contato");
      return "contato-1";
    });
    const r = await mandarDirectAMao(ctx, { texto: "Oi!", autor: AUTOR, comentadoEm: RECENTE });
    expect(r).toEqual({ ok: true, dados: { conversationId: "conv-1" } });
    expect(eventos).toEqual(["reserva", "contato", "mensagem", "zernio", "conclusao:feito"]);
  });

  it("sucesso: mensagem como envio de pessoa, ação feito com contato e mensagem, audit sem texto", async () => {
    const { ctx, chamadas, fetchMock } = montar();
    await mandarDirectAMao(ctx, { texto: "Oi!", autor: AUTOR, comentadoEm: RECENTE });
    expect(upsertSocialContact).toHaveBeenCalledWith(ctx.admin, "org-1", "instagram:zacc-1:u1", "Ana");
    const mensagem = chamadas.find((c) => c.tabela === "messages" && c.operacao === "insert");
    expect(mensagem?.valores).toMatchObject({
      sent_via: "user",
      sent_by_user_id: "user-1",
      status: "sending",
      metadata: { origem: "comentario_manual", comentario_id: "cm-1", acao_id: "a-1" },
    });
    const { url, corpo } = chamadaDoZernio(fetchMock);
    expect(url).toMatch(/\/inbox\/comments\/post-1\/cm-1\/private-reply$/);
    expect(corpo).toEqual({ accountId: "zacc-1", message: "Oi!" });
    const feito = chamadas.find((c) => c.tabela === "escale_acoes_no_comentario" && c.valores?.status === "feito");
    expect(feito?.valores).toMatchObject({ resultado_id: "zm-9", contact_id: "contato-1", message_id: "m-1" });
    const confirmada = chamadas.find((c) => c.tabela === "messages" && c.operacao === "update");
    expect(confirmada?.valores).toMatchObject({ status: "sent", external_id: "social:zacc-1:zm-9" });
    expect(auditar).toHaveBeenCalledWith(
      expect.objectContaining({ action: "comment.private_replied", metadata: { comentario_id: "cm-1", publicacao_id: "post-1" } }),
    );
  });

  it("prazo vencido: não toca no banco nem no Zernio", async () => {
    const { ctx, chamadas, fetchMock } = montar();
    const r = await mandarDirectAMao(ctx, { texto: "Oi", autor: AUTOR, comentadoEm: "2026-10-20T10:00:00.000Z" });
    expect(r).toEqual({ ok: false, status: 409, corpo: { motivo: "prazo_vencido" } });
    expect(chamadas).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("direct da automação já enviado → jaUsado, sem reservar", async () => {
    const { ctx, chamadas, fetchMock } = montar({ disparoEnviado: true });
    expect(await mandarDirectAMao(ctx, { texto: "Oi", autor: AUTOR, comentadoEm: RECENTE })).toEqual({ ok: false, jaUsado: true });
    expect(chamadas.some((c) => c.tabela === "escale_acoes_no_comentario" && c.operacao === "insert")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("23505 na reserva → jaUsado, sem Zernio", async () => {
    const { ctx, fetchMock } = montar({ acaoInsert: { data: null, error: { code: "23505", message: "duplicate" } } });
    expect(await mandarDirectAMao(ctx, { texto: "Oi", autor: AUTOR, comentadoEm: RECENTE })).toEqual({ ok: false, jaUsado: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("privateReplyConsumed: ação falhou com resposta_privada_ja_usada e mensagem failed", async () => {
    const { ctx, chamadas } = montar({ zernio: { status: 400, corpo: { details: { privateReplyConsumed: true } } } });
    const r = await mandarDirectAMao(ctx, { texto: "Oi", autor: AUTOR, comentadoEm: RECENTE });
    expect(r).toMatchObject({ ok: false, status: 400 });
    const falhas = chamadas.filter((c) => c.tabela === "escale_acoes_no_comentario" && c.valores?.status === "falhou");
    expect(falhas.map((c) => c.valores?.motivo)).toEqual(["interrompido", "resposta_privada_ja_usada"]);
    expect(chamadas.find((c) => c.tabela === "messages" && c.operacao === "update")?.valores).toMatchObject({ status: "failed" });
    expect(auditar).not.toHaveBeenCalled();
  });

  it("contato não resolvido: o direct sai sem mensagem na conversa e a ação fica sem contato", async () => {
    const { ctx, chamadas, fetchMock } = montar();
    upsertSocialContact.mockRejectedValue(new Error("boom"));
    const r = await mandarDirectAMao(ctx, { texto: "Oi", autor: AUTOR, comentadoEm: RECENTE });
    expect(r).toEqual({ ok: true, dados: { conversationId: null } });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(chamadas.some((c) => c.tabela === "messages")).toBe(false);
  });
});

describe("reservarAcao", () => {
  it("direct: o enviando com mais de 2 min vira interrompido ANTES de reservar", async () => {
    const { ctx, chamadas } = montar();
    await reservarAcao(ctx.admin, { ctx, acao: "direct", autorId: "u1", texto: "Oi" });
    const acoes = chamadas.filter((c) => c.tabela === "escale_acoes_no_comentario");
    expect(acoes.map((c) => c.operacao)).toEqual(["update", "insert"]);
    expect(acoes[0]?.valores).toMatchObject({ status: "falhou", motivo: "interrompido" });
    expect(acoes[0]?.filtros).toContainEqual(["lt", "created_at", new Date(AGORA.getTime() - 2 * 60 * 1000).toISOString()]);
    expect(acoes[1]?.valores).toMatchObject({ organization_id: "org-1", channel_session_id: "canal-1", acao: "direct", status: "enviando", user_id: "user-1" });
  });

  it("outras ações não limpam nada", async () => {
    const { ctx, chamadas } = montar();
    await reservarAcao(ctx.admin, { ctx, acao: "resposta", autorId: null, texto: "x" });
    expect(chamadas.filter((c) => c.operacao === "update")).toHaveLength(0);
  });
});

describe("concluirAcao", () => {
  it("nunca lança: o erro do banco só é logado", async () => {
    const { ctx } = montar();
    const { admin } = bancoFalso(() => ({ data: null, error: { message: "boom" } }));
    await expect(concluirAcao(admin, { organizationId: ctx.organizationId, id: "a-1", status: "feito" })).resolves.toBeUndefined();
  });
});

describe("responderAMao, ocultarAMao e apagarAMao", () => {
  it("resposta pública manda a Idempotency-Key = id da ação e grava feito com o id do comentário novo", async () => {
    const { ctx, chamadas, fetchMock } = montar();
    const r = await responderAMao(ctx, "Obrigada!");
    expect(r).toEqual({ ok: true, dados: { commentId: "novo-1" } });
    const { url, init, corpo } = chamadaDoZernio(fetchMock);
    expect(url).toMatch(/\/inbox\/comments\/post-1$/);
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("a-1");
    expect(corpo).toEqual({ accountId: "zacc-1", message: "Obrigada!", commentId: "cm-1" });
    expect(chamadas.find((c) => c.valores?.status === "feito")?.valores).toMatchObject({ resultado_id: "novo-1" });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ action: "comment.replied" }));
  });

  it("ocultar e reexibir usam os verbos certos e auditam", async () => {
    const a = montar();
    expect(await ocultarAMao(a.ctx, true, "u1")).toEqual({ ok: true, dados: { oculto: true } });
    expect(chamadaDoZernio(a.fetchMock).init.method).toBe("POST");
    expect(auditar).toHaveBeenLastCalledWith(expect.objectContaining({ action: "comment.hidden" }));
    const b = montar();
    expect(await ocultarAMao(b.ctx, false, "u1")).toEqual({ ok: true, dados: { oculto: false } });
    expect(chamadaDoZernio(b.fetchMock).init.method).toBe("DELETE");
    expect(auditar).toHaveBeenLastCalledWith(expect.objectContaining({ action: "comment.unhidden" }));
  });

  it("apagar chama o DELETE e audita; falha do Zernio grava falhou e não audita", async () => {
    const ok = montar();
    expect(await apagarAMao(ok.ctx, "u1")).toEqual({ ok: true, dados: { apagado: true } });
    expect(auditar).toHaveBeenLastCalledWith(expect.objectContaining({ action: "comment.deleted" }));
    auditar.mockClear();
    const ruim = montar({ zernio: { status: 500, corpo: {} } });
    expect(await apagarAMao(ruim.ctx, "u1")).toMatchObject({ ok: false, status: 500 });
    expect(ruim.chamadas.find((c) => c.valores?.status === "falhou")).toBeDefined();
    expect(auditar).not.toHaveBeenCalled();
  });
});
