import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import {
  chaveDosComentarios,
  tirarComentarioDaCache,
  trocarComentarioNaCache,
  useComentariosDaPublicacao,
  useContasDaCaixa,
  usePublicacoesDaCaixa,
  type PaginaDeComentarios,
} from "@/hooks/escale/useComentarios";
import {
  useApagarComentario,
  useDirectDoComentario,
  useOcultarComentario,
} from "@/hooks/escale/useAcoesNoComentario";
import { ApiError } from "@/lib/api/types";
import type { ComentarioDaCaixa } from "@/lib/escale/comentarios/caixa";

/** Fase 10A: os hooks da caixa de comentários. */
const comentario = (id: string, extra: Partial<ComentarioDaCaixa> = {}): ComentarioDaCaixa => ({
  id,
  texto: "oi",
  comentadoEm: "2026-11-02T10:00:00Z",
  autor: { id: "u1", usuario: "ana", nome: "Ana", foto: null, daPropriaConta: false },
  oculto: false,
  curtido: null,
  curtidas: null,
  respostas: [],
  respondido: false,
  contato: null,
  direct: { liberado: true },
  ...extra,
});
const pagina = (comentarios: ComentarioDaCaixa[], proximo: string | null = null): InfiniteData<PaginaDeComentarios> => ({
  pages: [{ comentarios, proximo }],
  pageParams: [null],
});

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  api.get.mockReset();
  api.post.mockReset();
  api.delete.mockReset();
});

describe("leitura", () => {
  it("useContasDaCaixa lê as contas", async () => {
    api.get.mockResolvedValue({ data: { contas: [{ id: "c1" }] } });
    const { result } = renderHook(() => useContasDaCaixa(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: "c1" }]));
    expect(api.get).toHaveBeenCalledWith("/api/v1/escale/comentarios/contas");
  });

  it("usePublicacoesDaCaixa fica desligado sem canal e manda o cursor ao paginar", async () => {
    const semCanal = renderHook(() => usePublicacoesDaCaixa(null, { periodo: "30d", ordem: "recentes" }), { wrapper });
    expect(semCanal.result.current.fetchStatus).toBe("idle");
    expect(api.get).not.toHaveBeenCalled();

    api.get.mockResolvedValueOnce({ data: { publicacoes: [{ id: "p1" }], proximo: "cur-2" } });
    api.get.mockResolvedValueOnce({ data: { publicacoes: [{ id: "p2" }], proximo: null } });
    const { result } = renderHook(() => usePublicacoesDaCaixa("canal-1", { periodo: "7d", ordem: "mais_comentarios" }), { wrapper });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    expect(api.get.mock.calls[0]?.[0]).toBe("/api/v1/escale/comentarios/caixa?canal=canal-1&periodo=7d&ordem=mais_comentarios");
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(api.get.mock.calls[1]?.[0]).toContain("cursor=cur-2");
  });

  it("useComentariosDaPublicacao fica desligado sem publicação e codifica o id", async () => {
    const sem = renderHook(() => useComentariosDaPublicacao("canal-1", null), { wrapper });
    expect(sem.result.current.fetchStatus).toBe("idle");
    api.get.mockResolvedValue({ data: { comentarios: [], proximo: null } });
    renderHook(() => useComentariosDaPublicacao("canal-1", "p/1"), { wrapper });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get.mock.calls[0]?.[0]).toBe("/api/v1/escale/comentarios/caixa/p%2F1?canal=canal-1");
  });
});

describe("cache", () => {
  it("trocarComentarioNaCache acha respostas e não muta", () => {
    const dados = pagina([comentario("c1", { respostas: [comentario("r1")] })]);
    const antes = JSON.stringify(dados);
    const novo = trocarComentarioNaCache(dados, "r1", (c) => ({ ...c, oculto: true }));
    expect(novo?.pages[0]?.comentarios[0]?.respostas[0]?.oculto).toBe(true);
    expect(JSON.stringify(dados)).toBe(antes);
    expect(trocarComentarioNaCache(undefined, "x", (c) => c)).toBeUndefined();
  });

  it("tirarComentarioDaCache tira pai ou resposta sem mutar", () => {
    const dados = pagina([comentario("c1", { respostas: [comentario("r1")] }), comentario("c2")]);
    expect(tirarComentarioDaCache(dados, "c1")?.pages[0]?.comentarios.map((c) => c.id)).toEqual(["c2"]);
    expect(tirarComentarioDaCache(dados, "r1")?.pages[0]?.comentarios[0]?.respostas).toEqual([]);
    expect(dados.pages[0]?.comentarios).toHaveLength(2);
  });
});

