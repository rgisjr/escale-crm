// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_EXECUCOES } from "@/app/api/v1/automacoes-da-casca/[id]/execucoes/route";
import { requireRole } from "@/lib/auth/require-role";
import type { LinhaDaExecucao } from "@/lib/escale/automacoes/insights/tipos";
import { comPublicacoes } from "@/lib/escale/comentarios/publicacoes-das-execucoes";
import { createClient } from "@/lib/supabase/server";
import { authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

/** Fase 10C: "Ver publicação" do Insights junta a publicação do disparo a cada execução (pelo run_id). */
const ID = "e5ca1e00-9802-4000-8000-0000000000a1";

const linha = (id: string): LinhaDaExecucao => ({
  id,
  status: "success",
  criadaEm: "2026-11-01T10:00:00Z",
  eventoId: null,
  resultados: [],
  contato: null,
  negocio: null,
});

function bancoDosDisparos(resposta: { data: unknown; error: { message: string } | null }) {
  const consultas: string[] = [];
  const sb = {
    from: (tabela: string) => {
      consultas.push(tabela);
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in"]) q[m] = () => q;
      q.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) =>
        Promise.resolve(resposta).then(ok, erro);
      return q;
    },
  } as unknown as SupabaseClient;
  return { sb, consultas };
}

describe("comPublicacoes", () => {
  it("sem linhas devolve [] sem consultar", async () => {
    const { sb, consultas } = bancoDosDisparos({ data: [], error: null });
    expect(await comPublicacoes(sb, "r1", [])).toEqual([]);
    expect(consultas).toHaveLength(0);
  });

  it("só a execução com disparo ganha publicação (link saneado); a outra fica null; a entrada não muda", async () => {
    const { sb } = bancoDosDisparos({
      data: [{ run_id: "x1", publicacao_legenda: "Meu reels", publicacao_link: "javascript:alert(1)" }],
      error: null,
    });
    const entrada = Object.freeze([Object.freeze(linha("x1")), Object.freeze(linha("x2"))]);
    const saida = await comPublicacoes(sb, "r1", entrada);
    expect(saida[0]?.publicacao).toEqual({ legenda: "Meu reels", link: null });
    expect(saida[1]?.publicacao).toBeNull();
    expect(entrada[0]).not.toHaveProperty("publicacao");
  });

  it("link válido passa", async () => {
    const { sb } = bancoDosDisparos({
      data: [{ run_id: "x1", publicacao_legenda: null, publicacao_link: "https://www.instagram.com/reel/abc/" }],
      error: null,
    });
    const [primeira] = await comPublicacoes(sb, "r1", [linha("x1")]);
    expect(primeira?.publicacao).toEqual({ legenda: null, link: "https://www.instagram.com/reel/abc/" });
  });

  it("erro lança", async () => {
    const { sb } = bancoDosDisparos({ data: null, error: { message: "boom" } });
    await expect(comPublicacoes(sb, "r1", [linha("x1")])).rejects.toBeTruthy();
  });
});

describe("GET /execucoes (10C)", () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockReset();
    vi.mocked(createClient).mockReset();
  });

  function banco(regra: Record<string, unknown>) {
    const tabelas: string[] = [];
    const db = {
      rpc: vi.fn(() =>
        Promise.resolve({
          data: {
            total: 1,
            linhas: [
              {
                id: "x1",
                status: "success",
                criada_em: "2026-11-01T10:00:00Z",
                evento_id: null,
                actions_result: [],
                contato: null,
                negocio: null,
              },
            ],
          },
          error: null,
        }),
      ),
      from: vi.fn((tabela: string) => {
        tabelas.push(tabela);
        const c: Record<string, unknown> = {};
        for (const m of ["select", "eq", "in"]) c[m] = vi.fn(() => c);
        c.maybeSingle = vi.fn().mockResolvedValue({ data: regra, error: null });
        c.then = (ok: (v: unknown) => unknown) =>
          Promise.resolve({
            data: [{ run_id: "x1", publicacao_legenda: "Reels", publicacao_link: "https://instagram.com/p/1" }],
            error: null,
          }).then(ok);
        return c;
      }),
    };
    vi.mocked(createClient).mockResolvedValue(db as never);
    return { db, tabelas };
  }
  const chamar = () =>
    GET_EXECUCOES(new NextRequest(new URL("/x", "http://x")), { params: Promise.resolve({ id: ID }) });

  it("regra de comentário: as linhas voltam com publicacao", async () => {
    authOk("manager");
    const { tabelas } = banco({ id: ID, name: "R", actions: [], trigger_event: "comment.received" });
    const r = await chamar();
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.data.linhas[0].publicacao).toEqual({ legenda: "Reels", link: "https://instagram.com/p/1" });
    expect(tabelas).toContain("escale_disparos_de_comentario");
  });

  it("outra regra: não consulta os disparos e a linha segue como hoje", async () => {
    authOk("manager");
    const { tabelas } = banco({ id: ID, name: "R", actions: [], trigger_event: "lead.created" });
    const corpo = await (await chamar()).json();
    expect(corpo.data.linhas[0]).not.toHaveProperty("publicacao");
    expect(tabelas).not.toContain("escale_disparos_de_comentario");
  });
});
