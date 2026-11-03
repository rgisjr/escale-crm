import { describe, expect, it } from "vitest";

import {
  avaliarCondicaoDeHorario,
  lerValorDaData,
  lerValorDaHora,
  rotuloDoFuso,
  valorDeHorarioValido,
} from "@/lib/automation/condicoes-de-horario";
import { conditionSchema } from "@/lib/schemas/webhooks";

const SP = "America/Sao_Paulo";
// 03/11/2026 é terça (dia 2). 13:30 UTC = 10:30 em São Paulo (UTC -3, sem horário de verão).
const TERCA_10H30 = new Date("2026-11-03T13:30:00Z");
const hora = (op: string, v: object) => ({ field: "agora.hora", op, value: JSON.stringify(v) });
const data = (op: string, v: object) => ({ field: "agora.data", op, value: JSON.stringify(v) });

describe("Hora", () => {
  it("depois de inclui o minuto; antes de não inclui", () => {
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "10:30" }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "10:31" }), TERCA_10H30, SP)).toBe(false);
    expect(avaliarCondicaoDeHorario(hora("antes_de", { de: "10:30" }), TERCA_10H30, SP)).toBe(false);
    expect(avaliarCondicaoDeHorario(hora("antes_de", { de: "11:00" }), TERCA_10H30, SP)).toBe(true);
  });

  it("entre, no dia e fora dele, e atravessando a meia-noite", () => {
    expect(avaliarCondicaoDeHorario(hora("entre", { de: "08:00", ate: "18:00" }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("entre", { de: "08:00", ate: "10:30" }), TERCA_10H30, SP)).toBe(false);
    const terca23h = new Date("2026-11-04T02:00:00Z");
    expect(avaliarCondicaoDeHorario(hora("entre", { de: "22:00", ate: "06:00" }), terca23h, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("entre", { de: "22:00", ate: "06:00" }), TERCA_10H30, SP)).toBe(false);
  });

  it("dias da semana: vazio é todo dia; terça só passa com o 2", () => {
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "08:00", dias: [] }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "08:00", dias: [1, 2] }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "08:00", dias: [1, 3] }), TERCA_10H30, SP)).toBe(false);
  });

  it("usa o fuso da organização, não o do servidor", () => {
    // 10:30 em São Paulo = 13:30 em Lisboa (UTC +0 em novembro).
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "13:00" }), TERCA_10H30, "Europe/Lisbon")).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "13:00" }), TERCA_10H30, SP)).toBe(false);
  });

  it("valor torto ou que não fecha com o operador é falso", () => {
    expect(lerValorDaHora("entre", JSON.stringify({ de: "08:00" }))).toBeNull();
    expect(lerValorDaHora("depois_de", JSON.stringify({ de: "08:00", ate: "18:00" }))).toBeNull();
    expect(lerValorDaHora("entre", JSON.stringify({ de: "08:00", ate: "08:00" }))).toBeNull();
    expect(lerValorDaHora("depois_de", JSON.stringify({ de: "8:00" }))).toBeNull();
    expect(lerValorDaHora("depois_de", "não é json")).toBeNull();
    expect(lerValorDaHora("antes_de", JSON.stringify({ de: "00:00" }))).toBeNull();
    expect(avaliarCondicaoDeHorario({ field: "agora.hora", op: "depois_de", value: "x" }, TERCA_10H30, SP)).toBe(false);
  });
});

describe("Data", () => {
  it("depois de, antes de e entre, na hora de parede da organização", () => {
    expect(avaliarCondicaoDeHorario(data("depois_de", { de: "2026-11-03T10:30" }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(data("antes_de", { de: "2026-11-03T10:30" }), TERCA_10H30, SP)).toBe(false);
    expect(avaliarCondicaoDeHorario(data("antes_de", { de: "2026-12-01T00:00" }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(data("entre", { de: "2026-11-01T00:00", ate: "2026-11-03T10:30" }), TERCA_10H30, SP)).toBe(false);
    expect(avaliarCondicaoDeHorario(data("entre", { de: "2026-11-01T00:00", ate: "2026-11-03T10:31" }), TERCA_10H30, SP)).toBe(true);
  });

  it("recusa data inexistente e fim antes do começo", () => {
    expect(lerValorDaData("depois_de", JSON.stringify({ de: "2026-02-31T10:00" }))).toBeNull();
    expect(lerValorDaData("entre", JSON.stringify({ de: "2026-11-03T10:00", ate: "2026-11-03T09:00" }))).toBeNull();
  });
});

describe("rótulo do fuso e validação", () => {
  it("(UTC -3), (UTC +0) e (UTC +5:30)", () => {
    expect(rotuloDoFuso(SP, TERCA_10H30)).toBe("(UTC -3)");
    expect(rotuloDoFuso("Europe/Lisbon", TERCA_10H30)).toBe("(UTC +0)");
    expect(rotuloDoFuso("Asia/Kolkata", TERCA_10H30)).toBe("(UTC +5:30)");
    expect(rotuloDoFuso("Fuso/Inexistente", TERCA_10H30)).toBe("(UTC -3)");
  });

  it("valorDeHorarioValido só aceita campo e operador de horário que combinam", () => {
    expect(valorDeHorarioValido("agora.hora", "entre", JSON.stringify({ de: "08:00", ate: "18:00", dias: [1] }))).toBe(true);
    expect(valorDeHorarioValido("agora.hora", "eq", JSON.stringify({ de: "08:00" }))).toBe(false);
    expect(valorDeHorarioValido("lead.title", "depois_de", JSON.stringify({ de: "08:00" }))).toBe(false);
  });

  it("a porta da condição recusa horário torto e operador trocado", () => {
    expect(conditionSchema.safeParse(hora("entre", { de: "08:00", ate: "18:00" })).success).toBe(true);
    expect(conditionSchema.safeParse(hora("entre", { de: "08:00" })).success).toBe(false);
    expect(conditionSchema.safeParse({ field: "agora.hora", op: "eq", value: "x" }).success).toBe(false);
    expect(conditionSchema.safeParse({ field: "lead.title", op: "depois_de", value: "x" }).success).toBe(false);
    expect(conditionSchema.safeParse({ field: "lead.title", op: "eq", value: "Ana" }).success).toBe(true);
  });
});
