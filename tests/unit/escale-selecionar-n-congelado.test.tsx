import { act, renderHook, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/lista-de-contatos/primeiros/route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { useSelecaoDaLista } from "@/hooks/escale/useSelecaoDaLista";
import { authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const IDS = ["a0000000-0000-4000-8000-000000000001", "a0000000-0000-4000-8000-000000000002"];

/** Supabase de mentira: a RPC devolve as linhas já ordenadas e o `.range` corta. */
function banco(linhas: Array<{ contact_id: string; last_activity_at: string | null }>) {
  const cadeia: Record<string, unknown> = {};
  cadeia.order = vi.fn(() => cadeia);
  cadeia.range = vi.fn((de: number, ate: number) =>
    Promise.resolve({ data: linhas.slice(de, ate + 1), error: null }),
  );
  const rpc = vi.fn(() => cadeia);
  const from = vi.fn(() => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: { timezone: "America/Sao_Paulo" } }) }),
    }),
  }));
  vi.mocked(createClient).mockResolvedValue({ rpc, from } as never);
  return { rpc, cadeia };
}
const pedido = (qs: string) => new NextRequest(`http://x/api/v1/lista-de-contatos/primeiros?${qs}`);

describe("GET /api/v1/lista-de-contatos/primeiros", () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockReset();
    authOk("manager");
  });

  it("devolve os N primeiros ids na ordem da lista, da organização da sessão", async () => {
    const { rpc, cadeia } = banco(
      IDS.map((contact_id) => ({ contact_id, last_activity_at: null })),
    );
    const r = await GET(pedido("v=todos&quantidade=2"));
    expect(r.status).toBe(200);
    expect(((await r.json()) as { data: { ids: string[] } }).data.ids).toEqual(IDS);
    expect(vi.mocked(requireRole).mock.calls[0]![0]).toBe("manager");
    expect(rpc).toHaveBeenCalledWith(
      "fn_escale_contatos_do_filtro",
      expect.objectContaining({ p_visao: "todos" }),
    );
    expect(cadeia.order).toHaveBeenCalledWith("last_activity_at", {
      ascending: false,
      nullsFirst: false,
    });
    expect(cadeia.range).toHaveBeenCalledWith(0, 1);
  });

  it("recusa quantidade fora de 1..1.000 e filtro inválido", async () => {
    banco([]);
    expect((await GET(pedido("v=todos&quantidade=1001"))).status).toBe(422);
    expect((await GET(pedido("v=todos&quantidade=0"))).status).toBe(422);
    expect((await GET(pedido("v=todos&quantidade=5&f=nao-e-json"))).status).toBe(422);
  });
});

describe("Selecionar [N] congela os ids (B3-1)", () => {
  const base = { linhas: [{ id: "x" }], total: 50, primeiro: 0 };

  it("até 1.000 e abaixo do total, resolve os ids no clique e a seleção vira por ids", async () => {
    const resolverPrimeiros = vi.fn(async () => IDS);
    const { result } = renderHook(() =>
      useSelecaoDaLista({ ...base, chaveDaConsulta: "c1", resolverPrimeiros }),
    );
    act(() => result.current.selecionarQuantidade(2));
    await waitFor(() => expect(result.current.selecao).toEqual({ tipo: "ids", ids: IDS }));
    expect(resolverPrimeiros).toHaveBeenCalledWith(2);
  });

  it("N ≥ total segue como 'todos', sem consultar", () => {
    const resolverPrimeiros = vi.fn(async () => IDS);
    const { result } = renderHook(() =>
      useSelecaoDaLista({ ...base, chaveDaConsulta: "c1", resolverPrimeiros }),
    );
    act(() => result.current.selecionarQuantidade(50));
    expect(result.current.selecao.tipo).toBe("todos");
    expect(resolverPrimeiros).not.toHaveBeenCalled();
  });

  it("acima de 1.000 segue por quantidade (não cabe numa seleção por ids)", () => {
    const resolverPrimeiros = vi.fn(async () => IDS);
    const { result } = renderHook(() =>
      useSelecaoDaLista({ ...base, total: 5000, chaveDaConsulta: "c1", resolverPrimeiros }),
    );
    act(() => result.current.selecionarQuantidade(2000));
    expect(result.current.selecao).toMatchObject({ tipo: "todos", quantidade: 2000 });
    expect(resolverPrimeiros).not.toHaveBeenCalled();
  });

  it("se a consulta mudou até a resposta chegar, a resposta velha é descartada", async () => {
    let resolver: (ids: string[]) => void = () => {};
    const resolverPrimeiros = vi.fn(() => new Promise<string[]>((r) => (resolver = r)));
    const { result, rerender } = renderHook(
      ({ chave }) => useSelecaoDaLista({ ...base, chaveDaConsulta: chave, resolverPrimeiros }),
      { initialProps: { chave: "c1" } },
    );
    act(() => result.current.selecionarQuantidade(2));
    rerender({ chave: "c2" });
    await act(async () => resolver(IDS));
    expect(result.current.selecao).toEqual({ tipo: "ids", ids: [] });
  });

  it("se a resolução falha, avisa e deixa a seleção como estava", async () => {
    const aoFalharAoResolver = vi.fn();
    const resolverPrimeiros = vi.fn(async () => {
      throw new Error("rede");
    });
    const { result } = renderHook(() =>
      useSelecaoDaLista({ ...base, chaveDaConsulta: "c1", resolverPrimeiros, aoFalharAoResolver }),
    );
    act(() => result.current.selecionarQuantidade(2));
    await waitFor(() => expect(aoFalharAoResolver).toHaveBeenCalled());
    expect(result.current.selecao).toEqual({ tipo: "ids", ids: [] });
  });
});
