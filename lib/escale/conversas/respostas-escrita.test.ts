// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { gravarExtras, audit } = vi.hoisted(() => ({ gravarExtras: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/escale/conversas/respostas-banco", () => ({ gravarExtras }));
vi.mock("@/lib/audit", () => ({ audit }));

import { atualizarResposta, criarResposta, excluirResposta } from "@/lib/escale/conversas/respostas-escrita";

const ORG = "11111111-1111-4111-8111-111111111111";
const dados = { atalho: "fechamento", corpo: "PIX {{canal.pix_chave}}", canais: ["whatsapp" as const], compartilhar: true, todos_os_setores: true, setores: [] };

function banco(erro: { code?: string; message: string } | null = null, ativoExiste = false) {
  const escritas: Array<Record<string, unknown>> = [];
  const db = {
    from: () => {
      const q: Record<string, unknown> = {};
      q.insert = (v: Record<string, unknown>) => {
        escritas.push(v);
        return q;
      };
      q.update = (v: Record<string, unknown>) => {
        escritas.push(v);
        return q;
      };
      q.delete = () => q;
      q.select = () => q;
      q.eq = () => q;
      q.maybeSingle = async () => ({ data: ativoExiste ? { id: "a" } : null, error: null });
      q.single = async () => ({ data: erro ? null : { id: "t1" }, error: erro });
      q.then = (ok: (r: unknown) => unknown) => Promise.resolve({ error: erro }).then(ok);
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, escritas };
}

beforeEach(() => {
  gravarExtras.mockReset();
  audit.mockReset();
});

describe("criarResposta", () => {
  it("compartilhada: owner_user_id nulo, atalho gravado e organização do contexto", async () => {
    const { db, escritas } = banco();
    const r = await criarResposta(db, { organizationId: ORG, donoUserId: null, criadoPor: null, requestId: "req", dados });
    expect(r).toEqual({ ok: true, dado: { id: "t1" } });
    expect(escritas[0]).toMatchObject({ organization_id: ORG, owner_user_id: null, shortcut: "fechamento", title: "fechamento" });
    expect(gravarExtras).toHaveBeenCalledWith(db, ORG, "t1", dados);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "quick_reply.created" }));
  });

  it("42501 (RLS) vira forbidden 403", async () => {
    const { db } = banco({ code: "42501", message: "rls" });
    const r = await criarResposta(db, { organizationId: ORG, donoUserId: null, criadoPor: null, requestId: "req", dados });
    expect(r).toMatchObject({ ok: false, codigo: "forbidden", status: 403 });
  });

  it("falha ao gravar os extras vira internal_error", async () => {
    gravarExtras.mockRejectedValue(new Error("setor"));
    const { db } = banco();
    const r = await criarResposta(db, { organizationId: ORG, donoUserId: null, criadoPor: null, requestId: "req", dados });
    expect(r).toMatchObject({ ok: false, codigo: "internal_error", mensagem: "setor" });
  });
});

describe("atualizarResposta / excluirResposta", () => {
  it("atualiza com o dono informado e audita", async () => {
    const { db, escritas } = banco();
    const r = await atualizarResposta(db, { organizationId: ORG, id: "t1", donoUserId: "u1", atualizadoPor: "u1", requestId: "req", dados });
    expect(r.ok).toBe(true);
    expect(escritas[0]).toMatchObject({ owner_user_id: "u1", body: dados.corpo });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "quick_reply.updated" }));
  });
  it("exclui e audita", async () => {
    const { db } = banco();
    const r = await excluirResposta(db, { organizationId: ORG, id: "t1", excluidoPor: null, requestId: "req" });
    expect(r).toEqual({ ok: true, dado: { id: "t1" } });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "quick_reply.deleted" }));
  });
});

describe("anexo da resposta", () => {
  const ATIVO = "33333333-3333-4333-8333-333333333333";
  const entrada = { organizationId: ORG, donoUserId: null, criadoPor: null, requestId: "req" };

  it("arquivo que não existe na biblioteca da organização é recusado antes de gravar", async () => {
    const { db, escritas } = banco(null, false);
    const r = await criarResposta(db, { ...entrada, dados: { ...dados, anexo: { asset: ATIVO } } });
    expect(r).toMatchObject({ ok: false, codigo: "validation_failed", status: 422 });
    expect(escritas).toHaveLength(0);
    expect(gravarExtras).not.toHaveBeenCalled();
  });
  it("arquivo da biblioteca e var:<chave> passam", async () => {
    const { db } = banco(null, true);
    expect((await criarResposta(db, { ...entrada, dados: { ...dados, anexo: { asset: ATIVO } } })).ok).toBe(true);
    const outro = banco(null, false);
    expect((await criarResposta(outro.db, { ...entrada, dados: { ...dados, anexo: { asset: "var:bv1" } } })).ok).toBe(true);
  });
});
