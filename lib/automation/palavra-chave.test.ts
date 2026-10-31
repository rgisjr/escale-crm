// @vitest-environment node
import { describe, expect, it } from "vitest";

import { casaComPalavraChave, foiEnviadaPorPessoa } from "@/lib/automation/palavra-chave";

describe("casaComPalavraChave", () => {
  const texto = "Põe estes dados, acessa o aplicativo e pode testar!";
  it("contém, sem diferenciar caixa nem acento", () => {
    expect(casaComPalavraChave(texto, "põe estes dados", "contem")).toBe(true);
    expect(casaComPalavraChave(texto, "POE ESTES DADOS", "contem")).toBe(true);
  });
  it("ignora espaços repetidos e quebras de linha", () => {
    expect(casaComPalavraChave("Logo  nosso\nnúmero do suporte vai te chamar", "logo nosso número do suporte", "contem")).toBe(true);
  });
  it("igual exige a mensagem inteira", () => {
    expect(casaComPalavraChave("Dados", "dados", "igual")).toBe(true);
    expect(casaComPalavraChave(texto, "põe estes dados", "igual")).toBe(false);
  });
  it("não casa frase diferente", () => {
    expect(casaComPalavraChave(texto, "logo nosso número", "contem")).toBe(false);
  });
  it("palavra vazia nunca casa", () => {
    expect(casaComPalavraChave(texto, "   ", "contem")).toBe(false);
  });
});

describe("foiEnviadaPorPessoa", () => {
  it("pessoa no sistema ou no aparelho conta; automação, IA e sistema não (anti-laço)", () => {
    expect(foiEnviadaPorPessoa("user")).toBe(true);
    expect(foiEnviadaPorPessoa("external_device")).toBe(true);
    expect(foiEnviadaPorPessoa("automation")).toBe(false);
    expect(foiEnviadaPorPessoa("ai")).toBe(false);
    expect(foiEnviadaPorPessoa("system")).toBe(false);
    expect(foiEnviadaPorPessoa(null)).toBe(false);
  });
});
