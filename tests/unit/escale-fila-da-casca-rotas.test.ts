import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as TOTAL } from "@/app/api/v1/fila-da-casca/total/route";
import { GET as TEM_GRUPOS } from "@/app/api/v1/fila-da-casca/tem-grupos/route";
import { GET as FILA } from "@/app/api/v1/fila-da-casca/route";
import {
  codificarCursor,
  decodificarCursor,
  lerPaginaDaFila,
} from "@/lib/escale/conversas/fila-banco";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/escale/contatos/lista", () => ({
  fusoDaOrganizacao: vi.fn(async () => "America/Sao_Paulo"),
}));
vi.mock("@/lib/users/com-nome-do-atendente", () => ({
  comNomeDoAtendente: vi.fn(async (c: unknown[]) => c),
}));

/** O builder do rpc: registra a chamada, o select e as ordens; devolve as linhas. */
function bancoDaFila(linhas: Array<Record<string, unknown>>, total = 0) {
  const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = [];
  const ordens: string[] = [];
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn((col: string) => {
      ordens.push(col);
      return builder;
    }),
    then: (ok: (r: unknown) => unknown) => Promise.resolve({ data: linhas, error: null }).then(ok),
  };
  const rpc = vi.fn((nome: string, args: Record<string, unknown>) => {
    chamadas.push({ nome, args });
    if (nome === "fn_escale_fila_tem_grupos") return Promise.resolve({ data: total > 0, error: null });
    return nome === "fn_escale_contar_fila_da_casca"
      ? Promise.resolve({ data: total, error: null })
      : builder;
  });
  return { db: { rpc }, chamadas, ordens };
}

beforeEach(() => authOk("agent"));

describe("cursor", () => {
  it("vai e volta, e lixo vira nulo", () => {
    const c = { sort: "2026-10-18T10:00:00Z", id: "x" };
    expect(decodificarCursor(codificarCursor(c))).toEqual(c);
    expect(decodificarCursor("lixo")).toBeNull();
  });
});

describe("lerPaginaDaFila", () => {
  it("pede uma a mais, devolve o cursor da última e repete a ordem no builder", async () => {
    const linhas = [
      { id: "a", last_message_at: "2026-10-18T12:00:00Z" },
      { id: "b", last_message_at: "2026-10-18T11:00:00Z" },
      { id: "c", last_message_at: "2026-10-18T10:00:00Z" },
    ];
    const { db, chamadas, ordens } = bancoDaFila(linhas);
    const r = await lerPaginaDaFila(db as never, ORG_ID, { fuso: "UTC" }, "interacao", null, 2);
    expect(chamadas[0]).toMatchObject({
      nome: "fn_escale_fila_da_casca",
      args: { p_org: ORG_ID, p_ordem: "interacao", p_limite: 3, p_depois_id: null },
    });
    expect(ordens).toEqual(["last_message_at", "id"]);
    expect(r.conversas.map((c) => c.id)).toEqual(["a", "b"]);
    expect(r.has_more).toBe(true);
    expect(decodificarCursor(r.cursor!)).toEqual({ sort: "2026-10-18T11:00:00Z", id: "b" });
  });

  it("na ordem da espera, a régua é awaiting_since e o cursor nulo pagina só por id", async () => {
    const { db, chamadas, ordens } = bancoDaFila([]);
    await lerPaginaDaFila(
      db as never,
      ORG_ID,
      { fuso: "UTC" },
      "espera",
      { sort: null, id: "z" },
      50,
    );
    expect(ordens).toEqual(["awaiting_since", "id"]);
    expect(chamadas[0]!.args).toMatchObject({
      p_depois_sort: null,
      p_depois_id: "z",
      p_depois_nulo: true,
    });
  });
});

describe("as rotas", () => {
  it("GET compila o painel com o fuso e a busca", async () => {
    const { db, chamadas } = bancoDaFila([{ id: "a", last_message_at: null }]);
    vi.mocked(createClient).mockResolvedValue(db as never);
    const f = encodeURIComponent(JSON.stringify({ conversas: { status: ["em_espera"] } }));
    const r = await FILA(new NextRequest(`http://x/api/v1/fila-da-casca?f=${f}&q=maria&o=espera`));
    expect(r.status).toBe(200);
    expect(chamadas[0]!.args.p_filtros).toEqual({
      fuso: "America/Sao_Paulo",
      status: ["em_espera"],
      busca: { padrao: "%maria%", digitos: null },
    });
    expect(chamadas[0]!.args.p_ordem).toBe("espera");
  });

  it("f inválido = 422", async () => {
    vi.mocked(createClient).mockResolvedValue(bancoDaFila([]).db as never);
    const r = await FILA(new NextRequest("http://x/api/v1/fila-da-casca?f=%7Bx"));
    expect(r.status).toBe(422);
  });

  it("o total", async () => {
    vi.mocked(createClient).mockResolvedValue(bancoDaFila([], 56128).db as never);
    const r = await TOTAL(new NextRequest("http://x/api/v1/fila-da-casca/total"));
    expect(((await r.json()) as { data: { total: number } }).data.total).toBe(56128);
  });

  it("tem-grupos: pergunta ao banco só da organização, sem contar", async () => {
    const banco = bancoDaFila([], 3);
    vi.mocked(createClient).mockResolvedValue(banco.db as never);
    const r = await TEM_GRUPOS();
    expect(((await r.json()) as { data: { temGrupos: boolean } }).data.temGrupos).toBe(true);
    expect(banco.chamadas).toEqual([{ nome: "fn_escale_fila_tem_grupos", args: { p_org: ORG_ID } }]);
  });
});
