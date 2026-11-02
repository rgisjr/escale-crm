// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contaDaCaixa = vi.hoisted(() => vi.fn());
const contasDaCaixa = vi.hoisted(() => vi.fn());
const credenciais = vi.hoisted(() => vi.fn());
const acoes = vi.hoisted(() => ({
  responderAMao: vi.fn(),
  mandarDirectAMao: vi.fn(),
  ocultarAMao: vi.fn(),
  apagarAMao: vi.fn(),
  curtirAMao: vi.fn(),
}));
const leitura = vi.hoisted(() => ({ publicacoesDaCaixa: vi.fn(), comentariosDaCaixa: vi.fn() }));
const apoio = vi.hoisted(() => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => apoio);
vi.mock("@/lib/channels/zernio/credentials", () => ({ zernioCredsForAccountId: credenciais }));
vi.mock("@/lib/escale/comentarios/contas-da-caixa", () => ({ contaDaCaixa, contasDaCaixa }));
vi.mock("@/lib/escale/comentarios/acoes-manuais", () => acoes);
vi.mock("@/lib/escale/comentarios/leitura-da-caixa", () => leitura);

import { GET as GET_CAIXA } from "@/app/api/v1/escale/comentarios/caixa/route";
import { GET as GET_COMENTARIOS } from "@/app/api/v1/escale/comentarios/caixa/[publicacaoId]/route";
import { GET as GET_CONTAS } from "@/app/api/v1/escale/comentarios/contas/route";
import { DELETE as DELETE_APAGAR } from "@/app/api/v1/escale/comentarios/[comentarioId]/route";
import { POST as POST_DIRECT } from "@/app/api/v1/escale/comentarios/[comentarioId]/direct/route";
import { DELETE as DELETE_REEXIBIR, POST as POST_OCULTAR } from "@/app/api/v1/escale/comentarios/[comentarioId]/ocultar/route";
import { DELETE as DELETE_DESCURTIR, POST as POST_CURTIR } from "@/app/api/v1/escale/comentarios/[comentarioId]/curtir/route";
import { POST as POST_RESPONDER } from "@/app/api/v1/escale/comentarios/[comentarioId]/responder/route";
import { respostaDoErroDoZernio } from "@/lib/escale/comentarios/rota-da-acao";
import { requireRole } from "@/lib/auth/require-role";
import { authOk } from "@/tests/helpers/stages-db-double";

/** Fase 10A: o prólogo único, o mapa de erros e as sete rotas da caixa de comentários. */
const CANAL = "e5ca1e00-9803-4000-8000-0000000000c1";
const CONTA = { id: CANAL, nome: "Conta", plataforma: "instagram", contaId: "zacc-1", conectada: true, podeApagar: true, status: "WORKING" };
const params = (comentarioId = "cm-1") => ({ params: Promise.resolve({ comentarioId }) });

const json = (url: string, metodo: string, corpo?: unknown) =>
  new NextRequest(new URL(url, "http://x"), {
    method: metodo,
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo), headers: { "content-type": "application/json" } }),
  });
const post = (sufixo: string, corpo: unknown) => json(`/api/v1/escale/comentarios/cm-1/${sufixo}`, "POST", corpo);
const ALVO = { canal: CANAL, publicacao: "post-1" };

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  authOk("agent");
  contaDaCaixa.mockReset().mockResolvedValue(CONTA);
  contasDaCaixa.mockReset();
  credenciais.mockReset().mockResolvedValue({ apiKey: "sk-segredo" });
  for (const f of Object.values({ ...acoes, ...leitura })) f.mockReset();
  apoio.requireSupportWrite.mockReset().mockResolvedValue(null);
});

