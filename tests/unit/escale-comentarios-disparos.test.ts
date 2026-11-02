// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const responder = vi.hoisted(() => vi.fn());
const credenciais = vi.hoisted(() => vi.fn());
const ocultar = vi.hoisted(() => vi.fn());
const curtir = vi.hoisted(() => vi.fn());
vi.mock("@/lib/escale/comentarios/zernio", async (original) => ({
  ...((await original()) as object),
  responderComentario: responder,
  ocultarComentario: ocultar,
  curtirComentario: curtir,
}));
vi.mock("@/lib/channels/zernio/credentials", () => ({ zernioCredsForAccountId: credenciais }));

import { concluirDisparo, reivindicarDisparos } from "@/lib/escale/comentarios/disparos";
import type { EventRow } from "@/lib/event-log/dispatcher";

/** Fase 10B: reivindicar o disparo (dedup no banco) e fechá-lo com a resposta pública. */
const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";
const CONTATO = "33333333-3333-4333-8333-333333333333";
const REGRA = "44444444-4444-4444-8444-444444444444";

const config = (resposta: { variacoes: string[] } | null = { variacoes: ["Te respondi!"] }) => ({
  channel_session_id: CANAL,
  escopo: "todos",
  caminhos: [{ id: "qualquer", publicacoes: [], filtro: { modo: "qualquer" }, resposta }],
});
const regra = (actions: Array<{ type: string }>, resposta?: { variacoes: string[] } | null) => ({
  id: REGRA,
  name: "Comentário",
  actions,
  trigger_config: config(resposta),
});

const evento: EventRow = {
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
      texto: "quero",
      comentado_em: "2026-11-01T10:00:00.000Z",
      publicacao_id: "179",
      publicacao_zernio_id: "zp-1",
      autor: { id: "u-1", usuario: "fulano", nome: "Fulano" },
    },
    publicacao: { legenda: null, miniatura: null, link: null },
  },
  metadata: {},
  consumed_by: [],
  attempts: 0,
};

type Linha = Record<string, unknown>;

/** Banco falso: `chamadas` recebe cada RPC de reivindicar; `respostasDaRpc` é a fila de resultados. */
function bancoFalso(opcoes: { respostasDaRpc?: Array<string | { erro: { code: string; message: string } }>; disparo?: Linha | null } = {}) {
  const chamadas: Array<{ nome: string; args: Linha }> = [];
  const updates: Linha[] = [];
  const fila = [...(opcoes.respostasDaRpc ?? [])];
  const admin = {
    rpc: async (nome: string, args: Linha) => {
      chamadas.push({ nome, args });
      const proxima = fila.shift() ?? "novo";
      return typeof proxima === "string" ? { data: proxima, error: null } : { data: null, error: proxima.erro };
    },
    from: () => {
      const q = {
        update: (valores: Linha) => {
          updates.push(valores);
          const cadeia: { eq: () => typeof cadeia; then: (ok: (v: unknown) => unknown) => unknown } = {
            eq: () => cadeia,
            then: (ok) => ok({ error: null }),
          };
          return cadeia;
        },
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: opcoes.disparo ?? null, error: null }),
      };
      return q;
    },
  } as unknown as SupabaseClient;
  const linhas = () => chamadas.map((c) => c.args.p_linha as Linha);
  return { admin, chamadas, linhas, updates };
}

const disparo = (extra: Linha = {}) => ({
  id: "disp-1",
  caminho_id: "qualquer",
  direct: "pendente",
  resposta: "pendente",
  repetido: false,
  motivo: null,
  ocultar: "nao_pedido",
  curtir: "nao_pedido",
  ...extra,
});

beforeEach(() => {
  ocultar.mockReset();
  curtir.mockReset();
  responder.mockReset();
  credenciais.mockReset();
  credenciais.mockResolvedValue({ apiKey: "chave", accountId: "acc-1", baseUrl: "x", source: "session" });
});

