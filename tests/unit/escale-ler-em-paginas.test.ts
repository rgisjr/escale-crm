import { describe, expect, it, vi } from "vitest";

import { lerEmPaginas } from "@/lib/escale/quadro/ler-em-paginas";

/** Banco de mentira que corta cada resposta em `maximo` linhas, como o PostgREST. */
function tabela(total: number, maximo = 1000) {
  const linhas = Array.from({ length: total }, (_, i) => ({ id: i }));
  return vi.fn(async (de: number, ate: number) => ({
    data: linhas.slice(de, Math.min(ate + 1, de + maximo)),
    error: null,
  }));
}

describe("lerEmPaginas", () => {
  it("traz todas as linhas quando passam do corte de 1.000 do PostgREST", async () => {
    const lerPagina = tabela(2350);
    const { data, error } = await lerEmPaginas(lerPagina);
    expect(error).toBeNull();
    expect(data).toHaveLength(2350);
    expect(data?.at(-1)).toEqual({ id: 2349 });
    expect(lerPagina).toHaveBeenCalledTimes(3);
  });

  it("uma só página quando cabe, sem pedir a seguinte", async () => {
    const lerPagina = tabela(40);
    const { data } = await lerEmPaginas(lerPagina);
    expect(data).toHaveLength(40);
    expect(lerPagina).toHaveBeenCalledTimes(1);
  });

  it("uma tabela exatamente do tamanho da página pede uma página extra vazia", async () => {
    const lerPagina = tabela(1000);
    const { data } = await lerEmPaginas(lerPagina);
    expect(data).toHaveLength(1000);
    expect(lerPagina).toHaveBeenCalledTimes(2);
  });

  it("devolve o erro da página sem entregar linhas parciais", async () => {
    const lerPagina = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i })),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: "caiu" } });
    const { data, error } = await lerEmPaginas(lerPagina);
    expect(data).toBeNull();
    expect(error?.message).toBe("caiu");
  });
});
