import { describe, expect, it } from "vitest";

import { limiteDoDiaNoFuso } from "@/lib/escale/conversas/limite-do-dia";

describe("limiteDoDiaNoFuso (B1-11)", () => {
  it("em Brasília (UTC-3) o dia 24/10 começa às 03:00 UTC e termina às 02:59:59.999 UTC do dia seguinte", () => {
    expect(limiteDoDiaNoFuso("2026-10-24", "inicio", "America/Sao_Paulo")).toBe("2026-10-24T03:00:00.000Z");
    expect(limiteDoDiaNoFuso("2026-10-24", "fim", "America/Sao_Paulo")).toBe("2026-10-25T02:59:59.999Z");
  });

  it("UTC fica como veio", () => {
    expect(limiteDoDiaNoFuso("2026-10-24", "inicio", "UTC")).toBe("2026-10-24T00:00:00.000Z");
  });

  it("fuso a leste de UTC (Lisboa no verão, UTC+1)", () => {
    expect(limiteDoDiaNoFuso("2026-07-01", "inicio", "Europe/Lisbon")).toBe("2026-06-30T23:00:00.000Z");
  });
});
