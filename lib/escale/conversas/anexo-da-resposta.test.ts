import { describe, expect, it } from "vitest";

import { chaveDoNumero, rotuloDoAnexo } from "@/lib/escale/conversas/anexo-da-resposta";

const ativos = [{ id: "a1", nome: "bv1.ogg", tipo: "audio" as const }];

describe("chaveDoNumero", () => {
  it("normaliza acento, espaço e caixa", () => {
    expect(chaveDoNumero("  Boas Vindas 1 ")).toBe("boas_vindas_1");
    expect(chaveDoNumero("Saudação")).toBe("saudacao");
  });
  it("recusa o que não vira chave válida", () => {
    expect(chaveDoNumero("")).toBeNull();
    expect(chaveDoNumero("123")).toBeNull();
    expect(chaveDoNumero("!!!")).toBeNull();
  });
});

describe("rotuloDoAnexo", () => {
  it("arquivo da biblioteca mostra o nome e o tipo", () => {
    expect(rotuloDoAnexo("a1", ativos)).toEqual({ origem: "biblioteca", nome: "bv1.ogg", tipo: "audio" });
  });
  it("var:<chave> aparece como arquivo do número", () => {
    expect(rotuloDoAnexo("var:bv1", ativos)).toEqual({ origem: "numero", nome: "bv1", tipo: null });
  });
  it("arquivo que saiu da biblioteca é sinalizado", () => {
    expect(rotuloDoAnexo("zzzzzzzz-1", ativos).origem).toBe("removido");
  });
});
