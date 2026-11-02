// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const responder = vi.hoisted(() => vi.fn());
const credenciais = vi.hoisted(() => vi.fn());
vi.mock("@/lib/escale/comentarios/zernio", async (original) => ({
  ...((await original()) as object),
  responderComentario: responder,
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
type ErroFalso = { code: string; message: string } | null;

/** Banco falso: `inserts` recebe cada insert; `respostasDoInsert` é a fila de erros (null = ok). */
function bancoFalso(opcoes: { respostasDoInsert?: ErroFalso[]; disparo?: Linha | null } = {}) {
  const inserts: Linha[] = [];
  const updates: Linha[] = [];
  const fila = [...(opcoes.respostasDoInsert ?? [])];
  const admin = {
    from: () => {
      const q = {
        insert: async (linha: Linha) => {
          inserts.push(linha);
          return { error: fila.shift() ?? null };
        },
        update: (valores: Linha) => {
          updates.push(valores);
          return { eq: async () => ({ error: null }) };
        },
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: opcoes.disparo ?? null, error: null }),
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { admin, inserts, updates };
}

const disparo = (extra: Linha = {}) => ({
  id: "disp-1",
  caminho_id: "qualquer",
  direct: "pendente",
  resposta: "pendente",
  repetido: false,
  motivo: null,
  ...extra,
});

beforeEach(() => {
  responder.mockReset();
  credenciais.mockReset();
  credenciais.mockResolvedValue({ apiKey: "chave", accountId: "acc-1", baseUrl: "x", source: "session" });
});

describe("reivindicarDisparos", () => {
  it("insert ok → a regra fica", async () => {
    const { admin, inserts } = bancoFalso();
    const regras = [regra([])];
    expect(await reivindicarDisparos(admin, evento, regras)).toEqual(regras);
    expect(inserts[0]).toMatchObject({ rule_id: REGRA, caminho_id: "qualquer", comentario_id: "c-1", autor_id: "u-1" });
  });

  it("grava a publicação saneada no disparo e também na linha repetido", async () => {
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
    const { admin, inserts } = bancoFalso({
      respostasDoInsert: [{ code: "23505", message: 'violates "uq_escale_disparos_de_comentario_pessoa"' }],
    });
    await reivindicarDisparos(admin, comLink, [regra([])]);
    const esperado = {
      publicacao_legenda: "Meu reels",
      publicacao_miniatura: "https://scontent.cdninstagram.com/a.jpg",
      publicacao_link: "https://www.instagram.com/reel/abc/",
    };
    expect(inserts[0]).toMatchObject(esperado);
    expect(inserts[1]).toMatchObject({ repetido: true, ...esperado });
  });

  it("link http do payload grava publicacao_link null", async () => {
    const http = {
      ...evento,
      payload: {
        ...(evento.payload as object),
        publicacao: { legenda: null, miniatura: null, link: "http://instagram.com/p/x" },
      },
    } as EventRow;
    const { admin, inserts } = bancoFalso();
    await reivindicarDisparos(admin, http, [regra([])]);
    expect(inserts[0]).toMatchObject({ publicacao_link: null });
  });

  it("23505 do índice do comentário → reentrega: sai sem gravar mais nada", async () => {
    const { admin, inserts } = bancoFalso({
      respostasDoInsert: [{ code: "23505", message: 'violates "uq_escale_disparos_de_comentario_comentario"' }],
    });
    expect(await reivindicarDisparos(admin, evento, [regra([])])).toEqual([]);
    expect(inserts).toHaveLength(1);
  });

  it("23505 do índice da pessoa → grava a linha repetido e sai", async () => {
    const { admin, inserts } = bancoFalso({
      respostasDoInsert: [{ code: "23505", message: 'violates "uq_escale_disparos_de_comentario_pessoa"' }],
    });
    expect(await reivindicarDisparos(admin, evento, [regra([])])).toEqual([]);
    expect(inserts[1]).toMatchObject({ repetido: true, direct: "pulado", resposta: "pulada", motivo: "ja_recebeu" });
  });

  it("outro erro do banco lança", async () => {
    const { admin } = bancoFalso({ respostasDoInsert: [{ code: "XX000", message: "boom" }] });
    await expect(reivindicarDisparos(admin, evento, [regra([])])).rejects.toThrow(/disparo_de_comentario_falhou/);
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
