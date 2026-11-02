import { describe, expect, it } from "vitest";

import { caminhoDoComentario, dentroDaJanela, problemasDoGatilho } from "@/lib/escale/comentarios/caminhos";
import {
  configDoComentarioSchema,
  exigirAnexoSoNoDirect,
  exigirConfigDoDirect,
  exigirGatilhoDoPassoDoInstagram,
  configDoPassoDoInstagramSchema,
} from "@/lib/escale/comentarios/schema";
import { z } from "zod";

const SESSAO = "e5ca1e00-9804-4000-8000-0000000000aa";
const caminho = { id: "c1", publicacoes: [], filtro: { modo: "qualquer" as const }, resposta: null };
const base = { channel_session_id: SESSAO, escopo: "todos" as const, caminhos: [caminho] };
const evento = (pub: string, texto = "oi") => ({ channel_session_id: SESSAO, comentario: { publicacao_id: pub, texto } });

describe("config da 10B continua válida", () => {
  it("sai com os padrões", () => {
    const lida = configDoComentarioSchema.parse(base);
    expect(lida.publico).toBeNull();
    expect(lida.repeticao).toEqual({ modo: "uma_vez" });
    expect(lida.proxima).toBeNull();
    expect(lida.caminhos[0]).toMatchObject({ ocultar_depois: false, curtir: false });
    expect(problemasDoGatilho(lida)).toEqual([]);
  });
});

describe("próxima publicação (D11)", () => {
  const proxima = (resolvida: unknown) => ({
    ...base,
    escopo: "proxima" as const,
    proxima: { armada_em: "2026-11-02T10:00:00Z", conhecidas: ["p0"], resolvida },
  });
  const resolvida = { id: "p9", legenda: null, miniatura: null, tipo: null, publicada_em: null };

  it("passa com um caminho e proxima", () => {
    expect(problemasDoGatilho(configDoComentarioSchema.parse(proxima(null)))).toEqual([]);
  });
  it("recusa sem proxima ou com publicação no caminho", () => {
    expect(problemasDoGatilho(configDoComentarioSchema.parse({ ...base, escopo: "proxima" }))).toContain(
      "Revise a configuração do gatilho.",
    );
  });
  it("não resolvida não dispara; resolvida só dispara na publicação dela", () => {
    expect(caminhoDoComentario(proxima(null), evento("p9"))).toBeNull();
    expect(caminhoDoComentario(proxima(resolvida), evento("p9"))).not.toBeNull();
    expect(caminhoDoComentario(proxima(resolvida), evento("p1"))).toBeNull();
  });
});

describe("filtro no gatilho", () => {
  it("só 'não contém' é recusado (item 14)", () => {
    const cfg = configDoComentarioSchema.parse({
      ...base,
      caminhos: [{ ...caminho, filtro: { modo: "palavras", condicoes: [{ operador: "nao_contem", valor: "x" }], combinar: "qualquer" } }],
    });
    expect(problemasDoGatilho(cfg)).toContain('Adicione ao menos uma condição que não seja "Não contém".');
  });
  it("'não contém' impede o disparo", () => {
    const cfg = {
      ...base,
      caminhos: [
        {
          ...caminho,
          filtro: {
            modo: "palavras",
            condicoes: [
              { operador: "contem", valor: "quero" },
              { operador: "nao_contem", valor: "gratis" },
            ],
            combinar: "qualquer",
          },
        },
      ],
    };
    expect(caminhoDoComentario(cfg, evento("p", "eu quero"))).not.toBeNull();
    expect(caminhoDoComentario(cfg, evento("p", "quero grátis"))).toBeNull();
  });
});

describe("refinamentos de regra", () => {
  const roda = (fn: (r: never, ctx: z.RefinementCtx) => void, regra: unknown) => {
    const r = z.object({}).passthrough().superRefine((v, ctx) => fn(v as never, ctx)).safeParse(regra);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it("config do direct: conta vazia e só 'não contém'", () => {
    const e = "instagram.message_received";
    expect(roda(exigirConfigDoDirect, { trigger_event: e, trigger_config: { channel_session_id: "", filtro: { modo: "qualquer" } } })).toEqual([
      "Selecione um dispositivo Instagram.",
    ]);
    expect(
      roda(exigirConfigDoDirect, {
        trigger_event: e,
        trigger_config: { channel_session_id: "s", filtro: { modo: "palavras", condicoes: [{ operador: "nao_contem", valor: "x" }], combinar: "qualquer" } },
      }),
    ).toEqual(['Preencha a palavra do filtro ou use "Qualquer mensagem".']);
    expect(roda(exigirConfigDoDirect, { trigger_event: e, trigger_config: { channel_session_id: "s", filtro: { modo: "qualquer" } } })).toEqual([]);
  });

  it("passo Instagram aceita os 3 de direct e recusa outros", () => {
    const acoes = [{ type: "send_instagram_message" }];
    for (const e of ["instagram.message_received", "instagram.story_mention", "instagram.story_reply", "comment.received"]) {
      expect(roda(exigirGatilhoDoPassoDoInstagram, { trigger_event: e, actions: acoes })).toEqual([]);
    }
    expect(roda(exigirGatilhoDoPassoDoInstagram, { trigger_event: "contact.created", actions: acoes })).toHaveLength(1);
  });

  it("anexo no comentário é recusado; no direct passa; http:// é recusado", () => {
    const acao = (anexo: unknown) => [{ type: "send_instagram_message", config: { texto: "a", botoes: [], anexo } }];
    const ok = { tipo: "image", url: "https://x.com/a.png", nome: null };
    expect(roda(exigirAnexoSoNoDirect, { trigger_event: "comment.received", actions: acao(ok) })).toHaveLength(1);
    expect(roda(exigirAnexoSoNoDirect, { trigger_event: "instagram.story_reply", actions: acao(ok) })).toEqual([]);
    expect(configDoPassoDoInstagramSchema.safeParse({ texto: "a", botoes: [], anexo: { ...ok, url: "http://x.com/a.png" } }).success).toBe(false);
    expect(configDoPassoDoInstagramSchema.parse({ texto: "a", botoes: [] }).anexo).toBeNull();
  });
});

describe("dentroDaJanela", () => {
  const agora = new Date("2026-11-02T12:00:00Z");
  it("24 h", () => {
    expect(dentroDaJanela("2026-11-02T00:00:00Z", agora)).toBe(true);
    expect(dentroDaJanela("2026-11-01T11:00:00Z", agora)).toBe(false);
    expect(dentroDaJanela("lixo", agora)).toBe(false);
  });
});
