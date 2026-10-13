/**
 * `usaTelaGrande` É O QUE DECIDE MONTAR SÓ UM CABEÇALHO NA CASCA NOVA.
 *
 * Antes deste hook, `AppShell.tsx` montava `MenuDoTopo` E `TopBar` ao mesmo
 * tempo quando `menu === "topo"`, escondendo um dos dois só com CSS
 * (`md:flex` / `md:hidden`). Os dois ficavam na árvore React sempre — e como
 * `AlertsBell` toca som por instância e `SearchTrigger`/`AvisoDePropostaEmDestaque`
 * usam portal para `document.body` (que escapa do `display:none` do pai), o
 * efeito colateral duplicava de verdade: som duas vezes, dois diálogos de
 * busca no mesmo `mod+k`, o aviso de proposta reaparecendo depois de dispensado.
 *
 * Este arquivo testa só o hook — a fonte da decisão — com `renderHook`.
 * `AppShell` em si não é montado aqui: ele arrasta `useSinalDePresenca`,
 * `useInboundMessageAlerts`, `useInboundCallAlerts`, `useCrmAlerts` e outros,
 * que pertencem a outros testes.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usaTelaGrande } from "@/lib/escale/usa-tela-grande";

type OuvinteDeMudanca = (evento: { matches: boolean }) => void;

/** Stub de `matchMedia` que guarda o ouvinte para disparar manualmente a troca. */
function stubMatchMedia(telaGrandeNoInicio: boolean) {
  let matches = telaGrandeNoInicio;
  let ouvinte: OuvinteDeMudanca | null = null;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_evento: string, cb: OuvinteDeMudanca) => {
      ouvinte = cb;
    },
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  return {
    dispararMudanca: (novoValor: boolean) => {
      matches = novoValor;
      ouvinte?.({ matches: novoValor });
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usaTelaGrande", () => {
  it("devolve true quando a media query de 768px já bate no primeiro render", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => usaTelaGrande());
    expect(result.current).toBe(true);
  });

  it("devolve false quando a tela é estreita", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => usaTelaGrande());
    expect(result.current).toBe(false);
  });

  it("acompanha a mudança de largura depois de montado (resize/rotação)", () => {
    const { dispararMudanca } = stubMatchMedia(false);
    const { result } = renderHook(() => usaTelaGrande());
    expect(result.current).toBe(false);

    act(() => dispararMudanca(true));
    expect(result.current).toBe(true);

    act(() => dispararMudanca(false));
    expect(result.current).toBe(false);
  });
});
