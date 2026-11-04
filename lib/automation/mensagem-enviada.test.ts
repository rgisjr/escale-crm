import { describe, expect, it } from "vitest";

import {
  configDaMensagemEnviadaSchema,
  configInicialDaMensagemEnviada,
  lerConfigDaMensagemEnviada,
  mensagemEnviadaCasa,
  problemasDaMensagemEnviada,
  resumoDaMensagemEnviada,
  veioDeAgendamento,
  type MensagemParaOGatilho,
} from "@/lib/automation/mensagem-enviada";

const CANAL_A = "44444444-4444-4444-8444-444444444444";
const CANAL_B = "55555555-5555-4555-8555-555555555555";
const FRASE = "Põe estes dados, acessa o aplicativo e pode testar!";
const msg = (parte: Partial<MensagemParaOGatilho> = {}): MensagemParaOGatilho => ({
  body: FRASE,
  sent_via: "user",
  channel_session_id: CANAL_A,
  metadata: {},
  ...parte,
});
const palavras = (...valores: string[]) => ({
  channel_session_id: "",
  filtro: { modo: "palavras" as const, condicoes: valores.map((valor) => ({ operador: "contem" as const, valor })), combinar: "qualquer" as const },
  em_grupos: false,
  agendadas: true,
});

describe("lerConfigDaMensagemEnviada", () => {
  it("o formato antigo vira uma condição, sem grupo e com agendadas", () => {
    expect(lerConfigDaMensagemEnviada({ palavra_chave: "Põe estes dados", modo: "igual", channel_session_id: CANAL_A })).toEqual({
      channel_session_id: CANAL_A,
      filtro: { modo: "palavras", condicoes: [{ operador: "igual", valor: "Põe estes dados" }], combinar: "qualquer" },
      em_grupos: false,
      agendadas: true,
    });
    expect(lerConfigDaMensagemEnviada({ palavra_chave: "oi" })?.filtro).toEqual({
      modo: "palavras",
      condicoes: [{ operador: "contem", valor: "oi" }],
      combinar: "qualquer",
    });
  });
  it("o formato novo volta com os padrões", () => {
    expect(lerConfigDaMensagemEnviada({ filtro: { modo: "qualquer" } })).toEqual({
      channel_session_id: "",
      filtro: { modo: "qualquer" },
      em_grupos: false,
      agendadas: true,
    });
  });
  it("nada reconhecível → null", () => {
    expect(lerConfigDaMensagemEnviada({})).toBeNull();
    expect(lerConfigDaMensagemEnviada(null)).toBeNull();
    expect(lerConfigDaMensagemEnviada({ filtro: { modo: "x" } })).toBeNull();
  });
  it("a configuração inicial passa no schema", () => {
    expect(configDaMensagemEnviadaSchema.safeParse(configInicialDaMensagemEnviada()).success).toBe(true);
  });
});

describe("problemasDaMensagemEnviada", () => {
  it("config vazia pede a palavra-chave (a frase de hoje)", () => {
    expect(problemasDaMensagemEnviada({})).toEqual(["Informe a palavra-chave (palavra_chave) da mensagem enviada."]);
  });
  it("filtro de palavras sem palavra positiva é recusado", () => {
    expect(problemasDaMensagemEnviada(configInicialDaMensagemEnviada())).toEqual([
      'Preencha a palavra do filtro ou use "Qualquer mensagem".',
    ]);
    expect(
      problemasDaMensagemEnviada({ ...palavras(), filtro: { modo: "palavras", condicoes: [{ operador: "nao_contem", valor: "x" }], combinar: "qualquer" } }),
    ).toHaveLength(1);
  });
  it("qualquer mensagem, formato antigo e palavras preenchidas passam", () => {
    expect(problemasDaMensagemEnviada({ filtro: { modo: "qualquer" } })).toEqual([]);
    expect(problemasDaMensagemEnviada({ palavra_chave: "oi" })).toEqual([]);
    expect(problemasDaMensagemEnviada(palavras("oi"))).toEqual([]);
  });
});

describe("mensagemEnviadaCasa", () => {
  it("formato antigo: mesma resposta de hoje", () => {
    const antigo = { palavra_chave: "põe estes dados", modo: "contem" };
    expect(mensagemEnviadaCasa(antigo, msg(), false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa({ palavra_chave: "Põe estes dados", modo: "igual" }, msg(), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa(antigo, msg({ sent_via: "automation" }), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa(antigo, msg({ sent_via: "ai" }), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa(antigo, msg({ sent_via: "external_device" }), false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa(antigo, msg(), false, "failed")).toBe(false);
    expect(mensagemEnviadaCasa({}, msg(), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa(antigo, undefined, false, "sent")).toBe(false);
  });
  it("número: vazio é qualquer; preso a outro número não casa", () => {
    expect(mensagemEnviadaCasa(palavras("dados"), msg({ channel_session_id: CANAL_B }), false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), channel_session_id: CANAL_B }, msg(), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), channel_session_id: CANAL_A }, msg(), false, "sent")).toBe(true);
  });
  it("várias palavras: qualquer uma basta; todas exige todas", () => {
    expect(mensagemEnviadaCasa(palavras("boleto", "aplicativo"), msg(), false, "sent")).toBe(true);
    const todas = { ...palavras("boleto", "aplicativo"), filtro: { ...palavras("boleto", "aplicativo").filtro, combinar: "todas" as const } };
    expect(mensagemEnviadaCasa(todas, msg(), false, "sent")).toBe(false);
  });
  it("qualquer mensagem casa até sem texto (áudio)", () => {
    const qualquer = { ...palavras(), filtro: { modo: "qualquer" as const } };
    expect(mensagemEnviadaCasa(qualquer, msg({ body: null }), false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa(qualquer, msg({ sent_via: "automation" }), false, "sent")).toBe(false);
  });
  it("grupo só com em_grupos; vale também para o formato antigo", () => {
    expect(mensagemEnviadaCasa(palavras("dados"), msg(), true, "sent")).toBe(false);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), em_grupos: true }, msg(), true, "sent")).toBe(true);
    expect(mensagemEnviadaCasa({ palavra_chave: "dados" }, msg(), true, "sent")).toBe(false);
  });
  it("agendada só quando agendadas está ligado", () => {
    const agendada = msg({ metadata: { agendamento_id: "a1" } });
    expect(mensagemEnviadaCasa(palavras("dados"), agendada, false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), agendadas: false }, agendada, false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), agendadas: false }, msg(), false, "sent")).toBe(true);
  });
});

describe("veioDeAgendamento", () => {
  it("só com o id do agendamento em texto", () => {
    expect(veioDeAgendamento({ agendamento_id: "a1" })).toBe(true);
    expect(veioDeAgendamento({ agendamento_id: 1 })).toBe(false);
    expect(veioDeAgendamento(null)).toBe(false);
  });
});

describe("resumoDaMensagemEnviada", () => {
  const t = (s: string) => s;
  it("resume o filtro para o chip do nó", () => {
    expect(resumoDaMensagemEnviada({ palavra_chave: "Põe estes dados" }, t)).toBe("Contém “Põe estes dados”");
    expect(resumoDaMensagemEnviada({ filtro: { modo: "qualquer" } }, t)).toBe("Qualquer mensagem");
    expect(resumoDaMensagemEnviada(palavras("a", "b"), t)).toBe("Contém “a” · Contém “b”");
    expect(resumoDaMensagemEnviada(configInicialDaMensagemEnviada(), t)).toBe("Escolha a palavra-chave");
    expect(resumoDaMensagemEnviada(undefined, t)).toBe("Escolha a palavra-chave");
  });
});
