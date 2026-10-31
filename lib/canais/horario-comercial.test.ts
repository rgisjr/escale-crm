// @vitest-environment node
import { describe, expect, it } from "vitest";

import { faixasDosBlocos, proximaAberturaComercial, validarFaixas, type FaixaComercial } from "@/lib/canais/horario-comercial";

const FUSO = "America/Sao_Paulo"; // UTC-3 o ano todo desde 2019
const MIN = (h: number, m = 0): number => h * 60 + m;

/** Segunda a sexta 09:30–18:00, sábado 09:30–12:00, domingo fechado. */
const SEMANA: FaixaComercial[] = [
  ...[1, 2, 3, 4, 5].map((d) => ({ diaDaSemana: d, inicioMin: MIN(9, 30), fimMin: MIN(18) })),
  { diaDaSemana: 6, inicioMin: MIN(9, 30), fimMin: MIN(12) },
];

/** 2026-11-02 é uma segunda-feira. As horas abaixo são de Brasília. */
const local = (iso: string): Date => new Date(`${iso}-03:00`);

describe("proximaAberturaComercial", () => {
  it("aberto agora: null", () => {
    expect(proximaAberturaComercial(local("2026-11-02T10:00:00"), FUSO, SEMANA)).toBeNull();
  });
  it("antes da abertura do mesmo dia: abre às 09:30 de hoje", () => {
    expect(proximaAberturaComercial(local("2026-11-02T08:00:00"), FUSO, SEMANA)?.toISOString()).toBe(
      local("2026-11-02T09:30:00").toISOString(),
    );
  });
  it("depois do fechamento: abre amanhã", () => {
    expect(proximaAberturaComercial(local("2026-11-02T18:00:00"), FUSO, SEMANA)?.toISOString()).toBe(
      local("2026-11-03T09:30:00").toISOString(),
    );
  });
  it("sexta à noite: abre no sábado", () => {
    expect(proximaAberturaComercial(local("2026-11-06T19:00:00"), FUSO, SEMANA)?.toISOString()).toBe(
      local("2026-11-07T09:30:00").toISOString(),
    );
  });
  it("sábado depois do meio-dia: pula o domingo e abre na segunda", () => {
    expect(proximaAberturaComercial(local("2026-11-07T12:30:00"), FUSO, SEMANA)?.toISOString()).toBe(
      local("2026-11-09T09:30:00").toISOString(),
    );
  });
  it("domingo: abre na segunda", () => {
    expect(proximaAberturaComercial(local("2026-11-08T10:00:00"), FUSO, SEMANA)?.toISOString()).toBe(
      local("2026-11-09T09:30:00").toISOString(),
    );
  });
  it("o fim é exclusivo: 18:00 em ponto já está fechado", () => {
    expect(proximaAberturaComercial(local("2026-11-02T17:59:59"), FUSO, SEMANA)).toBeNull();
    expect(proximaAberturaComercial(local("2026-11-02T18:00:00"), FUSO, SEMANA)).not.toBeNull();
  });
  it("duas faixas no mesmo dia: o almoço fecha e reabre", () => {
    const comAlmoco: FaixaComercial[] = [
      { diaDaSemana: 1, inicioMin: MIN(9), fimMin: MIN(12) },
      { diaDaSemana: 1, inicioMin: MIN(14), fimMin: MIN(18) },
    ];
    expect(proximaAberturaComercial(local("2026-11-02T12:30:00"), FUSO, comAlmoco)?.toISOString()).toBe(
      local("2026-11-02T14:00:00").toISOString(),
    );
  });
  it("sem faixas configuradas: sem restrição (null)", () => {
    expect(proximaAberturaComercial(local("2026-11-08T03:00:00"), FUSO, [])).toBeNull();
  });
  it("usa o fuso da organização, não o do servidor", () => {
    // 12:00 UTC de segunda = 09:00 em Brasília (fechado, abre 09:30) mas 13:00 em Lisboa (aberto, se for a mesma grade).
    const agora = new Date("2026-11-02T12:00:00Z");
    expect(proximaAberturaComercial(agora, FUSO, SEMANA)).not.toBeNull();
    expect(proximaAberturaComercial(agora, "Europe/Lisbon", SEMANA)).toBeNull();
  });
});

describe("validarFaixas", () => {
  it("aceita uma grade comum", () => expect(validarFaixas(SEMANA)).toEqual({ ok: true }));
  it("recusa fim antes do início", () => {
    expect(validarFaixas([{ diaDaSemana: 1, inicioMin: 600, fimMin: 600 }]).ok).toBe(false);
  });
  it("recusa dia fora de 0 a 6 e minuto fora do dia", () => {
    expect(validarFaixas([{ diaDaSemana: 7, inicioMin: 0, fimMin: 60 }]).ok).toBe(false);
    expect(validarFaixas([{ diaDaSemana: 1, inicioMin: 0, fimMin: 1441 }]).ok).toBe(false);
  });
  it("recusa faixas que se sobrepõem no mesmo dia", () => {
    const r = validarFaixas([
      { diaDaSemana: 1, inicioMin: 540, fimMin: 720 },
      { diaDaSemana: 1, inicioMin: 700, fimMin: 800 },
    ]);
    expect(r.ok).toBe(false);
  });
});

describe("faixasDosBlocos", () => {
  it("expande dias e converte HH:MM", () => {
    const r = faixasDosBlocos([{ dias: [1, 2], das: "09:30", ate: "18:00" }]);
    expect(r).toEqual({
      ok: true,
      faixas: [
        { diaDaSemana: 1, inicioMin: 570, fimMin: 1080 },
        { diaDaSemana: 2, inicioMin: 570, fimMin: 1080 },
      ],
    });
  });
  it("aceita 24:00 só como fim", () => {
    expect(faixasDosBlocos([{ dias: [0], das: "00:00", ate: "24:00" }]).ok).toBe(true);
    expect(faixasDosBlocos([{ dias: [0], das: "24:00", ate: "24:00" }]).ok).toBe(false);
  });
  it("recusa hora mal escrita, dia inválido e blocos que se sobrepõem", () => {
    expect(faixasDosBlocos([{ dias: [1], das: "9h", ate: "18:00" }])).toEqual({ ok: false, motivo: "hora_invalida:9h" });
    expect(faixasDosBlocos([{ dias: [8], das: "09:00", ate: "18:00" }]).ok).toBe(false);
    expect(
      faixasDosBlocos([
        { dias: [1], das: "09:00", ate: "12:00" },
        { dias: [1], das: "11:00", ate: "13:00" },
      ]).ok,
    ).toBe(false);
  });
});
