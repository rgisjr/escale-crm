import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { recarregarListasDasConversas } from "@/hooks/inbox/recargaDasConversas";
import { apiClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));

const URL1 = "/api/v1/fila-da-casca?limit=50";
const CHAVE = ["conversations", { casca: true, ordem: "interacao" }] as const;

beforeEach(() => vi.mocked(apiClient.get).mockReset());

/** Monta a fila com 3 páginas carregadas e alguém "olhando" (observador). */
function montar() {
  const qc = new QueryClient();
  const queryFn = vi.fn(async () => ({ data: [{ id: "x" }] }));
  qc.setQueryData(CHAVE, {
    pages: [{ data: [{ id: "a" }] }, { data: [{ id: "b" }] }, { data: [{ id: "c" }] }],
    pageParams: [undefined, "p2", "p3"],
  });
  const obs = qc.getQueryCache().find({ queryKey: CHAVE })!;
  obs.setOptions({ queryKey: CHAVE, queryFn, meta: { urlDaPrimeiraPagina: URL1 } });
  vi.spyOn(obs, "getObserversCount").mockReturnValue(1);
  qc.setQueryData(["fila-total", ""], 7);
  return { qc, queryFn };
}

describe("recarregarListasDasConversas (B1-19)", () => {
  it("refaz só a primeira página da fila, mantém as outras e não toca no total", async () => {
    const { qc, queryFn } = montar();
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: "novo" }] });
    recarregarListasDasConversas(qc);
    await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
    expect(apiClient.get).toHaveBeenCalledWith(URL1);
    await vi.waitFor(() => {
      const d = qc.getQueryData<{ pages: Array<{ data: Array<{ id: string }> }> }>(CHAVE)!;
      expect(d.pages.map((p) => p.data[0]?.id)).toEqual(["novo", "b", "c"]);
    });
    expect(queryFn).not.toHaveBeenCalled();
    expect(qc.getQueryState(["fila-total", ""])?.isInvalidated).toBe(false);
  });
});
