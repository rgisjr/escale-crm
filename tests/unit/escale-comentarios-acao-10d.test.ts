// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const privada = vi.hoisted(() => vi.fn());
const enviar = vi.hoisted(() => vi.fn());
const disparoDa = vi.hoisted(() => vi.fn());
const gravar = vi.hoisted(() => vi.fn());
const confirmar = vi.hoisted(() => vi.fn());
const falhar = vi.hoisted(() => vi.fn());
const credenciais = vi.hoisted(() => vi.fn());
const regraGravada = vi.hoisted(() => ({ config: null as unknown }));

vi.mock("@/lib/escale/comentarios/zernio", async (original) => ({
  ...((await original()) as object),
  respostaPrivada: privada,
  enviarDirect: enviar,
}));
vi.mock("@/lib/escale/comentarios/disparos", () => ({ disparoDaRegra: disparoDa }));
vi.mock("@/lib/escale/comentarios/conversa", () => ({
  gravarDirectNaConversa: gravar,
  confirmarDirect: confirmar,
  falharDirect: falhar,
}));
vi.mock("@/lib/channels/zernio/credentials", () => ({ zernioCredsForAccountId: credenciais }));
vi.mock("@/lib/automation/fontes-da-automacao", () => ({ fontesDaAutomacao: vi.fn(async () => null) }));

import { getAction } from "@/lib/automation/actions";
import type { ActionCtx } from "@/lib/automation/types";
import "@/lib/escale/comentarios/acao-do-instagram";

/** Fase 10D: o passo Instagram nos gatilhos de direct e o "Siga para liberar". */
const CANAL = "22222222-2222-4222-8222-222222222222";
const CONTATO = "33333333-3333-4333-8333-333333333333";
const DISPARO = "44444444-4444-4444-8444-444444444444";

const atualizacoes: Array<Record<string, unknown>> = [];
const admin = {
  from: () => {
    const leitura = { eq: () => leitura, maybeSingle: async () => ({ data: { trigger_config: regraGravada.config }, error: null }) };
    return {
      select: () => leitura,
      update: (v: Record<string, unknown>) => {
        atualizacoes.push(v);
        const cadeia: { eq: () => typeof cadeia; then: (ok: (v: unknown) => unknown) => unknown } = {
          eq: () => cadeia,
          then: (ok) => ok({ error: null }),
        };
        return cadeia;
      },
    };
  },
} as unknown as SupabaseClient;

const eventoDeDirect = (recebidaEm: string) => ({
  contact_id: CONTATO,
  conversation_id: "v1",
  message_id: "m1",
  channel_session_id: CANAL,
  plataforma: "instagram",
  conta_id: "acc-1",
  conversa_zernio_id: "z-1",
  texto: "eu quero",
  recebida_em: recebidaEm,
  seguidor: null,
  story: null,
});
const eventoDeComentario = (seguidor: boolean | null) => ({
  contact_id: CONTATO,
  channel_session_id: CANAL,
  plataforma: "instagram",
  conta_id: "acc-1",
  comentario: {
    id: "c-1",
    texto: "quero",
    comentado_em: new Date(Date.now() - 3_600_000).toISOString(),
    publicacao_id: "179",
    publicacao_zernio_id: "zp-1",
    autor: { id: "u-1", usuario: "f", nome: "F", seguidor },
  },
  publicacao: { legenda: null, miniatura: null, link: null },
});

function contexto(evento: string, payload: unknown): ActionCtx {
  return {
    admin,
    organizationId: "org-1",
    ruleId: "regra-1",
    ruleName: "R",
    event: { id: "e", organization_id: "org-1", event_type: evento, entity_kind: "contact", entity_id: CONTATO, payload, metadata: {}, consumed_by: [], attempts: 0 },
    context: {},
    requestId: "r",
  } as unknown as ActionCtx;
}
const rodar = (ctx: ActionCtx, cfg: Record<string, unknown>) => getAction("send_instagram_message")!.execute(ctx, cfg);
const publico = {
  quem: "seguidores",
  quando_nao_informado: "pedir_para_seguir",
  liberar: { texto: "Siga para receber", titulo: "Já estou seguindo", texto_de_quem_nao_segue: "Siga e toque de novo" },
};

beforeEach(() => {
  atualizacoes.length = 0;
  for (const f of [privada, enviar, disparoDa, gravar, confirmar, falhar, credenciais]) f.mockReset();
  disparoDa.mockResolvedValue({ id: DISPARO, caminho_id: "qualquer", direct: "pendente", resposta: "pendente", repetido: false, motivo: null });
  credenciais.mockResolvedValue({ apiKey: "chave", accountId: "acc-1", baseUrl: "x", source: "session" });
  gravar.mockResolvedValue("msg-1");
  privada.mockResolvedValue({ ok: true, dados: { messageId: "zm-1" } });
  enviar.mockResolvedValue({ ok: true, dados: { messageId: "zm-2", anexoFalhou: false } });
  regraGravada.config = {
    channel_session_id: CANAL,
    escopo: "todos",
    caminhos: [{ id: "qualquer", publicacoes: [], filtro: { modo: "qualquer" }, resposta: null }],
    publico,
  };
});

