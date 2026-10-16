import { describe, expect, it } from "vitest";

import {
  ATALHOS_DE_PERIODO,
  atalhoDoPeriodo,
  dataDoIso,
  dentroDoIntervalo,
  diasDoMes,
  formatarDataBr,
  isoDaData,
  mesVizinho,
  ordenarIntervalo,
  periodoDoAtalho,
} from "@/lib/escale/ui/periodos";

/** Quinta-feira, 15/10/2026, à tarde — o dia do print do usuário. Hora local. */
const QUINTA = new Date(2026, 9, 15, 14, 30);

describe("periodoDoAtalho", () => {
  it.each([
    ["hoje", "2026-10-15", "2026-10-15"],
    ["ontem", "2026-10-14", "2026-10-14"],
    ["essa-semana", "2026-10-11", "2026-10-17"],
    ["semana-passada", "2026-10-04", "2026-10-10"],
    ["esse-mes", "2026-10-01", "2026-10-31"],
    ["mes-passado", "2026-09-01", "2026-09-30"],
    ["esse-ano", "2026-01-01", "2026-12-31"],
  ] as const)("%s em 15/10/2026 vai de %s a %s", (atalho, de, ate) => {
    expect(periodoDoAtalho(atalho, QUINTA)).toEqual({ de, ate });
  });

  it("a semana começa no domingo: no domingo e no sábado, 'essa semana' é a mesma", () => {
    expect(periodoDoAtalho("essa-semana", new Date(2026, 9, 11, 8))).toEqual({ de: "2026-10-11", ate: "2026-10-17" });
    expect(periodoDoAtalho("essa-semana", new Date(2026, 9, 17, 23, 59))).toEqual({ de: "2026-10-11", ate: "2026-10-17" });
  });

  it("vira o ano: em 01/01/2026, ontem, a semana e o mês passado caem em 2025", () => {
    const anoNovo = new Date(2026, 0, 1, 9);
    expect(periodoDoAtalho("ontem", anoNovo)).toEqual({ de: "2025-12-31", ate: "2025-12-31" });
    expect(periodoDoAtalho("essa-semana", anoNovo)).toEqual({ de: "2025-12-28", ate: "2026-01-03" });
    expect(periodoDoAtalho("semana-passada", anoNovo)).toEqual({ de: "2025-12-21", ate: "2025-12-27" });
    expect(periodoDoAtalho("mes-passado", anoNovo)).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
  });

  it("mês passado respeita o fevereiro bissexto, partindo de um dia 31", () => {
    expect(periodoDoAtalho("mes-passado", new Date(2024, 2, 31, 12))).toEqual({ de: "2024-02-01", ate: "2024-02-29" });
    expect(periodoDoAtalho("mes-passado", new Date(2026, 2, 31, 12))).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
  });

  it("não escorrega de dia perto da meia-noite (nada de UTC)", () => {
    expect(periodoDoAtalho("hoje", new Date(2026, 9, 15, 23, 59, 59))).toEqual({ de: "2026-10-15", ate: "2026-10-15" });
    expect(periodoDoAtalho("hoje", new Date(2026, 9, 15, 0, 0, 0))).toEqual({ de: "2026-10-15", ate: "2026-10-15" });
  });

  it("a lista dos atalhos segue a ordem da Clint", () => {
    expect(ATALHOS_DE_PERIODO).toEqual([
      "hoje",
      "ontem",
      "essa-semana",
      "semana-passada",
      "esse-mes",
      "mes-passado",
      "esse-ano",
    ]);
  });
});