describe("prólogo das rotas de ação", () => {
  it("sem requireSupportWrite ok → recusa antes de qualquer coisa", async () => {
    apoio.requireSupportWrite.mockResolvedValue(new Response("{}", { status: 403 }));
    const r = await POST_RESPONDER(post("responder", { ...ALVO, texto: "oi" }), params());
    expect(r.status).toBe(403);
    expect(contaDaCaixa).not.toHaveBeenCalled();
  });

  it("leitor → 403 do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response("{}", { status: 403 }) as never });
    expect((await POST_RESPONDER(post("responder", { ...ALVO, texto: "oi" }), params())).status).toBe(403);
  });

  it("alvo inválido → 422", async () => {
    expect((await POST_RESPONDER(post("responder", { canal: "nao-uuid", publicacao: "p", texto: "oi" }), params())).status).toBe(422);
    expect((await POST_RESPONDER(post("responder", { canal: CANAL, texto: "oi" }), params())).status).toBe(422);
  });

  it("canal de outra org, WhatsApp ou que a pessoa não atende → 404 igual", async () => {
    contaDaCaixa.mockResolvedValue(null);
    const r = await POST_RESPONDER(post("responder", { ...ALVO, texto: "oi" }), params());
    expect(r.status).toBe(404);
    expect((await r.json()).error.message).toBe("Conta não encontrada.");
  });

  it("apagar com agente → 403 com o texto; gerente passa", async () => {
    const req = () => json(`/api/v1/escale/comentarios/cm-1?canal=${CANAL}&publicacao=post-1`, "DELETE");
    const r = await DELETE_APAGAR(req(), params());
    expect(r.status).toBe(403);
    expect((await r.json()).error.message).toBe("Só gerente e administrador podem apagar comentários.");
    expect(acoes.apagarAMao).not.toHaveBeenCalled();

    authOk("manager");
    acoes.apagarAMao.mockResolvedValue({ ok: true, dados: { apagado: true } });
    const ok = await DELETE_APAGAR(req(), params());
    expect(ok.status).toBe(200);
    expect((await ok.json()).data).toEqual({ apagado: true });
  });

  it("conta desconectada ou sem credencial → 409", async () => {
    contaDaCaixa.mockResolvedValue({ ...CONTA, conectada: false });
    expect((await POST_RESPONDER(post("responder", { ...ALVO, texto: "oi" }), params())).status).toBe(409);
    contaDaCaixa.mockResolvedValue(CONTA);
    credenciais.mockResolvedValue(null);
    expect((await POST_RESPONDER(post("responder", { ...ALVO, texto: "oi" }), params())).status).toBe(409);
  });

  it("ok: o contexto leva a chave, os ids e a conta sem o status", async () => {
    acoes.responderAMao.mockResolvedValue({ ok: true, dados: { commentId: "novo" } });
    await POST_RESPONDER(post("responder", { ...ALVO, texto: "  oi  " }), params("cm-7"));
    const [ctx, texto] = acoes.responderAMao.mock.calls[0] as [Record<string, unknown>, string];
    expect(texto).toBe("oi");
    expect(ctx).toMatchObject({ chave: "sk-segredo", comentarioId: "cm-7", publicacaoId: "post-1" });
    expect(ctx.conta).not.toHaveProperty("status");
  });
});

describe("respostaDoErroDoZernio", () => {
  const corpo = async (status: number, c: unknown) => {
    const r = respostaDoErroDoZernio(status, c, "req-1");
    return { status: r.status, corpo: await r.json() };
  };
  it("mapa de códigos, sem vazar o corpo do Zernio", async () => {
    const segredo = { error: "token sk-segredo-abc expirado", details: { privateReplyConsumed: false } };
    expect(await corpo(401, segredo)).toMatchObject({ status: 409, corpo: { error: { code: "acesso_recusado" } } });
    expect(await corpo(403, segredo)).toMatchObject({ status: 409 });
    expect(await corpo(404, segredo)).toMatchObject({ status: 404, corpo: { error: { code: "comentario_nao_encontrado", message: "O comentário não existe mais." } } });
    expect(await corpo(400, { details: { privateReplyConsumed: true } })).toMatchObject({ status: 409, corpo: { error: { code: "resposta_privada_ja_usada" } } });
    const r500 = await corpo(500, segredo);
    expect(r500).toMatchObject({ status: 502, corpo: { error: { code: "provedor_indisponivel" } } });
    expect(JSON.stringify(r500)).not.toContain("sk-segredo");
    expect(await corpo(0, null)).toMatchObject({ status: 502 });
  });
});

