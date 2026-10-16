import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { baixarCsv } from "@/lib/escale/exportar/baixar";

describe("baixarCsv", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("baixa com o nome dado e um BOM UTF-8 na frente, para o Excel ler os acentos", async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return "blob:teste";
    });
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    baixarCsv("negocios-vendas-2026-10-16.csv", "Título\r\n");

    expect(clique).toHaveBeenCalledTimes(1);
    // O Safari cancela o download se a URL é revogada no mesmo instante: só depois do clique.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:teste");
    expect(document.querySelector("a[download]")).toBeNull();
    const bytes = new Uint8Array(await blob!.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe("Título\r\n");
  });
});