describe("mutações", () => {
  const CANAL = "canal-1";
  const PUB = "post-1";
  const semear = (...cs: ComentarioDaCaixa[]) => qc.setQueryData(chaveDosComentarios(CANAL, PUB), pagina(cs));
  const ler = () => qc.getQueryData<InfiniteData<PaginaDeComentarios>>(chaveDosComentarios(CANAL, PUB))?.pages[0]?.comentarios;

  it("ocultar é otimista e volta no erro", async () => {
    const c = comentario("c1");
    semear(c);
    let rejeitar: (e: unknown) => void = () => {};
    api.post.mockReturnValue(new Promise((_ok, ko) => (rejeitar = ko)));
    const { result } = renderHook(() => useOcultarComentario(CANAL, PUB), { wrapper });
    act(() => result.current.mutate({ comentario: c, ocultar: true }));
    await waitFor(() => expect(ler()?.[0]?.oculto).toBe(true));
    await act(async () => rejeitar(new ApiError(502, "provedor_indisponivel", undefined, "r")));
    await waitFor(() => expect(ler()?.[0]?.oculto).toBe(false));
  });

  it("reexibir chama o DELETE com a query", async () => {
    const c = comentario("c1", { oculto: true });
    semear(c);
    api.delete.mockResolvedValue({ data: { oculto: false } });
    const { result } = renderHook(() => useOcultarComentario(CANAL, PUB), { wrapper });
    await act(async () => result.current.mutateAsync({ comentario: c, ocultar: false }));
    expect(api.delete.mock.calls[0]?.[0]).toBe("/api/v1/escale/comentarios/c1/ocultar?canal=canal-1&publicacao=post-1&autor=u1");
    expect(ler()?.[0]?.oculto).toBe(false);
  });

  it("direct marca ja_usado no sucesso e no 409", async () => {
    const c = comentario("c1");
    semear(c);
    api.post.mockResolvedValueOnce({ data: { conversationId: "conv-1" } });
    const { result } = renderHook(() => useDirectDoComentario(CANAL, PUB), { wrapper });
    await act(async () => result.current.mutateAsync({ comentario: c, texto: "Oi" }));
    expect(ler()?.[0]?.direct).toEqual({ liberado: false, motivo: "ja_usado" });
    expect(api.post.mock.calls[0]?.[1]).toMatchObject({ canal: CANAL, publicacao: PUB, texto: "Oi", comentadoEm: c.comentadoEm });

    const outro = comentario("c2");
    semear(outro);
    api.post.mockRejectedValueOnce(new ApiError(409, "resposta_privada_ja_usada", undefined, "r"));
    await act(async () => {
      await result.current.mutateAsync({ comentario: outro, texto: "Oi" }).catch(() => undefined);
    });
    expect(ler()?.[0]?.direct).toEqual({ liberado: false, motivo: "ja_usado" });
  });

  it("apagar tira da cache só no sucesso", async () => {
    const c = comentario("c1");
    semear(c, comentario("c2"));
    api.delete.mockRejectedValueOnce(new ApiError(502, "provedor_indisponivel", undefined, "r"));
    const { result } = renderHook(() => useApagarComentario(CANAL, PUB), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ comentario: c }).catch(() => undefined);
    });
    expect(ler()).toHaveLength(2);
    api.delete.mockResolvedValueOnce({ data: { apagado: true } });
    await act(async () => result.current.mutateAsync({ comentario: c }));
    expect(ler()?.map((x) => x.id)).toEqual(["c2"]);
  });
});
