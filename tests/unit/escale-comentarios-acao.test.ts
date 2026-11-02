// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ordem = vi.hoisted(() => [] as string[]);
const privada = vi.hoisted(() => vi.fn());
const disparoDa = vi.hoisted(() => vi.fn());
const gravar = vi.hoisted(() => vi.fn());
const confirmar = vi.hoisted(() => vi.fn());
const falhar = vi.hoisted(() => vi.fn());
const credenciais = vi.hoisted(() => vi.fn());

vi.mock("@/lib/escale/comentarios/zernio", async (original) => ({
  ...((await original()) as object),
  respostaPrivada: privada,
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

/** Fase 10B: o passo Instagram (resposta privada ao comentário). */
const CANAL = "22222222-2222-4222-8222-222222222222";
const CONTATO = "33333333-3333-4333-8333-333333333333";

const payload = (comentadoEm: string) => ({
  contact_id: CONTATO,
  channel_session_id: CANAL,
  plataforma: "instagram",
  conta_id: "acc-1",
  comentario: {
    id: "c-1",
    texto: "quero",
    comentado_em: comentadoEm,
    publicacao_id: "179",
    publicacao_zernio_id: null,
    autor: { id: "u-1", usuario: "fulano", nome: "Fulano" },
  },
  publicacao: { legenda: null, miniatura: null, link: null },
});

const atualizacoes: Array<Record<string, unknown>> = [];
const admin = {
  from: () => {
    const leitura = { eq: () => leitura, maybeSingle: async () => ({ data: null, error: null }) };
    return {
      select: () => leitura,
      update: (valores: Record<string, unknown>) => {
        atualizacoes.push(valores);
        return { eq: async () => ({ error: null }) };
      },
    };
  },
} as unknown as SupabaseClient;

function contexto(opcoes: { evento?: string; comentadoEm?: string } = {}): ActionCtx {
  return {
    admin,
    organizationId: "org-1",
    ruleId: "regra-1",
    ruleName: "Comentário",
    event: {
      id: "evt-1",
      organization_id: "org-1",
      event_type: opcoes.evento ?? "comment.received",
      entity_kind: "contact",
      entity_id: CONTATO,
      payload: payload(opcoes.comentadoEm ?? new Date(Date.now() - 3_600_000).toISOString()),
      metadata: {},
      consumed_by: [],
      attempts: 0,
    },
    context: {},
    requestId: "r-1",
  };
}
const config = { texto: "Oi, aqui o link!", botoes: [{ titulo: "Ver", url: "https://a.com" }] };
const rodar = (ctx: ActionCtx, cfg: Record<string, unknown> = config) => getAction("send_instagram_message")!.execute(ctx, cfg);

beforeEach(() => {
  ordem.length = 0;
  atualizacoes.length = 0;
  for (const f of [privada, disparoDa, gravar, confirmar, falhar, credenciais]) f.mockReset();
  disparoDa.mockResolvedValue({ id: "disp-1", caminho_id: "qualquer", direct: "pendente", resposta: "pendente", repetido: false, motivo: null });
  credenciais.mockResolvedValue({ apiKey: "chave", accountId: "acc-1", baseUrl: "x", source: "session" });
  gravar.mockImplementation(async () => {
    ordem.push("gravou");
    return "msg-1";
  });
  privada.mockImplementation(async () => {
    ordem.push("enviou");
    return { ok: true, dados: { messageId: "zm-9" } };
  });
});

describe("send_instagram_message", () => {
  it("config inválida → failed", async () => {
    const r = await rodar(contexto(), { texto: "", botoes: [] });
    expect(r).toMatchObject({ status: "failed", error: "config_invalida" });
  });

  it("gatilho de outro tipo → skipped com a explicação", async () => {
    const r = await rodar(contexto({ evento: "lead.won" }));
    expect(r).toMatchObject({ status: "skipped", detail: { reason: "so_com_gatilho_de_comentario" } });
    expect(privada).not.toHaveBeenCalled();
  });

  it("disparo já enviado → success sem chamar o Zernio (Reenviar)", async () => {
    disparoDa.mockResolvedValue({ id: "disp-1", caminho_id: "q", direct: "enviado", resposta: "pendente", repetido: false, motivo: null });
    expect(await rodar(contexto())).toMatchObject({ status: "success" });
    expect(privada).not.toHaveBeenCalled();
  });

  it("prazo vencido → failed com explicação e disparo atualizado, sem chamar o Zernio", async () => {
    const velho = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const r = await rodar(contexto({ comentadoEm: velho }));
    expect(r).toMatchObject({ status: "failed", error: "prazo_vencido" });
    expect((r.detail as { explicacao: string }).explicacao).toMatch(/7 dias/);
    expect(atualizacoes[0]).toMatchObject({ direct: "falhou", motivo: "prazo_vencido" });
    expect(privada).not.toHaveBeenCalled();
  });

  it("sucesso: grava a conversa ANTES do envio e confirma com o id do Zernio", async () => {
    const r = await rodar(contexto());
    expect(ordem).toEqual(["gravou", "enviou"]);
    expect(r).toMatchObject({ status: "success", detail: { message_id: "zm-9" } });
    expect(confirmar).toHaveBeenCalledWith(admin, "org-1", "msg-1", "social:acc-1:zm-9");
    expect(atualizacoes[0]).toMatchObject({ direct: "enviado", direct_message_id: "zm-9" });
    expect(privada).toHaveBeenCalledWith("chave", expect.objectContaining({ texto: "Oi, aqui o link!", commentId: "c-1", postId: "179", botoes: [{ tipo: "url", ...config.botoes[0]! }] }));
  });

  it("recusa de botão → falharDirect e failed com a explicação", async () => {
    privada.mockResolvedValue({ ok: false, status: 400, corpo: { error: { code: 2, subcode: 1545133 } } });
    const r = await rodar(contexto());
    expect(r).toMatchObject({ status: "failed", error: "botoes_recusados", detail: { erro: "HTTP 400" } });
    expect(falhar).toHaveBeenCalledWith(admin, "org-1", "msg-1", expect.stringMatching(/não segue a conta/));
    expect(atualizacoes[0]).toMatchObject({ direct: "falhou", motivo: "botoes_recusados" });
  });

  it("sem credencial → credencial_indisponivel e nada é gravado na conversa", async () => {
    credenciais.mockResolvedValue(null);
    const r = await rodar(contexto());
    expect(r).toMatchObject({ status: "failed", error: "credencial_indisponivel" });
    expect(gravar).not.toHaveBeenCalled();
  });
});
