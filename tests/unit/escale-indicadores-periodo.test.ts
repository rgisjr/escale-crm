import { describe, expect, it } from "vitest";

import { resolverPeriodo } from "@/lib/escale/indicadores/motor/periodo";
import type { Periodo } from "@/lib/escale/indicadores/pergunta";

// 26/10/2026 23:30 em São Paulo (segunda-feira), já 27/10 em UTC.
const AGORA = new Date("2026-10-27T02:30:00Z");
const FUSO = "America/Sao_Paulo";
const de = (atalho: Periodo["atalho"]) => resolverPeriodo({ atalho }, AGORA, FUSO);

describe("resolverPeriodo", () => {
  it.each([
    ["hoje", { de: "2026-10-26", ate: "2026-10-26" }],
    ["ontem", { de: "2026-10-25", ate: "2026-10-25" }],
    ["7_dias", { de: "2026-10-20", ate: "2026-10-26" }],
    ["15_dias", { de: "2026-10-12", ate: "2026-10-26" }],
    ["1_mes", { de: "2026-09-27", ate: "2026-10-26" }],
    ["esta_semana", { de: "2026-10-25", ate: "2026-10-31" }],
    ["semana_passada", { de: "2026-10-18", ate: "2026-10-24" }],
    ["este_mes", { de: "2026-10-01", ate: "2026-10-31" }],
    ["mes_passado", { de: "2026-09-01", ate: "2026-09-30" }],
    ["este_ano", { de: "2026-01-01", ate: "2026-12-31" }],
  ] as const)("%s", (atalho, esperado) => {
    expect(de(atalho)).toEqual(esperado);
  });

  it("tudo não limita", () => expect(de("tudo")).toBeNull());

  it("personalizado devolve as datas", () => {
    expect(resolverPeriodo({ atalho: "personalizado", de: "2026-01-05", ate: "2026-02-01" }, AGORA, FUSO)).toEqual({
      de: "2026-01-05",
      ate: "2026-02-01",
    });
  });
});
