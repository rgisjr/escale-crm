// @vitest-environment node
import { describe, expect, it } from "vitest";

import { duracaoLegivel } from "@/lib/followup/eventos-legiveis";

describe("duracaoLegivel", () => {
  it("fala em segundos abaixo de um minuto", () => {
    expect(duracaoLegivel(30_000)).toBe("30 segundos");
    expect(duracaoLegivel(1_000)).toBe("1 segundo");
  });
  it("mantém minutos, horas e dias", () => {
    expect(duracaoLegivel(300_000)).toBe("5 minutos");
    expect(duracaoLegivel(7_200_000)).toBe("2 horas");
    expect(duracaoLegivel(172_800_000)).toBe("2 dias");
  });
});