describe("reivindicarDisparos", () => {
  it("novo → a regra fica, e a RPC leva a linha e o intervalo", async () => {
    const { admin, chamadas, linhas } = bancoFalso();
    const regras = [regra([])];
    expect(await reivindicarDisparos(admin, evento, regras)).toEqual(regras);
    expect(chamadas[0]).toMatchObject({ nome: "fn_escale_reivindicar_disparo", args: { p_intervalo_horas: null } });
    expect(linhas()[0]).toMatchObject({ rule_id: REGRA, caminho_id: "qualquer", comentario_id: "c-1", autor_id: "u-1", ocultar: "nao_pedido", curtir: "nao_pedido" });
  });

  it("intervalo da repetição vai como p_intervalo_horas", async () => {
    const { admin, chamadas } = bancoFalso();
    const r = { ...regra([]), trigger_config: { ...config(), repeticao: { modo: "intervalo", horas: 24 } } };
    await reivindicarDisparos(admin, evento, [r]);
    expect(chamadas[0]!.args.p_intervalo_horas).toBe(24);
  });

  it("grava a publicação saneada na linha", async () => {
    const comLink = {
      ...evento,
      payload: {
        ...(evento.payload as object),
        publicacao: {
          legenda: "  Meu reels  ",
          miniatura: "https://scontent.cdninstagram.com/a.jpg",
          link: "https://www.instagram.com/reel/abc/",
        },
      },
    } as EventRow;
    const { admin, linhas } = bancoFalso();
    await reivindicarDisparos(admin, comLink, [regra([])]);
    expect(linhas()[0]).toMatchObject({
      publicacao_legenda: "Meu reels",
      publicacao_miniatura: "https://scontent.cdninstagram.com/a.jpg",
      publicacao_link: "https://www.instagram.com/reel/abc/",
    });
  });

  it("link http do payload grava publicacao_link null", async () => {
    const http = {
      ...evento,
      payload: {
        ...(evento.payload as object),
        publicacao: { legenda: null, miniatura: null, link: "http://instagram.com/p/x" },
      },
    } as EventRow;
    const { admin, linhas } = bancoFalso();
    await reivindicarDisparos(admin, http, [regra([])]);
    expect(linhas()[0]).toMatchObject({ publicacao_link: null });
  });

  it("ja_existe (reentrega) e repetido → a regra não roda", async () => {
    for (const resposta of ["ja_existe", "repetido"]) {
      const { admin } = bancoFalso({ respostasDaRpc: [resposta] });
      expect(await reivindicarDisparos(admin, evento, [regra([])])).toEqual([]);
    }
  });

  it("erro da RPC lança", async () => {
    const { admin } = bancoFalso({ respostasDaRpc: [{ erro: { code: "XX000", message: "boom" } }] });
    await expect(reivindicarDisparos(admin, evento, [regra([])])).rejects.toThrow(/disparo_de_comentario_falhou/);
  });

  it("fora do público grava fora_do_publico, fecha a resposta e não roda", async () => {
    const publico = { quem: "seguidores", quando_nao_informado: "nao_enviar", liberar: { texto: "t", titulo: "ti", texto_de_quem_nao_segue: "n" } };
    const r = { ...regra([]), trigger_config: { ...config(), publico } };
    const { admin, linhas, updates } = bancoFalso();
    expect(await reivindicarDisparos(admin, evento, [r])).toEqual([]);
    expect(linhas()[0]).toMatchObject({ direct: "fora_do_publico", motivo: "fora_do_publico", ocultar: "nao_pedido" });
    expect(updates[0]).toMatchObject({ resposta: "pulada" });
  });

  it("ocultar e curtir pendentes só quando o caminho pede; curtir só no Facebook", async () => {
    const cfg = { ...config(), caminhos: [{ id: "qualquer", publicacoes: [], filtro: { modo: "qualquer" }, resposta: null, ocultar_depois: true, curtir: true }] };
    const r = { ...regra([]), trigger_config: cfg };
    const insta = bancoFalso();
    await reivindicarDisparos(insta.admin, evento, [r]);
    expect(insta.linhas()[0]).toMatchObject({ ocultar: "pendente", curtir: "nao_pedido" });
    const face = bancoFalso();
    const noFace = { ...evento, payload: { ...(evento.payload as object), plataforma: "facebook" } } as EventRow;
    await reivindicarDisparos(face.admin, noFace, [r]);
    expect(face.linhas()[0]).toMatchObject({ ocultar: "pendente", curtir: "pendente" });
  });
});

