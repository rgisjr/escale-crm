// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { audit } = vi.hoisted(() => ({ audit: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit }));

import { gravarVariaveisDoCanal, validarVariaveis } from "@/lib/canais/variaveis-escrita";

const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";

describe("validarVariaveis", () => {
  it("aceita chaves válidas", () => {
    expect(validarVariaveis({ pix_chave: "51999600190" })).toEqual({ ok: true });
  });
  it("recusa chave reservada", () => {
    expect(validarVariaveis({ nome: "x" })).toEqual({ ok: false, motivo: "chave_reservada:nome" });
  });
  it("recusa chave com formato inválido", () => {
    expect(validarVariaveis({ "Pix Chave": "x" })).toEqual({ ok: false, motivo: "chave_invalida:Pix Chave" });
  });
  it("recusa valor vazio ou acima de 2000", () => {
    expect(validarVariaveis({ a: "" }).ok).toBe(false);
    expect(validarVariaveis({ a: "x".repeat(2001) }).ok).toBe(false);
  });
});

/** Banco falso: `jaExistem` são as chaves que o update encontra; o resto vai para insert. */
function banco(opcoes: { canalExiste?: boolean; jaExistem?: string[] }) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ valores: Record<string, unknown>; filtros: Record<string, unknown> }> = [];
  const db = {
    from: (tabela: string) => {
      const filtros: Record<string, unknown> = {};
      let valores: Record<string, unknown> | null = null;
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = (c: string, v: unknown) => {
        filtros[c] = v;
        return q;
      };
      q.is = (c: string, v: unknown) => {
        filtros[c] = v;
        return q;
      };
      q.update = (v: Record<string, unknown>) => {
        valores = v;
        return q;
      };
      q.insert = async (v: Record<string, unknown>) => {
        inserts.push(v);
        return { error: null };
      };
      q.maybeSingle = async () => ({ data: tabela === "channel_sessions" && opcoes.canalExiste ? { id: CANAL } : null, error: null });
      q.then = (ok: (r: unknown) => unknown) => {
        if (valores) updates.push({ valores, filtros: { ...filtros } });
        const achou = valores && (opcoes.jaExistem ?? []).includes(String(filtros.chave));
        return Promise.resolve({ data: achou ? [{ id: "x" }] : [], error: null }).then(ok);
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, inserts, updates };
}

beforeEach(() => audit.mockReset());

describe("gravarVariaveisDoCanal", () => {
  it("atualiza a que existe e insere a que não existe, sempre com a organização do contexto", async () => {
    const { db, inserts, updates } = banco({ canalExiste: true, jaExistem: ["pix_chave"] });
    await gravarVariaveisDoCanal(db, {
      organizationId: ORG,
      channelSessionId: CANAL,
      valores: { pix_chave: "1", pix_nome: "Maria" },
      requestId: "req",
      actorUserId: null,
    });
    expect(updates[0]!.filtros).toMatchObject({ organization_id: ORG, chave: "pix_chave", channel_session_id: CANAL });
    expect(inserts).toEqual([{ organization_id: ORG, channel_session_id: CANAL, chave: "pix_nome", value_text: "Maria" }]);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "channel_variables.updated" }));
  });

  it("canal que não é da organização: recusa sem gravar", async () => {
    const { db, inserts } = banco({ canalExiste: false });
    await expect(
      gravarVariaveisDoCanal(db, { organizationId: ORG, channelSessionId: CANAL, valores: { a: "1" }, requestId: "r", actorUserId: null }),
    ).rejects.toThrow("canal_nao_encontrado");
    expect(inserts).toHaveLength(0);
  });

  it("canal null grava o padrão da organização", async () => {
    const { db, updates } = banco({ jaExistem: ["pix_banco"] });
    await gravarVariaveisDoCanal(db, { organizationId: ORG, channelSessionId: null, valores: { pix_banco: "MP" }, requestId: "r", actorUserId: null });
    expect(updates[0]!.filtros).toMatchObject({ channel_session_id: null });
  });
});
