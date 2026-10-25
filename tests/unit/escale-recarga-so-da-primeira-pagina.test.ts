import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { invalidarTotalDaFila } from "@/hooks/escale/useTotalDaFila";
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

describe("recarga com 'Carregar mais' em voo (ponto médio da revisão final)", () => {
  it("espera a busca da lista terminar antes de trocar a primeira página", async () => {
    const { qc } = montar();
    const q = qc.getQueryCache().find({ queryKey: CHAVE })!;
    q.state = { ...q.state, fetchStatus: "fetching" };
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: "novo" }] });
    recarregarListasDasConversas(qc);
    await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
    await new Promise((ok) => setTimeout(ok, 60));
    const durante = qc.getQueryData<{ pages: Array<{ data: Array<{ id: string }> }> }>(CHAVE)!;
    expect(durante.pages[0]!.data[0]!.id).toBe("a");
    q.state = { ...q.state, fetchStatus: "idle" };
    await vi.waitFor(() => {
      const d = qc.getQueryData<{ pages: Array<{ data: Array<{ id: string }> }> }>(CHAVE)!;
      expect(d.pages.map((p) => p.data[0]?.id)).toEqual(["novo", "b", "c"]);
    });
  });
});

describe("invalidarTotalDaFila", () => {
  it("marca o total como velho sem refazer a contagem", async () => {
    const qc = new QueryClient();
    const contar = vi.fn(async () => 7);
    qc.setQueryData(["fila-total", ""], 7);
    qc.getQueryCache().find({ queryKey: ["fila-total", ""] })!.setOptions({ queryKey: ["fila-total", ""], queryFn: contar });
    invalidarTotalDaFila(qc);
    expect(qc.getQueryState(["fila-total", ""])?.isInvalidated).toBe(true);
    expect(contar).not.toHaveBeenCalled();
  });
});
