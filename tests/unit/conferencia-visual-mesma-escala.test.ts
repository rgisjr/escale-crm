import { describe, expect, it } from "vitest";
import { escalaConfere } from "@/tests/e2e/utils/escala";

describe("conferência visual só vale na mesma escala da Clint", () => {
  it("aceita 1,25 contra 1,25", () => {
    expect(escalaConfere(1.25, 1.25)).toBe(true);
  });
  it("recusa o Escale a 90% (1,125) contra a Clint a 100% (1,25)", () => {
    expect(escalaConfere(1.125, 1.25)).toBe(false);
  });
});
