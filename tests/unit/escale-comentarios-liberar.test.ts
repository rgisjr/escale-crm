// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const enviar = vi.hoisted(() => vi.fn());
const responder = vi.hoisted(() => vi.fn());
const ocultar = vi.hoisted(() => vi.fn());
const gravar = vi.hoisted(() => vi.fn());
const credenciais = vi.hoisted(() => vi.fn());

vi.mock("@/lib/escale/comentarios/zernio", async (original) => ({
  ...((await original()) as object),
  enviarDirect: enviar,
  responderComentario: responder,
  ocultarComentario: ocultar,
}));
vi.mock("@/lib/escale/comentarios/conversa", () => ({
  gravarDirectNaConversa: gravar,
  confirmarDirect: vi.fn(),
  falharDirect: vi.fn(),
}));
vi.mock("@/lib/channels/zernio/credentials", () => ({ zernioCredsForAccountId: credenciais }));

import { liberarDirect } from "@/lib/escale/comentarios/liberar";

/** Fase 10D (D13): o toque no "Já estou seguindo". */
const DISPARO = "44444444-4444-4444-8444-444444444444";
const base = { organizationId: "org-1", disparoId: DISPARO, conversaZernioId: "z-1", contaId: "acc-1" };

const publico = {
  quem: "seguidores",
  quando_nao_informado: "pedir_para_seguir",
  liberar: { texto: "Siga", titulo: "Já estou seguindo", texto_de_quem_nao_segue: "Siga e toque de novo" },
};
const regra = {
  trigger_config: {
    channel_session_id: "s1",
    escopo: "todos",
    caminhos: [{ id: "qualquer", publicacoes: [], filtro: { modo: "qualquer" }, resposta: { variacoes: ["Te respondi!"] } }],
    publico,
  },
};
const disparo = (extra: Record<string, unknown> = {}) => ({
  id: DISPARO,
  rule_id: "r1",
  channel_session_id: "s1",
  contact_id: "c1",
  caminho_id: "qualquer",
  plataforma: "instagram",
  comentario_id: "c-1",
  publicacao_id: "179",
  toques_no_liberar: 0,
  ocultar: "pendente",
  curtir: "nao_pedido",
  direct_pendente: {
    texto: "Aqui o link",
    botoes: [{ tipo: "url", titulo: "Ver", url: "https://a.com" }],
    post_id: "zp-1",
    conta_id: "acc-1",
  },
  ...extra,
});

const atualizacoes: Array<Record<string, unknown>> = [];
/** Quantas linhas o update condicional "ganha" (0 = outro toque chegou primeiro). */
let linhasGanhas = 1;
function banco(linha: unknown): SupabaseClient {
  return {
    from: (tabela: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: tabela === "automation_rules" ? regra : linha, error: null }),
        update: (v: Record<string, unknown>) => {
          atualizacoes.push(v);
          const cadeia: {
            eq: () => typeof cadeia;
            select: () => Promise<{ data: Array<{ id: string }>; error: null }>;
            then: (ok: (v: unknown) => unknown) => unknown;
          } = {
            eq: () => cadeia,
            select: async () => ({ data: Array.from({ length: linhasGanhas }, () => ({ id: "x" })), error: null }),
            then: (ok) => ok({ error: null }),
          };
          return cadeia;
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  atualizacoes.length = 0;
  linhasGanhas = 1;
  for (const f of [enviar, responder, ocultar, gravar, credenciais]) f.mockReset();
  credenciais.mockResolvedValue({ apiKey: "chave" });
  gravar.mockResolvedValue("msg-1");
  enviar.mockResolvedValue({ ok: true, dados: { messageId: "zm-1", anexoFalhou: false } });
  responder.mockResolvedValue({ ok: true, dados: { commentId: null } });
  ocultar.mockResolvedValue({ ok: true, dados: {} });
});

describe("liberarDirect", () => {
  it("disparo que não aguarda → ignorado", async () => {
    expect(await liberarDirect(banco(null), { ...base, seguidor: true })).toBe("ignorado");
    expect(enviar).not.toHaveBeenCalled();
  });

  it("seguidor: manda o direct guardado, responde em público e oculta", async () => {
    expect(await liberarDirect(banco(disparo()), { ...base, seguidor: true })).toBe("enviado");
    expect(enviar).toHaveBeenCalledWith("chave", expect.objectContaining({ texto: "Aqui o link", conversaZernioId: "z-1" }));
    expect(responder).toHaveBeenCalledWith("chave", expect.objectContaining({ texto: "Te respondi!", postId: "zp-1", idempotencia: DISPARO }));
    expect(ocultar).toHaveBeenCalled();
    expect(atualizacoes.at(-1)).toMatchObject({ direct: "enviado", direct_pendente: null, resposta: "publicada", ocultar: "feito" });
  });

  it("não segue: pede de novo com o botão e soma o toque", async () => {
    expect(await liberarDirect(banco(disparo()), { ...base, seguidor: false })).toBe("pediu_de_novo");
    expect(enviar).toHaveBeenCalledWith(
      "chave",
      expect.objectContaining({ texto: "Siga e toque de novo", botoes: [{ tipo: "postback", titulo: "Já estou seguindo", payload: `escale:liberar:${DISPARO}` }] }),
    );
    expect(atualizacoes[0]).toMatchObject({ toques_no_liberar: 1 });
  });

  it("outro toque chegou primeiro (a linha já mudou): ignora e não manda nada", async () => {
    linhasGanhas = 0;
    expect(await liberarDirect(banco(disparo()), { ...base, seguidor: true })).toBe("ignorado");
    expect(await liberarDirect(banco(disparo()), { ...base, seguidor: false })).toBe("ignorado");
    expect(enviar).not.toHaveBeenCalled();
    expect(responder).not.toHaveBeenCalled();
  });

  it("seguidor: reivindica a linha ANTES de enviar", async () => {
    await liberarDirect(banco(disparo()), { ...base, seguidor: true });
    expect(atualizacoes[0]).toMatchObject({ direct: "pendente" });
  });

  it("terceiro toque sem seguir: desiste com nao_seguiu", async () => {
    expect(await liberarDirect(banco(disparo({ toques_no_liberar: 2 })), { ...base, seguidor: null })).toBe("desistiu");
    expect(enviar).not.toHaveBeenCalled();
    expect(atualizacoes.at(-1)).toMatchObject({ direct: "falhou", motivo: "nao_seguiu", direct_pendente: null });
  });

  it("falha ao enviar o direct guardado → falhou com o motivo", async () => {
    enviar.mockResolvedValue({ ok: false, status: 400, corpo: { error: "outside of allowed window" } });
    expect(await liberarDirect(banco(disparo()), { ...base, seguidor: true })).toBe("desistiu");
    expect(atualizacoes.at(-1)).toMatchObject({ direct: "falhou", motivo: "janela_fechada" });
    expect(responder).not.toHaveBeenCalled();
  });
});
