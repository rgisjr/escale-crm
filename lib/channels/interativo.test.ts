// @vitest-environment node
import { describe, expect, it } from "vitest";

import { type Interativo, interativoDaMensagem, interativoSchema, montarInterativo, textoNumeradoDeReserva } from "@/lib/channels/interativo";

const lista: Interativo = {
  tipo: "lista",
  corpo: "Aonde você quer fazer o teste?",
  botaoDaLista: "Escolher aparelho",
  linhas: [
    { id: "tv_android", titulo: "TV Android - Play Store" },
    { id: "tv_samsung", titulo: "TV Samsung" },
  ],
};

describe("interativoSchema", () => {
  it("lista aceita até 10 linhas e recusa 11", () => {
    const linhas = Array.from({ length: 11 }, (_, i) => ({ id: `l${i}`, titulo: `Linha ${i}` }));
    expect(interativoSchema.safeParse({ ...lista, linhas }).success).toBe(false);
    expect(interativoSchema.safeParse({ ...lista, linhas: linhas.slice(0, 10) }).success).toBe(true);
  });
  it("botões aceitam até 3 e título até 20", () => {
    const botoes = [1, 2, 3, 4].map((n) => ({ id: `b${n}`, titulo: `Plano ${n}` }));
    expect(interativoSchema.safeParse({ tipo: "botoes", corpo: "Qual plano?", botoes }).success).toBe(false);
    expect(interativoSchema.safeParse({ tipo: "botoes", corpo: "Qual plano?", botoes: botoes.slice(0, 3) }).success).toBe(true);
    expect(interativoSchema.safeParse({ tipo: "botoes", corpo: "x", botoes: [{ id: "a", titulo: "x".repeat(21) }] }).success).toBe(false);
  });
});

describe("montarInterativo", () => {
  it("lista -> objeto interactive da Cloud API", () => {
    expect(montarInterativo(lista)).toEqual({
      type: "list",
      body: { text: "Aonde você quer fazer o teste?" },
      action: {
        button: "Escolher aparelho",
        sections: [
          { title: "Opções", rows: [{ id: "tv_android", title: "TV Android - Play Store" }, { id: "tv_samsung", title: "TV Samsung" }] },
        ],
      },
    });
  });
  it("botões -> reply buttons", () => {
    expect(montarInterativo({ tipo: "botoes", corpo: "Qual plano?", botoes: [{ id: "p1", titulo: "1 Mês R$ 24,90" }] })).toEqual({
      type: "button",
      body: { text: "Qual plano?" },
      action: { buttons: [{ type: "reply", reply: { id: "p1", title: "1 Mês R$ 24,90" } }] },
    });
  });
});

describe("textoNumeradoDeReserva", () => {
  it("numera de 1 a N", () => {
    expect(textoNumeradoDeReserva(lista)).toBe("Aonde você quer fazer o teste?\n\n1 - TV Android - Play Store\n2 - TV Samsung");
  });
});

describe("interativoDaMensagem", () => {
  it("lê e valida metadata.interativo; o resto é null", () => {
    expect(interativoDaMensagem({ interativo: lista })).toEqual(lista);
    expect(interativoDaMensagem({ interativo: { tipo: "lista" } })).toBeNull();
    expect(interativoDaMensagem(null)).toBeNull();
  });
});
