import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMudarEmpresa } from "@/hooks/escale/useEmpresa";
import { useMesclar, useMesclarEmMassa } from "@/hooks/escale/useSugestoesDeMescla";

/** Q3 (B3-3, B9-6, G3-10, G9-5): mesclar e editar empresa invalidam só as chaves afetadas. */
function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const espia = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { espia, wrapper };
}
const chaves = (espia: ReturnType<typeof montar>["espia"]) => espia.mock.calls.map((c) => c[0]?.queryKey?.[0]);

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ data: { mesclados: [], falhas: [], contato_id: "a" } })),
  );
});

describe("invalidação focada (Q3)", () => {
  it("useMesclar nunca invalida sem chave", async () => {
    const { espia, wrapper } = montar();
    const { result } = renderHook(() => useMesclar(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ principal_id: "a", secundarios: ["b"], escolhas: {} as never });
    });
    await waitFor(() => expect(espia).toHaveBeenCalled());
    expect(espia.mock.calls.every((c) => Array.isArray(c[0]?.queryKey))).toBe(true);
    expect(chaves(espia)).toEqual(expect.arrayContaining(["contacts", "contact", "sugestoes-de-mescla", "companies", "empresa-do-contato"]));
  });

  it("useMesclarEmMassa nunca invalida sem chave", async () => {
    const { espia, wrapper } = montar();
    const { result } = renderHook(() => useMesclarEmMassa(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ grupos: [["a", "b"]], prioridade: "mais_completo" as never });
    });
    await waitFor(() => expect(espia).toHaveBeenCalled());
    expect(espia.mock.calls.every((c) => Array.isArray(c[0]?.queryKey))).toBe(true);
  });

  it("editar um campo da empresa invalida a empresa e os contatos da lista, não todos os 'companies'", async () => {
    const { espia, wrapper } = montar();
    const { result } = renderHook(() => useMudarEmpresa("emp-1"), { wrapper });
    await act(async () => {
      await result.current.mudarCampo.mutateAsync({ chave: "nome", valor: "X" });
    });
    const filtros = espia.mock.calls.map((c) => c[0]?.queryKey);
    expect(filtros).toContainEqual(["companies", "emp-1"]);
    expect(filtros).toContainEqual(["companies", "lista-da-casca"]);
    expect(filtros).not.toContainEqual(["companies"]);
    expect(filtros).toContainEqual(["contacts"]);
  });
});

describe("catálogo de campos por objeto (B3-4)", () => {
  it("criar campo de outro objeto invalida o catálogo do objeto escolhido, não só o da aba", async () => {
    const { useMudarCatalogo } = await import("@/hooks/escale/useCatalogoDeCampos");
    const { espia, wrapper } = montar();
    const { result } = renderHook(() => useMudarCatalogo("contato"), { wrapper });
    await act(async () => {
      await result.current.criarCampo.mutateAsync({ objeto: "empresa", nome: "X", grupo_id: "g", tipo: "TEXT" } as never);
    });
    const filtros = espia.mock.calls.map((c) => c[0]?.queryKey);
    expect(filtros).toContainEqual(["catalogo-de-campos", "empresa"]);
  });

  it("criar grupo para outro objeto manda o objeto escolhido e invalida o catálogo dele", async () => {
    const { useMudarCatalogo } = await import("@/hooks/escale/useCatalogoDeCampos");
    const { espia, wrapper } = montar();
    const { result } = renderHook(() => useMudarCatalogo("contato"), { wrapper });
    await act(async () => {
      await result.current.criarGrupo.mutateAsync({ nome: "G", objeto: "negocio" });
    });
    const corpo = JSON.parse(String((vi.mocked(fetch).mock.calls.at(-1)?.[1] as RequestInit).body));
    expect(corpo).toEqual({ objeto: "negocio", nome: "G" });
    expect(espia.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual(["catalogo-de-campos", "negocio"]);
  });

  it("criar campo de negócio recarrega catálogo, funis e quadro (a definição vem do pipeline), não os contatos (Frente E)", async () => {
    const { useMudarCatalogo } = await import("@/hooks/escale/useCatalogoDeCampos");
    const { espia, wrapper } = montar();
    const { result } = renderHook(() => useMudarCatalogo("negocio"), { wrapper });
    await act(async () => {
      await result.current.criarCampo.mutateAsync({ objeto: "negocio", nome: "X", grupo_id: "g", tipo: "TEXT" } as never);
    });
    const filtros = espia.mock.calls.map((c) => c[0]?.queryKey);
    expect(filtros).toContainEqual(["catalogo-de-campos", "negocio"]);
    expect(filtros).toContainEqual(["pipelines"]);
    expect(filtros).toContainEqual(["board"]);
    expect(filtros).not.toContainEqual(["contact"]);
  });
});
