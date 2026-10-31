// @vitest-environment node
import { describe, expect, it } from "vitest";

import { CHAVE_DE_VARIAVEL, mesclarVariaveis } from "@/lib/canais/variaveis";

const CANAL_A = "11111111-1111-4111-8111-111111111111";
const CANAL_B = "22222222-2222-4222-8222-222222222222";

describe("mesclarVariaveis", () => {
  const linhas = [
    { channel_session_id: null, chave: "pix_banco", value_text: "Mercado Pago" },
    { channel_session_id: null, chave: "pix_nome", value_text: "Iago cardoso" },
    { channel_session_id: CANAL_B, chave: "pix_nome", value_text: "Teresinha" },
    { channel_session_id: CANAL_B, chave: "pix_chave", value_text: "51999600190" },
  ];

  it("o valor do canal vence o padrão da organização", () => {
    expect(mesclarVariaveis(linhas, CANAL_B)).toEqual({
      pix_banco: "Mercado Pago",
      pix_nome: "Teresinha",
      pix_chave: "51999600190",
    });
  });

  it("canal sem valor próprio herda só o padrão", () => {
    expect(mesclarVariaveis(linhas, CANAL_A)).toEqual({
      pix_banco: "Mercado Pago",
      pix_nome: "Iago cardoso",
    });
  });

  it("sem canal, só o padrão", () => {
    expect(mesclarVariaveis(linhas, null)).toEqual({ pix_banco: "Mercado Pago", pix_nome: "Iago cardoso" });
  });
});

describe("CHAVE_DE_VARIAVEL", () => {
  it.each(["pix_chave", "suporte_telefone", "a1"])("aceita %s", (c) => expect(CHAVE_DE_VARIAVEL.test(c)).toBe(true));
  it.each(["Pix", "1pix", "pix chave", "pix.chave", ""])("recusa %s", (c) => expect(CHAVE_DE_VARIAVEL.test(c)).toBe(false));
});
