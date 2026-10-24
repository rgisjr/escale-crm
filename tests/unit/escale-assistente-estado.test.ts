import { describe, expect, it } from "vitest";

import { POS_ENVIO_PADRAO } from "@/lib/escale/campanhas/assistente";
import {
  ASSISTENTE_VAZIO,
  aoTrocarNumero,
  errosDoPasso,
  estadoInicial,
  quandoPadrao,
  redutorDoAssistente,
} from "@/lib/escale/campanhas/estado-do-assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";

const OFICIAL: NumeroDaCampanha = {
  id: "n1",
  nome: "Of",
  telefone: null,
  conectado: true,
  oficial: true,
  provider: "p",
  setor: null,
};
const LIVRE: NumeroDaCampanha = { ...OFICIAL, id: "n2", oficial: false };
const AGORA = new Date("2026-11-20T12:00:00.000Z");

describe("redutorDoAssistente", () => {
  it("muda campos, o passo 3 e o público sem perder o resto", () => {
    let e = estadoInicial();
    e = redutorDoAssistente(e, { tipo: "mudar", campos: { nome: "Reativação" } });
    e = redutorDoAssistente(e, { tipo: "mudarPosEnvio", campos: { tags: ["x"] } });
    e = redutorDoAssistente(e, {
      tipo: "mudarPublico",
      publico: { selecao: null, avulsos: ["c1"], removidos: [] },
    });
    expect(e.dados.nome).toBe("Reativação");
    expect(e.dados.posEnvio).toEqual({ ...POS_ENVIO_PADRAO, tags: ["x"] });
    expect(e.dados.publico.avulsos).toEqual(["c1"]);
  });

  it("ir para outro passo limpa o 'tentou'; salvar guarda o id; carregar substitui", () => {
    let e = redutorDoAssistente(estadoInicial(), { tipo: "tentou" });
    expect(e.tentou).toBe(true);
    e = redutorDoAssistente(e, { tipo: "irPara", passo: 1 });
    expect(e).toMatchObject({ passo: 1, tentou: false });
    e = redutorDoAssistente(e, { tipo: "salvo", campanhaId: "c-1" });
    expect(e.campanhaId).toBe("c-1");
    e = redutorDoAssistente(e, {
      tipo: "carregar",
      campanhaId: "c-2",
      dados: { ...ASSISTENTE_VAZIO, nome: "Antiga" },
      publicoAntigo: true,
    });
    expect(e).toMatchObject({ passo: 0, campanhaId: "c-2", publicoAntigo: true });
    expect(e.dados.nome).toBe("Antiga");
    expect(redutorDoAssistente(e, { tipo: "reiniciar" })).toEqual(estadoInicial());
  });
});

describe("aoTrocarNumero", () => {
  it("oficial: a mensagem vira modelo (vazio) e os extras saem", () => {
    const r = aoTrocarNumero(
      { ...ASSISTENTE_VAZIO, mensagem: { tipo: "texto", texto: "oi" }, numerosExtras: ["n9"] },
      OFICIAL,
    );
    expect(r.numeroId).toBe("n1");
    expect(r.mensagem?.tipo).toBe("modelo");
    expect(r.numerosExtras).toEqual([]);
  });

  it("não oficial: o modelo vira texto vazio; texto continua", () => {
    const modelo = {
      tipo: "modelo" as const,
      nome: "m",
      idioma: "pt_BR",
      categoria: null,
      corpo: "x",
      variaveis: {},
    };
    expect(aoTrocarNumero({ ...ASSISTENTE_VAZIO, mensagem: modelo }, LIVRE).mensagem).toEqual({
      tipo: "texto",
      texto: "",
    });
    expect(
      aoTrocarNumero({ ...ASSISTENTE_VAZIO, mensagem: { tipo: "texto", texto: "oi" } }, LIVRE)
        .mensagem,
    ).toBeUndefined();
  });
});

describe("errosDoPasso", () => {
  const base = {
    ...ASSISTENTE_VAZIO,
    nome: "Reativação",
    numeroId: "n2",
    mensagem: { tipo: "texto" as const, texto: "Oi" },
  };

  it("passo 1: nome, dispositivo, mensagem, modelo, agendamento e LIA", () => {
    expect(errosDoPasso(0, base, { numero: LIVRE, agora: AGORA })).toEqual({});
    expect(
      errosDoPasso(0, { ...base, nome: "ab" }, { numero: LIVRE, agora: AGORA }),
    ).toHaveProperty("nome");
    expect(
      errosDoPasso(0, { ...base, numeroId: "" }, { numero: null, agora: AGORA }),
    ).toHaveProperty("numeroId");
    expect(
      errosDoPasso(
        0,
        { ...base, mensagem: { tipo: "texto", texto: " " } },
        { numero: LIVRE, agora: AGORA },
      ),
    ).toHaveProperty("mensagem");
    const modeloSemVariavel = {
      tipo: "modelo" as const,
      nome: "m",
      idioma: "pt_BR",
      categoria: null,
      corpo: "Oi {{1}}",
      variaveis: {},
    };
    expect(
      errosDoPasso(
        0,
        { ...base, numeroId: "n1", mensagem: modeloSemVariavel },
        { numero: OFICIAL, agora: AGORA },
      ).mensagem,
    ).toBe("Resolva as variáveis do modelo para avançar.");
    const modeloSemNome = { ...modeloSemVariavel, nome: "" };
    expect(
      errosDoPasso(
        0,
        { ...base, numeroId: "n1", mensagem: modeloSemNome },
        { numero: OFICIAL, agora: AGORA },
      ).mensagem,
    ).toBe("Escolha um modelo de mensagem.");
    expect(
      errosDoPasso(
        0,
        { ...base, quando: { modo: "agendar", em: "2026-11-20T11:00:00.000Z" } },
        { numero: LIVRE, agora: AGORA },
      ).quando,
    ).toBe("A hora selecionada não pode ser menor que o horário atual.");
    expect(
      errosDoPasso(
        0,
        { ...base, baseLegal: "legitimate_interest" },
        { numero: LIVRE, agora: AGORA },
      ),
    ).toHaveProperty("lia");
  });

  it("passo 2: pelo menos um destinatário", () => {
    expect(errosDoPasso(1, base, { numero: LIVRE, agora: AGORA }).publico).toBe(
      "Você deve selecionar pelo menos um contato.",
    );
    expect(
      errosDoPasso(
        1,
        { ...base, publico: { selecao: null, avulsos: ["c"], removidos: [] } },
        { numero: LIVRE, agora: AGORA },
      ),
    ).toEqual({});
  });

  it("passo 3: origem pede etapa", () => {
    expect(
      errosDoPasso(
        2,
        { ...base, posEnvio: { ...POS_ENVIO_PADRAO, origemId: "o" } },
        { numero: LIVRE, agora: AGORA },
      ).etapaId,
    ).toBe("Selecione uma etapa");
  });
});

describe("quandoPadrao", () => {
  it("daqui a uma hora, em minutos redondos de 5", () => {
    expect(quandoPadrao(new Date("2026-11-20T12:02:30.000Z"))).toBe("2026-11-20T13:05:00.000Z");
  });
});