describe("rotas de leitura", () => {
  it("contas não devolve o id do Zernio", async () => {
    contasDaCaixa.mockResolvedValue([{ id: CANAL, nome: "Conta", plataforma: "instagram", contaId: "zacc-1", conectada: true, podeApagar: false }]);
    const r = await GET_CONTAS();
    const dados = (await r.json()).data;
    expect(dados.contas).toEqual([{ id: CANAL, nome: "Conta", plataforma: "instagram", conectada: true, podeApagar: false }]);
    expect(JSON.stringify(dados)).not.toContain("zacc-1");
  });

  it("caixa repassa período, ordem e cursor e devolve { publicacoes, proximo }", async () => {
    leitura.publicacoesDaCaixa.mockResolvedValue({ ok: true, dados: { itens: [{ id: "p1" }], proximo: "c2" } });
    const r = await GET_CAIXA(json(`/api/v1/escale/comentarios/caixa?canal=${CANAL}&periodo=7d&ordem=mais_comentarios&cursor=c1`, "GET"));
    expect((await r.json()).data).toEqual({ publicacoes: [{ id: "p1" }], proximo: "c2" });
    expect(leitura.publicacoesDaCaixa.mock.calls[0]?.[1]).toMatchObject({ periodo: "7d", ordem: "mais_comentarios", cursor: "c1", chave: "sk-segredo" });
  });

  it("caixa com período inválido cai no padrão; sem canal → 404; erro do Zernio traduzido", async () => {
    leitura.publicacoesDaCaixa.mockResolvedValue({ ok: false, status: 403, corpo: {} });
    const r = await GET_CAIXA(json(`/api/v1/escale/comentarios/caixa?canal=${CANAL}&periodo=xx`, "GET"));
    expect(r.status).toBe(409);
    expect(leitura.publicacoesDaCaixa.mock.calls[0]?.[1]).toMatchObject({ periodo: "30d", ordem: "recentes", cursor: null });
    expect((await GET_CAIXA(json("/api/v1/escale/comentarios/caixa", "GET"))).status).toBe(404);
  });

  it("comentários da publicação devolvem { comentarios, proximo }", async () => {
    leitura.comentariosDaCaixa.mockResolvedValue({ ok: true, dados: { itens: [{ id: "c1" }], proximo: null } });
    const r = await GET_COMENTARIOS(json(`/api/v1/escale/comentarios/caixa/post-1?canal=${CANAL}`, "GET"), { params: Promise.resolve({ publicacaoId: "post-1" }) });
    expect((await r.json()).data).toEqual({ comentarios: [{ id: "c1" }], proximo: null });
    expect(leitura.comentariosDaCaixa.mock.calls[0]?.[1]).toMatchObject({ publicacaoId: "post-1", organizationId: expect.any(String) });
  });

  it("erro inesperado → 500 com requestId e sem o texto do erro", async () => {
    leitura.comentariosDaCaixa.mockRejectedValue(new Error("senha=123"));
    const r = await GET_COMENTARIOS(json(`/api/v1/escale/comentarios/caixa/post-1?canal=${CANAL}`, "GET"), { params: Promise.resolve({ publicacaoId: "post-1" }) });
    expect(r.status).toBe(500);
    const corpo = await r.json();
    expect(corpo.error.message).toBe("Erro inesperado.");
    expect(JSON.stringify(corpo)).not.toContain("senha");
  });
});

