import { describe, expect, it } from "vitest";

import {
  adicionarMensagem,
  casaMensagem,
  lerCriacao,
  novaRegra,
  primeiraRegraQueCasa,
  validarCriacao,
  type RegraDeCriacao,
} from "@/lib/escale/conversas/criacao-de-negocio";

const t = (s: string) => s;
const O = "a0000000-0000-4000-8000-000000000001";
const E = "a0000000-0000-4000-8000-000000000002";
const regra = (extra: Partial<RegraDeCriacao>): RegraDeCriacao => ({
  id: "r1",
  nome: "Condição 1",
  tipo: "igual",
  mensagens: ["Quero orçamento"],
  origem_id: O,
  etapa_id: E,
  tags: [],
  manter_atendente: false,
  ...extra,
});

describe("a condição da Clint (AutoDeal)", () => {
  it("ligar cria a 'Condição 1' igual e vazia", () => {
    expect(novaRegra(1)).toMatchObject({
      nome: "Condição 1",
      tipo: "igual",
      mensagens: [],
      origem_id: "",
      etapa_id: "",
      tags: [],
      manter_atendente: false,
    });
    expect(novaRegra(2).nome).toBe("Condição 2");
  });

  it("as mensagens: até 10, sem repetir (sem caixa)", () => {
    expect(adicionarMensagem(["oi"], "  Olá ")).toEqual({ ok: true, lista: ["oi", "Olá"] });
    expect(adicionarMensagem(["Oi"], "oi")).toEqual({ ok: false, erro: "A mensagem já existe!" });
    expect(
      adicionarMensagem(
        Array.from({ length: 10 }, (_, i) => `m${i}`),
        "x",
      ),
    ).toEqual({ ok: false, erro: "Você pode adicionar até 10 mensagens!" });
  });

  it("validar: a primeira falta vira a frase da Clint, com a condição", () => {
    const r = validarCriacao(
      { ligado: true, regras: [{ ...novaRegra(1), mensagens: ["oi"], origem_id: O }] },
      t,
    );
    expect(r).toEqual({
      ok: false,
      erro: "O campo Na etapa é obrigatório em Condição 1",
      indice: 0,
    });
    const sem = validarCriacao(
      { ligado: true, regras: [{ ...novaRegra(1), origem_id: O, etapa_id: E }] },
      t,
    );
    expect(sem).toMatchObject({
      ok: false,
      erro: "O campo Quando receber uma mensagem que é obrigatório em Condição 1",
    });
    expect(
      validarCriacao(
        {
          ligado: true,
          regras: [{ ...novaRegra(1), tipo: "qualquer", origem_id: O, etapa_id: E }],
        },
        t,
      ).ok,
    ).toBe(true);
    expect(
      validarCriacao({ ligado: true, regras: [{ ...regra({}), nome: "x".repeat(36) }] }, t),
    ).toMatchObject({
      erro: "O número máximo de caracteres permitido para o nome da condição é de 35!",
    });
    expect(validarCriacao({ ligado: false, regras: [] }, t)).toEqual({
      ok: true,
      valor: { ligado: false, regras: [] },
    });
  });

  it("casar: sem caixa, sem acento, sem espaço repetido; a primeira que casa vence", () => {
    expect(casaMensagem(regra({}), "quero  ORÇAMENTO")).toBe(true);
    expect(
      casaMensagem(regra({ tipo: "comeca", mensagens: ["quero"] }), "Quero saber o preço"),
    ).toBe(true);
    expect(casaMensagem(regra({ tipo: "contem", mensagens: ["preco"] }), "qual o preço?")).toBe(
      true,
    );
    expect(casaMensagem(regra({ tipo: "igual" }), "quero orçamento agora")).toBe(false);
    expect(casaMensagem(regra({ tipo: "qualquer", mensagens: [] }), "")).toBe(true);
    const r2 = regra({ id: "r2", tipo: "qualquer", mensagens: [] });
    expect(primeiraRegraQueCasa([regra({}), r2], "oi")?.id).toBe("r2");
    expect(primeiraRegraQueCasa([regra({})], "oi")).toBeNull();
  });

  it("lerCriacao tolera lixo", () => {
    expect(lerCriacao(null)).toEqual({ ligado: false, regras: [] });
    expect(lerCriacao({ ligado: true, regras: [{ nome: 1 }] })).toEqual({
      ligado: true,
      regras: [],
    });
  });
});