describe("diasDoMes", () => {
  it("outubro de 2026 como no print da Clint: de 27/09 (domingo) a 31/10, cinco semanas", () => {
    const dias = diasDoMes(2026, 9);
    expect(dias).toHaveLength(35);
    expect(dias.slice(0, 5)).toEqual([
      { iso: "2026-09-27", doMes: false },
      { iso: "2026-09-28", doMes: false },
      { iso: "2026-09-29", doMes: false },
      { iso: "2026-09-30", doMes: false },
      { iso: "2026-10-01", doMes: true },
    ]);
    expect(dias[dias.length - 1]).toEqual({ iso: "2026-10-31", doMes: true });
  });

  it("novembro de 2026 começa num domingo e termina em 05/12, como no print", () => {
    const dias = diasDoMes(2026, 10);
    expect(dias).toHaveLength(35);
    expect(dias[0]).toEqual({ iso: "2026-11-01", doMes: true });
    expect(dias[dias.length - 1]).toEqual({ iso: "2026-12-05", doMes: false });
  });

  it("maio de 2026 precisa de seis semanas; fevereiro de 2026, de quatro", () => {
    expect(diasDoMes(2026, 4)).toHaveLength(42);
    const fevereiro = diasDoMes(2026, 1);
    expect(fevereiro).toHaveLength(28);
    expect(fevereiro[0]).toEqual({ iso: "2026-02-01", doMes: true });
  });

  it("vira o ano: dezembro de 2026 termina em 02/01/2027", () => {
    const dias = diasDoMes(2026, 11);
    expect(dias[0]?.iso).toBe("2026-11-29");
    expect(dias[dias.length - 1]).toEqual({ iso: "2027-01-02", doMes: false });
  });

  it("todo mês tem semanas inteiras começando no domingo", () => {
    for (let mes0 = 0; mes0 < 12; mes0 += 1) {
      const dias = diasDoMes(2026, mes0);
      expect(dias.length % 7, `mês ${mes0}`).toBe(0);
      expect(dataDoIso(dias[0]!.iso).getDay(), `mês ${mes0}`).toBe(0);
    }
  });
});

describe("datas em texto", () => {
  it("isoDaData usa o calendário local", () => {
    expect(isoDaData(new Date(2026, 9, 15, 23, 30))).toBe("2026-10-15");
    expect(isoDaData(new Date(2026, 0, 5, 0, 0))).toBe("2026-01-05");
  });

  it("dataDoIso devolve a meia-noite local e recusa o que não é data", () => {
    const d = dataDoIso("2026-10-15");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 15, 0]);
    expect(() => dataDoIso("15/10/2026")).toThrow();
    expect(() => dataDoIso("2026-02-31")).toThrow();
  });

  it("formatarDataBr mostra dd/mm/aaaa", () => {
    expect(formatarDataBr("2026-03-05")).toBe("05/03/2026");
    expect(formatarDataBr("2026-12-31")).toBe("31/12/2026");
  });
});

describe("intervalo", () => {
  it("os dois cliques valem em qualquer ordem", () => {
    expect(ordenarIntervalo("2026-10-20", "2026-10-12")).toEqual({ de: "2026-10-12", ate: "2026-10-20" });
    expect(ordenarIntervalo("2026-10-12", "2026-10-20")).toEqual({ de: "2026-10-12", ate: "2026-10-20" });
    expect(ordenarIntervalo("2026-10-12", "2026-10-12")).toEqual({ de: "2026-10-12", ate: "2026-10-12" });
  });

  it("dentroDoIntervalo exclui os extremos e exige os dois", () => {
    expect(dentroDoIntervalo("2026-10-15", "2026-10-12", "2026-10-20")).toBe(true);
    expect(dentroDoIntervalo("2026-10-12", "2026-10-12", "2026-10-20")).toBe(false);
    expect(dentroDoIntervalo("2026-10-20", "2026-10-12", "2026-10-20")).toBe(false);
    expect(dentroDoIntervalo("2026-10-15", "2026-10-12", undefined)).toBe(false);
  });

  it("mesVizinho atravessa o ano", () => {
    expect(mesVizinho(2026, 11, 1)).toEqual({ ano: 2027, mes0: 0 });
    expect(mesVizinho(2026, 0, -1)).toEqual({ ano: 2025, mes0: 11 });
    expect(mesVizinho(2026, 9, 1)).toEqual({ ano: 2026, mes0: 10 });
  });

  it("atalhoDoPeriodo reconhece o atalho do intervalo, e só ele", () => {
    expect(atalhoDoPeriodo("2026-10-11", "2026-10-17", QUINTA)).toBe("essa-semana");
    expect(atalhoDoPeriodo("2026-10-15", "2026-10-15", QUINTA)).toBe("hoje");
    expect(atalhoDoPeriodo("2026-10-12", "2026-10-17", QUINTA)).toBeNull();
  });
});