describe("rotas de ação", () => {
  it("responder: texto vazio ou de 1.001 caracteres → 422", async () => {
    expect((await POST_RESPONDER(post("responder", { ...ALVO, texto: "   " }), params())).status).toBe(422);
    expect((await POST_RESPONDER(post("responder", { ...ALVO, texto: "a".repeat(1001) }), params())).status).toBe(422);
    expect(acoes.responderAMao).not.toHaveBeenCalled();
  });

  it("direct: jaUsado → 409 resposta_privada_ja_usada; prazo → 409 prazo_vencido; sucesso → conversationId", async () => {
    const corpoDireto = { ...ALVO, texto: "Oi", comentadoEm: "2026-11-02T10:00:00Z", autor: { id: "u1", usuario: "ana", nome: "Ana" } };
    acoes.mandarDirectAMao.mockResolvedValueOnce({ ok: false, jaUsado: true });
    const a = await POST_DIRECT(post("direct", corpoDireto), params());
    expect(a.status).toBe(409);
    expect((await a.json()).error.code).toBe("resposta_privada_ja_usada");

    acoes.mandarDirectAMao.mockResolvedValueOnce({ ok: false, status: 409, corpo: { motivo: "prazo_vencido" } });
    expect((await (await POST_DIRECT(post("direct", corpoDireto), params())).json()).error.code).toBe("prazo_vencido");

    acoes.mandarDirectAMao.mockResolvedValueOnce({ ok: true, dados: { conversationId: "conv-1" } });
    expect((await (await POST_DIRECT(post("direct", corpoDireto), params())).json()).data).toEqual({ conversationId: "conv-1" });
    expect((await POST_DIRECT(post("direct", { ...ALVO, texto: "Oi" }), params())).status).toBe(422);
  });

  it("ocultar POST e DELETE devolvem { oculto }", async () => {
    acoes.ocultarAMao.mockResolvedValueOnce({ ok: true, dados: { oculto: true } });
    expect((await (await POST_OCULTAR(post("ocultar", { ...ALVO, autor: "u1" }), params())).json()).data).toEqual({ oculto: true });
    expect(acoes.ocultarAMao.mock.calls[0]?.slice(1)).toEqual([true, "u1"]);

    acoes.ocultarAMao.mockResolvedValueOnce({ ok: true, dados: { oculto: false } });
    const r = await DELETE_REEXIBIR(json(`/api/v1/escale/comentarios/cm-1/ocultar?canal=${CANAL}&publicacao=post-1&autor=u1`, "DELETE"), params());
    expect((await r.json()).data).toEqual({ oculto: false });
    expect(acoes.ocultarAMao.mock.calls[1]?.slice(1)).toEqual([false, "u1"]);
  });

  it("erro inesperado numa ação → 500 com requestId", async () => {
    acoes.responderAMao.mockRejectedValue(new Error("boom"));
    const r = await POST_RESPONDER(post("responder", { ...ALVO, texto: "oi" }), params());
    expect(r.status).toBe(500);
    expect(r.headers.get("X-Request-Id")).toBeTruthy();
  });
});

describe("curtir à mão (10D, D15)", () => {
  const FACEBOOK = { ...CONTA, plataforma: "facebook" };

  it("sem requireSupportWrite → recusa", async () => {
    apoio.requireSupportWrite.mockResolvedValueOnce(new Response(null, { status: 403 }));
    expect((await POST_CURTIR(post("curtir", { ...ALVO }), params())).status).toBe(403);
    expect(acoes.curtirAMao).not.toHaveBeenCalled();
  });

  it("conta do Instagram → 422 com o texto", async () => {
    const r = await POST_CURTIR(post("curtir", { ...ALVO }), params());
    expect(r.status).toBe(422);
    expect((await r.json()).error.message).toBe("Curtir comentário só está disponível no Facebook.");
    expect(acoes.curtirAMao).not.toHaveBeenCalled();
  });

  it("Facebook: curte (POST) e descurte (DELETE) e devolve { curtido }", async () => {
    contaDaCaixa.mockResolvedValue(FACEBOOK);
    acoes.curtirAMao.mockResolvedValueOnce({ ok: true, dados: { curtido: true } });
    expect((await (await POST_CURTIR(post("curtir", { ...ALVO, autor: "u1" }), params())).json()).data).toEqual({ curtido: true });
    expect(acoes.curtirAMao.mock.calls[0]?.slice(1)).toEqual([true, "u1"]);

    acoes.curtirAMao.mockResolvedValueOnce({ ok: true, dados: { curtido: false } });
    const r = await DELETE_DESCURTIR(json(`/api/v1/escale/comentarios/cm-1/curtir?canal=${CANAL}&publicacao=post-1&autor=u1`, "DELETE"), params());
    expect((await r.json()).data).toEqual({ curtido: false });
    expect(acoes.curtirAMao.mock.calls[1]?.slice(1)).toEqual([false, "u1"]);
  });

  it("erro do Zernio → 502", async () => {
    contaDaCaixa.mockResolvedValue(FACEBOOK);
    acoes.curtirAMao.mockResolvedValueOnce({ ok: false, status: 500, corpo: {} });
    expect((await POST_CURTIR(post("curtir", { ...ALVO }), params())).status).toBe(502);
  });
});
