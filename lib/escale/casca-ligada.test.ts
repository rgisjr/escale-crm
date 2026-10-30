import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ATRIBUTO_DA_CASCA,
  cascaLigada,
  useCascaLigada,
  useMarcarCascaNoDocumento,
} from "./casca-ligada";

afterEach(() => {
  document.documentElement.removeAttribute(ATRIBUTO_DA_CASCA);
});

describe("a casca ligada, vista de fora do AppShell", () => {
  it("sem marca no <html>, a casca está desligada", () => {
    expect(cascaLigada()).toBe(false);
  });

  it("o menu do topo marca o <html> e desmarca ao sair", () => {
    const { unmount } = renderHook(() => useMarcarCascaNoDocumento(true));
    expect(cascaLigada()).toBe(true);
    unmount();
    expect(cascaLigada()).toBe(false);
  });

  it("o menu lateral não marca", () => {
    renderHook(() => useMarcarCascaNoDocumento(false));
    expect(cascaLigada()).toBe(false);
  });

  it("quem lê pelo hook acompanha a troca", async () => {
    const { result } = renderHook(() => useCascaLigada());
    expect(result.current).toBe(false);
    await act(async () => {
      document.documentElement.setAttribute(ATRIBUTO_DA_CASCA, "");
    });
    expect(result.current).toBe(true);
  });
});