describe("passo Instagram nos gatilhos de direct (D8)", () => {
  const config = { texto: "Aqui o link", botoes: [], anexo: { tipo: "image", url: "https://a.com/x.png", nome: null } };

  it("dentro da janela: manda pela conversa, com anexo, e grava com origem direct", async () => {
    const r = await rodar(contexto("instagram.message_received", eventoDeDirect(new Date(Date.now() - 3_600_000).toISOString())), config);
    expect(r).toMatchObject({ status: "success" });
    expect(enviar).toHaveBeenCalledWith("chave", expect.objectContaining({ conversaZernioId: "z-1", accountId: "acc-1", texto: "Aqui o link", anexo: config.anexo }));
    expect(gravar).toHaveBeenCalledWith(admin, expect.objectContaining({ origem: "direct", anexo: config.anexo }));
    expect(confirmar).toHaveBeenCalledWith(admin, "org-1", "msg-1", "social:acc-1:zm-2");
    expect(privada).not.toHaveBeenCalled();
  });

  it("fora da janela de 24 h: janela_fechada sem chamar a API", async () => {
    const velha = new Date(Date.now() - 25 * 3_600_000).toISOString();
    const r = await rodar(contexto("instagram.story_reply", eventoDeDirect(velha)), config);
    expect(r).toMatchObject({ status: "failed", error: "janela_fechada" });
    expect(enviar).not.toHaveBeenCalled();
  });

  it("anexo que falha vira detalhe, não erro", async () => {
    enviar.mockResolvedValue({ ok: true, dados: { messageId: "zm-2", anexoFalhou: true } });
    const r = await rodar(contexto("instagram.story_mention", eventoDeDirect(new Date().toISOString())), config);
    expect(r).toMatchObject({ status: "success", detail: { anexo_falhou: true } });
  });

  it("recusa da API → failed com a explicação e a mensagem marcada como falha", async () => {
    enviar.mockResolvedValue({ ok: false, status: 400, corpo: { error: "outside of allowed window" } });
    const r = await rodar(contexto("instagram.message_received", eventoDeDirect(new Date().toISOString())), config);
    expect(r).toMatchObject({ status: "failed", error: "janela_fechada" });
    expect(falhar).toHaveBeenCalled();
  });
});

describe("Siga para liberar no comentário (D13)", () => {
  const config = { texto: "Aqui o link", botoes: [{ titulo: "Ver", url: "https://a.com" }], anexo: null };

  it("quem não segue recebe o pedido com o botão postback e o direct fica guardado", async () => {
    const r = await rodar(contexto("comment.received", eventoDeComentario(false)), config);
    expect(r).toMatchObject({ status: "success", detail: { reason: "aguardando_seguir" } });
    expect(privada).toHaveBeenCalledWith(
      "chave",
      expect.objectContaining({
        texto: "Siga para receber",
        postId: "zp-1",
        botoes: [{ tipo: "postback", titulo: "Já estou seguindo", payload: `escale:liberar:${DISPARO}` }],
      }),
    );
    expect(atualizacoes[0]).toMatchObject({
      direct: "aguardando_seguir",
      direct_pendente: { texto: "Aqui o link", post_id: "zp-1", conta_id: "acc-1", botoes: [{ tipo: "url", titulo: "Ver", url: "https://a.com" }] },
    });
  });

  it("quem segue recebe o direct normal (caminho da 10B intacto)", async () => {
    const r = await rodar(contexto("comment.received", eventoDeComentario(true)), config);
    expect(r).toMatchObject({ status: "success" });
    expect(privada).toHaveBeenCalledWith("chave", expect.objectContaining({ texto: "Aqui o link", botoes: [{ tipo: "url", titulo: "Ver", url: "https://a.com" }] }));
    expect(atualizacoes[0]).toMatchObject({ direct: "enviado" });
  });

  it("disparo que já aguarda o toque não manda de novo", async () => {
    disparoDa.mockResolvedValue({ id: DISPARO, caminho_id: "q", direct: "aguardando_seguir", resposta: "pendente", repetido: false, motivo: null });
    expect(await rodar(contexto("comment.received", eventoDeComentario(false)), config)).toMatchObject({ status: "success" });
    expect(privada).not.toHaveBeenCalled();
  });
});
