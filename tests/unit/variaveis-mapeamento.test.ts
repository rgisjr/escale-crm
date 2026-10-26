import { describe, expect, it } from "vitest";

import { deriveTemplateContract } from "@/lib/channels/meta/template-contract";
import {
  erroDoTextoFixo,
  mapeamentoAtual,
  mapeamentoCompleto,
  slotsDoMapeamento,
  tokenDoCampoAntigo,
  validarMapeamento,
  valoresDoMapeamento,
} from "@/lib/variaveis/mapeamento";

/** FORK ESCALE · Frente V (Task 9): o mapeamento das variáveis do modelo da Meta. */
const CONTRATO = deriveTemplateContract({
  name: "oi",
  language: "pt_BR",
  parameter_format: "POSITIONAL",
  components: [
    { type: "HEADER", format: "IMAGE" },
    { type: "BODY", text: "Olá {{1}}, sua obra {{2}} está pronta." },
    { type: "BUTTONS", buttons: [{ type: "URL", text: "Ver", url: "https://x.com/{{1}}" }] },
  ] as never,
});

const FONTES = {
  contato: { id: "c-1", nome: "Ana Paula", email: null, telefone: null },
  negocio: { id: "l-1", criadoEm: null, status: "open", etapa: null, valorCentavos: null, moeda: null, campos: { obra: "Casa" } },
};

describe("slotsDoMapeamento", () => {
  it("sem o cabeçalho de mídia; o botão marcado", () => {
    expect(slotsDoMapeamento(CONTRATO).map((s) => [s.chave, s.botao])).toEqual([
      ["1", false],
      ["2", false],
      ["button0:1", true],
    ]);
  });
});

describe("erroDoTextoFixo (regras do WhatsApp)", () => {
  it.each([
    ["linha\nquebrada"],
    ["com\ttab"],
    ["quatro    espaços"],
    ["x".repeat(1025)],
  ])("recusa %#", (valor) => expect(erroDoTextoFixo(valor)).toMatch(/WhatsApp recusa/));
  it("aceita o normal", () => expect(erroDoTextoFixo("Olá, tudo bem?")).toBeNull());
});

describe("validarMapeamento", () => {
  it("parcial passa (pode salvar agora); alternativo vazio vira null", () => {
    const r = validarMapeamento(CONTRATO, {
      "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: "  " },
    });
    expect(r).toEqual({ ok: true, mapa: { "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: null } } });
  });

  it("recusa chave fora do contrato, fixo inválido, fixo em botão e campo desconhecido", () => {
    expect(validarMapeamento(CONTRATO, { "9": { fonte: "fixo", valor: "x" } })).toMatchObject({ ok: false });
    expect(validarMapeamento(CONTRATO, { "1": { fonte: "fixo", valor: "a\nb" } })).toMatchObject({
      ok: false,
      erros: { "1": expect.stringMatching(/WhatsApp recusa/) },
    });
    expect(validarMapeamento(CONTRATO, { "button0:1": { fonte: "fixo", valor: "x" } })).toMatchObject({
      ok: false,
      erros: { "button0:1": expect.stringMatching(/Variável de botão/) },
    });
    expect(validarMapeamento(CONTRATO, { "1": { fonte: "campo", campo: "contact.name", alternativo: null } })).toMatchObject({
      ok: false,
    });
    expect(validarMapeamento(CONTRATO, "lixo")).toMatchObject({ ok: false });
  });

  it("campo antigo da campanha continua válido", () => {
    expect(validarMapeamento(CONTRATO, { "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null } })).toMatchObject({
      ok: true,
    });
  });
});

describe("mapeamentoCompleto e mapeamentoAtual", () => {
  const COMPLETO = {
    "1": { fonte: "campo" as const, campo: "[CONTACT.FIRST_NAME]", alternativo: null },
    "2": { fonte: "fixo" as const, valor: "nova" },
    "button0:1": { fonte: "campo" as const, campo: "[DEAL.ID]", alternativo: null },
  };
  it("completo só com todo slot sem mídia definido", () => {
    expect(mapeamentoCompleto(CONTRATO, COMPLETO)).toBe(true);
    const { ["2"]: _fora, ...parcial } = COMPLETO;
    expect(mapeamentoCompleto(CONTRATO, parcial)).toBe(false);
  });
  it("mapeamento de outro contrato (modelo mudou na Meta) é tratado como vazio (D12)", () => {
    expect(mapeamentoAtual("h2", { variaveis: COMPLETO, variaveis_contrato: "h1" })).toEqual({});
    expect(mapeamentoAtual("h1", { variaveis: COMPLETO, variaveis_contrato: "h1" })).toEqual(COMPLETO);
    expect(mapeamentoAtual("h1", { variaveis: COMPLETO, variaveis_contrato: null })).toEqual({});
  });
});

describe("valoresDoMapeamento", () => {
  it("campo, fixo, alternativo e falta (nada sai com lacuna)", () => {
    const r = valoresDoMapeamento(
      CONTRATO,
      {
        "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: null },
        "2": { fonte: "campo", campo: "[DEAL.STAGE]", alternativo: "em andamento" },
        "button0:1": { fonte: "campo", campo: "[CONTACT.EMAIL]", alternativo: null },
      },
      FONTES,
    );
    expect(r).toEqual({ valores: { "1": "Ana", "2": "em andamento" }, faltando: ["button0:1"] });
  });

  it("campo antigo e saudação (só com o instante)", () => {
    const mapa = {
      "1": { fonte: "campo" as const, campo: "saudacao", alternativo: null },
      "2": { fonte: "campo" as const, campo: "lead.obra", alternativo: null },
      "button0:1": { fonte: "fixo" as const, valor: "abc" },
    };
    expect(valoresDoMapeamento(CONTRATO, mapa, FONTES).faltando).toEqual(["1"]);
    const quando = { agora: new Date("2026-10-25T20:00:00Z"), fuso: "America/Sao_Paulo" };
    expect(valoresDoMapeamento(CONTRATO, mapa, FONTES, quando)).toEqual({
      valores: { "1": "Boa tarde", "2": "Casa", "button0:1": "abc" },
      faltando: [],
    });
  });

  it("slot sem definição falta", () => {
    expect(valoresDoMapeamento(CONTRATO, {}, FONTES).faltando).toEqual(["1", "2", "button0:1"]);
  });

  it("os campos antigos viram tokens", () => {
    expect(["nome", "primeiro_nome", "saudacao", "lead.obra", "contato.cpf"].map(tokenDoCampoAntigo)).toEqual([
      "[CONTACT.NAME]",
      "[CONTACT.FIRST_NAME]",
      "{{saudacao}}",
      "[DEAL.OBRA]",
      "[CONTACT.CPF]",
    ]);
  });
});
