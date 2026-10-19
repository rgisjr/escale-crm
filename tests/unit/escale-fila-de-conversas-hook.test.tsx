import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({
  useRealtimeChannel: () => ({ status: "SUBSCRIBED", ultimaEntrega: { current: null } }),
}));
vi.mock("@/hooks/realtime/useRefetchDeSeguranca", () => ({
  useRefetchDeSeguranca: () => ({ divergencias: 0 }),
}));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

import { chaveDaFila, urlDaFila, useFilaDeConversas } from "@/hooks/escale/useFilaDeConversas";
import { useModoEspiao } from "@/hooks/escale/useModoEspiao";
import {
  useGravarPreferencia,
  usePreferenciasDeConversas,
} from "@/hooks/escale/usePreferenciasDeConversas";

const envolver = (qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

describe("useFilaDeConversas", () => {
  it("monta a URL da fila da casca com o painel, a busca, a ordem, o cursor e limit 50", () => {
    expect(
      urlDaFila(
        { painel: { conversas: { status: ["em_espera"] } }, ordem: "espera", busca: "neto" },
        "abc",
      ),
    ).toBe(
      `/api/v1/fila-da-casca?f=${encodeURIComponent('{"conversas":{"status":["em_espera"]}}')}&q=neto&o=espera&cursor=abc&limit=50`,
    );
    expect(urlDaFila({ painel: {}, ordem: "interacao" })).toBe("/api/v1/fila-da-casca?limit=50");
    expect(chaveDaFila({ painel: {}, ordem: "interacao" })).toEqual([
      "conversations",
      { casca: true, painel: {}, ordem: "interacao" },
    ]);
  });

  it("lê a lista e pagina pelo cursor", async () => {
    api.get.mockResolvedValueOnce({ data: [{ id: "c1" }], meta: { cursor: "x", has_more: true } });
    const { result } = renderHook(
      () => useFilaDeConversas({ painel: {}, ordem: "interacao" }, "org1"),
      { wrapper: envolver() },
    );
    await waitFor(() => expect(result.current.data?.pages[0]?.data).toEqual([{ id: "c1" }]));
    expect(result.current.hasNextPage).toBe(true);
    expect(api.get).toHaveBeenCalledWith("/api/v1/fila-da-casca?limit=50");
  });
});

describe("usePreferenciasDeConversas", () => {
  it("vale o padrão enquanto carrega e grava otimista por chave", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        preferencias: {
          visualizacao: {
            campos: {
              atendente: true,
              empresa: false,
              setor: false,
              tempoSemResposta: false,
              mensagensAgendadas: false,
              tags: false,
              permissaoDeChamada: true,
            },
            limites: {
              amarelo: { valor: 1, unidade: "horas" },
              vermelho: { valor: 4, unidade: "horas" },
            },
          },
          campos_do_negocio: ["status"],
          secoes: {
            atividades: true,
            contato: true,
            negocio: true,
            empresa: true,
            notas: false,
            anexos: true,
            historico: true,
            conversas: true,
          },
        },
      },
    });
    api.put.mockResolvedValueOnce({ data: { preferencias: {} } });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => ({ prefs: usePreferenciasDeConversas(), gravar: useGravarPreferencia() }),
      { wrapper: envolver(qc) },
    );
    expect(result.current.prefs.data.secoes.notas).toBe(true);
    await waitFor(() => expect(result.current.prefs.data.secoes.notas).toBe(false));
    expect(result.current.prefs.data.campos_do_negocio).toEqual(["status"]);
    act(() => {
      result.current.gravar.mutate({ chave: "secoes", valor: { notas: true } });
    });
    await waitFor(() => expect(result.current.prefs.data.secoes.notas).toBe(true));
    expect(api.put).toHaveBeenCalledWith("/api/v1/preferencias-de-conversas", {
      chave: "secoes",
      valor: { notas: true },
    });
  });
});

describe("useModoEspiao", () => {
  it("lê a sessão, muda e avisa os outros", () => {
    window.sessionStorage.removeItem("escale_modo_espiao");
    const a = renderHook(() => useModoEspiao());
    const b = renderHook(() => useModoEspiao());
    expect(a.result.current[0]).toBe(false);
    act(() => a.result.current[1](true));
    expect(a.result.current[0]).toBe(true);
    expect(b.result.current[0]).toBe(true);
    expect(window.sessionStorage.getItem("escale_modo_espiao")).toBe("1");
    act(() => b.result.current[1](false));
    expect(a.result.current[0]).toBe(false);
  });
});
