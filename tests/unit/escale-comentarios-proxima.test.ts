// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publicacoes = vi.hoisted(() => vi.fn());
vi.mock("@/lib/escale/comentarios/zernio", async (original) => ({
  ...((await original()) as object),
  publicacoesDaConta: publicacoes,
}));

import { resolverProximaPublicacao } from "@/lib/escale/comentarios/proxima";
import type { ConfigDoComentario } from "@/lib/escale/comentarios/schema";

/** Fase 10D (D11): "Próxima publicação" resolvida sob demanda. */
const config = (extra: Partial<NonNullable<ConfigDoComentario["proxima"]>> = {}): ConfigDoComentario => ({
  channel_session_id: "s",
  escopo: "proxima",
  caminhos: [{ id: "qualquer", publicacoes: [], filtro: { modo: "qualquer" }, resposta: null }],
  proxima: { armada_em: "2026-11-02T10:00:00.000Z", conhecidas: ["p0"], resolvida: null, ...extra },
});
const post = (id: string, criadaEm: string | null) => ({ id, legenda: `L ${id}`, miniatura: null, tipo: "reel", criadaEm, link: null, comentarios: 0 });

function banco(linhasAfetadas: number, atual: unknown = null) {
  const updates: unknown[] = [];
  const q = {
    update: (v: unknown) => {
      updates.push(v);
      return q;
    },
    select: () => q,
    eq: () => q,
    maybeSingle: async () => ({ data: atual, error: null }),
    then: (ok: (v: unknown) => unknown) => ok({ data: Array.from({ length: linhasAfetadas }, () => ({ id: "r" })), error: null }),
  };
  return { admin: { from: () => q } as unknown as SupabaseClient, updates };
}
const entrada = (c: ConfigDoComentario, publicacao: string) => ({
  organizationId: "o",
  regraId: "r",
  atualizadoEm: "t",
  triggerConfig: c,
  chave: "k",
  contaId: "acc",
  publicacaoDoComentario: publicacao,
});

beforeEach(() => publicacoes.mockReset());

describe("resolverProximaPublicacao", () => {
  it("a mais antiga depois de armar é a próxima: grava e devolve", async () => {
    publicacoes.mockResolvedValue({ ok: true, dados: [post("p2", "2026-11-02T12:00:00Z"), post("p1", "2026-11-02T11:00:00Z"), post("p0", "2026-11-01T08:00:00Z")] });
    const { admin, updates } = banco(1);
    const r = await resolverProximaPublicacao(admin, entrada(config(), "p1"));
    expect(r?.proxima?.resolvida).toMatchObject({ id: "p1", legenda: "L p1", publicada_em: "2026-11-02T11:00:00Z" });
    expect(updates).toHaveLength(1);
  });

  it("comentário em outra publicação → null sem gravar", async () => {
    publicacoes.mockResolvedValue({ ok: true, dados: [post("p1", "2026-11-02T11:00:00Z"), post("p2", "2026-11-02T12:00:00Z")] });
    const { admin, updates } = banco(1);
    expect(await resolverProximaPublicacao(admin, entrada(config(), "p2"))).toBeNull();
    expect(updates).toHaveLength(0);
  });

  it("publicação já conhecida → não chama o Zernio", async () => {
    const { admin } = banco(1);
    expect(await resolverProximaPublicacao(admin, entrada(config(), "p0"))).toBeNull();
    expect(publicacoes).not.toHaveBeenCalled();
  });

  it("data ilegível fica fora", async () => {
    publicacoes.mockResolvedValue({ ok: true, dados: [post("p1", null)] });
    const { admin } = banco(1);
    expect(await resolverProximaPublicacao(admin, entrada(config(), "p1"))).toBeNull();
  });

  it("update sem linha afetada → devolve o que outro comentário já resolveu", async () => {
    publicacoes.mockResolvedValue({ ok: true, dados: [post("p1", "2026-11-02T11:00:00Z")] });
    const resolvidaPorOutro = config({ resolvida: { id: "p1", legenda: null, miniatura: null, tipo: null, publicada_em: null } });
    const { admin } = banco(0, { trigger_config: resolvidaPorOutro });
    const r = await resolverProximaPublicacao(admin, entrada(config(), "p1"));
    expect(r?.proxima?.resolvida?.id).toBe("p1");
  });

  it("erro do Zernio → null", async () => {
    publicacoes.mockResolvedValue({ ok: false, status: 500, corpo: null });
    const { admin } = banco(1);
    expect(await resolverProximaPublicacao(admin, entrada(config(), "p1"))).toBeNull();
  });
});
