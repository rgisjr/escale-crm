import { describe, expect, it } from "vitest";

import { OCULTOS_VAZIOS, esconderOcultos, lerOcultos, ocultosEfetivos } from "@/lib/escale/campos/ocultos";

describe("campos ocultos por origem (HiddenFields da Clint)", () => {
  it("lê o settings com tolerância", () => {
    expect(lerOcultos(null)).toEqual(OCULTOS_VAZIOS);
    expect(lerOcultos({ escale_campos_ocultos: { contato: ["cargo"], negocio: 3 } })).toEqual({ ...OCULTOS_VAZIOS, contato: ["cargo"] });
  });

  it("com 'usar do grupo' e grupo presente, vale o do grupo", () => {
    const origem = { usar_do_grupo: true, contato: ["a"], negocio: [], empresa: [] };
    const grupo = { usar_do_grupo: false, contato: ["b"], negocio: ["c"], empresa: [] };
    expect(ocultosEfetivos(origem, grupo).contato).toEqual(["b"]);
    expect(ocultosEfetivos(origem, null).contato).toEqual(["a"]);
    expect(ocultosEfetivos({ ...origem, usar_do_grupo: false }, grupo).contato).toEqual(["a"]);
  });

  it("esconde só o oculto vazio: campo preenchido continua aparecendo", () => {
    const campos = [
      { chave: "cargo", valor: null },
      { chave: "renda", valor: "1.500,00" },
      { chave: "score", valor: null },
    ];
    expect(esconderOcultos(campos, ["cargo", "renda"]).map((c) => c.chave)).toEqual(["renda", "score"]);
  });
});
