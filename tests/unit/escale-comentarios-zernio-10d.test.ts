// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  curtirComentario,
  descurtirComentario,
  enviarDirect,
  motivoDoErro,
  respostaPrivada,
} from "@/lib/escale/comentarios/zernio";

/** Fase 10D: direct comum, botão postback, curtir e a janela de 24 h (fetch dublado). */
const CHAVE = "sk-segredo-123";

function fetchQue(...respostas: Array<{ status: number; corpo: unknown }>) {
  const fila = [...respostas];
  const m = vi.fn(async () => {
    const r = fila.shift() ?? { status: 200, corpo: {} };
    return new Response(JSON.stringify(r.corpo), { status: r.status });
  });
  vi.stubGlobal("fetch", m);
  return m;
}
const chamada = (m: ReturnType<typeof fetchQue>, i: number) => {
  const [url, init] = m.mock.calls[i] as unknown as [string, RequestInit];
  return { url, init, corpo: init.body ? JSON.parse(init.body as string) : undefined };
};

afterEach(() => vi.unstubAllGlobals());

describe("enviarDirect", () => {
  const base = { conversaZernioId: "conv/1", accountId: "acc-1", texto: "Oi!" };

  it("texto com botões numa chamada só", async () => {
    const m = fetchQue({ status: 200, corpo: { messageId: "m-1" } });
    const r = await enviarDirect(CHAVE, { ...base, botoes: [{ tipo: "url", titulo: "Ver", url: "https://a.com" }] });
    expect(r).toEqual({ ok: true, dados: { messageId: "m-1", anexoFalhou: false } });
    expect(m).toHaveBeenCalledTimes(1);
    const { url, corpo } = chamada(m, 0);
    expect(url).toMatch(/\/v1\/inbox\/conversations\/conv%2F1\/messages$/);
    expect(corpo).toEqual({ accountId: "acc-1", message: "Oi!", buttons: [{ type: "url", title: "Ver", url: "https://a.com" }] });
  });

  it("com anexo faz duas chamadas, o texto primeiro", async () => {
    const m = fetchQue({ status: 200, corpo: { messageId: "m-1" } }, { status: 200, corpo: {} });
    const r = await enviarDirect(CHAVE, { ...base, botoes: [], anexo: { tipo: "image", url: "https://a.com/x.png" } });
    expect(r).toEqual({ ok: true, dados: { messageId: "m-1", anexoFalhou: false } });
    expect(chamada(m, 0).corpo).toEqual({ accountId: "acc-1", message: "Oi!" });
    expect(chamada(m, 1).corpo).toEqual({ accountId: "acc-1", attachmentUrl: "https://a.com/x.png", attachmentType: "image" });
  });

  it("falha do anexo devolve ok com anexoFalhou", async () => {
    fetchQue({ status: 200, corpo: { messageId: "m-1" } }, { status: 500, corpo: {} });
    const r = await enviarDirect(CHAVE, { ...base, botoes: [], anexo: { tipo: "file", url: "https://a.com/x.pdf" } });
    expect(r).toEqual({ ok: true, dados: { messageId: "m-1", anexoFalhou: true } });
  });

  it("falha do texto não tenta o anexo", async () => {
    const m = fetchQue({ status: 400, corpo: { error: "x" } });
    const r = await enviarDirect(CHAVE, { ...base, botoes: [], anexo: { tipo: "file", url: "https://a.com/x.pdf" } });
    expect(r.ok).toBe(false);
    expect(m).toHaveBeenCalledTimes(1);
  });
});

describe("respostaPrivada com postback", () => {
  it("manda o botão postback com o payload", async () => {
    const m = fetchQue({ status: 200, corpo: { messageId: "m-1" } });
    await respostaPrivada(CHAVE, {
      postId: "p",
      commentId: "c",
      accountId: "a",
      texto: "Siga",
      botoes: [{ tipo: "postback", titulo: "Já estou seguindo", payload: "escale:liberar:x" }],
    });
    expect(chamada(m, 0).corpo.buttons).toEqual([{ type: "postback", title: "Já estou seguindo", payload: "escale:liberar:x" }]);
  });
});

describe("curtir", () => {
  const alvo = { postId: "p 1", commentId: "c/1", accountId: "acc" };
  it("POST …/like e DELETE …/like?accountId=", async () => {
    const m = fetchQue({ status: 200, corpo: {} }, { status: 200, corpo: {} });
    await curtirComentario(CHAVE, alvo);
    await descurtirComentario(CHAVE, alvo);
    expect(chamada(m, 0).url).toMatch(/\/inbox\/comments\/p%201\/c%2F1\/like$/);
    expect(chamada(m, 0).init.method).toBe("POST");
    expect(chamada(m, 1).url).toMatch(/\/like\?accountId=acc$/);
    expect(chamada(m, 1).init.method).toBe("DELETE");
  });
});

describe("motivoDoErro: janela fechada", () => {
  it("código 10 / subcódigo 2018278 e o texto da Meta", () => {
    expect(motivoDoErro(400, { details: { code: 10, subcode: 2018278 } })).toBe("janela_fechada");
    expect(motivoDoErro(400, { error: "This message is sent outside of allowed window" })).toBe("janela_fechada");
    expect(motivoDoErro(500, {})).toBe("provedor_indisponivel");
  });
});