describe("concluirDisparo", () => {
  const fechar = (admin: SupabaseClient, rule: ReturnType<typeof regra>) =>
    concluirDisparo(admin, { row: evento, rule, runId: "run-1" });

  it("sem passo Instagram e com resposta → publica com a idempotência do disparo", async () => {
    responder.mockResolvedValue({ ok: true, dados: { commentId: "r-1" } });
    const { admin, updates } = bancoFalso({ disparo: disparo() });
    await fechar(admin, regra([{ type: "send_whatsapp_message" }]));
    expect(responder).toHaveBeenCalledWith(
      "chave",
      expect.objectContaining({ idempotencia: "disp-1", texto: "Te respondi!", commentId: "c-1", postId: "zp-1" }),
    );
    expect(updates[0]).toMatchObject({ run_id: "run-1", direct: "sem_passo", resposta: "publicada", resposta_publicada: "Te respondi!" });
  });

  it("com passo e direct falhou → resposta pulada, sem chamar o Zernio", async () => {
    const { admin, updates } = bancoFalso({ disparo: disparo({ direct: "falhou", motivo: "prazo_vencido" }) });
    await fechar(admin, regra([{ type: "send_instagram_message" }]));
    expect(responder).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ resposta: "pulada" });
    expect(updates[0]).not.toHaveProperty("direct");
  });

  it("com passo e direct enviado → publica", async () => {
    responder.mockResolvedValue({ ok: true, dados: { commentId: null } });
    const { admin, updates } = bancoFalso({ disparo: disparo({ direct: "enviado" }) });
    await fechar(admin, regra([{ type: "send_instagram_message" }]));
    expect(updates[0]).toMatchObject({ resposta: "publicada" });
  });

  it("sem resposta no caminho → sem_resposta", async () => {
    const { admin, updates } = bancoFalso({ disparo: disparo() });
    await fechar(admin, regra([], null));
    expect(responder).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ resposta: "sem_resposta", direct: "sem_passo" });
  });

  it("o Zernio recusa → falhou com o motivo", async () => {
    responder.mockResolvedValue({ ok: false, status: 403, corpo: {} });
    const { admin, updates } = bancoFalso({ disparo: disparo() });
    await fechar(admin, regra([]));
    expect(updates[0]).toMatchObject({ resposta: "falhou", motivo: "acesso_recusado" });
  });

  it("sem credencial → falhou com credencial_indisponivel", async () => {
    credenciais.mockResolvedValue(null);
    const { admin, updates } = bancoFalso({ disparo: disparo() });
    await fechar(admin, regra([]));
    expect(updates[0]).toMatchObject({ resposta: "falhou", motivo: "credencial_indisponivel" });
  });

  it("nunca lança: erro do banco só é logado", async () => {
    const admin = {
      from: () => {
        throw new Error("banco fora");
      },
    } as unknown as SupabaseClient;
    await expect(fechar(admin, regra([]))).resolves.toBeUndefined();
  });
});

describe("concluirDisparo: ações no comentário (10D, D14)", () => {
  const fechar = (admin: SupabaseClient, rule: ReturnType<typeof regra>) =>
    concluirDisparo(admin, { row: evento, rule, runId: "run-1" });

  it("direct enviado → oculta e curta o que foi pedido", async () => {
    responder.mockResolvedValue({ ok: true, dados: { commentId: null } });
    ocultar.mockResolvedValue({ ok: true, dados: {} });
    curtir.mockResolvedValue({ ok: false, status: 500, corpo: null });
    const { admin, updates } = bancoFalso({ disparo: disparo({ direct: "enviado", ocultar: "pendente", curtir: "pendente" }) });
    const face = { ...evento, payload: { ...(evento.payload as object), plataforma: "facebook" } } as EventRow;
    await concluirDisparo(admin, { row: face, rule: regra([{ type: "send_instagram_message" }]), runId: "r" });
    expect(ocultar).toHaveBeenCalledWith("chave", { postId: "zp-1", commentId: "c-1", accountId: "acc-1" });
    expect(updates[0]).toMatchObject({ ocultar: "feito", curtir: "falhou" });
    expect(updates[0]).not.toHaveProperty("motivo");
  });

  it("curtir fora do Facebook não chama o Zernio", async () => {
    responder.mockResolvedValue({ ok: true, dados: { commentId: null } });
    const { admin } = bancoFalso({ disparo: disparo({ direct: "enviado", curtir: "pendente" }) });
    await fechar(admin, regra([{ type: "send_instagram_message" }]));
    expect(curtir).not.toHaveBeenCalled();
  });

  it("aguardando_seguir não publica, não oculta e não curte", async () => {
    const { admin, updates } = bancoFalso({ disparo: disparo({ direct: "aguardando_seguir", ocultar: "pendente" }) });
    await fechar(admin, regra([{ type: "send_instagram_message" }]));
    expect(responder).not.toHaveBeenCalled();
    expect(ocultar).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ resposta: "pendente" });
    expect(updates[0]).not.toHaveProperty("ocultar");
  });

  it("direct falhou → ações esperam (não oculta)", async () => {
    const { admin } = bancoFalso({ disparo: disparo({ direct: "falhou", ocultar: "pendente" }) });
    await fechar(admin, regra([{ type: "send_instagram_message" }]));
    expect(ocultar).not.toHaveBeenCalled();
  });
});
