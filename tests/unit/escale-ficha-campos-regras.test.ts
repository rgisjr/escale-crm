import { describe, expect, it } from "vitest";

import {
  campoVazio,
  dataBrDeIso,
  dataIsoDeBr,
  filtrarCampos,
  lerOcultarVazios,
  patchDoContato,
  reaisDeTexto,
  telefoneParaGravar,
  textoDeNumero,
  textoDeReais,
  textoDeTelefone,
  valorParaGravar,
  valorParaLeitura,
  type CampoEditavel,
} from "@/lib/escale/negocio/campos";

/** FORK ESCALE · Fase 1H (C10, C14): as regras puras dos campos editáveis da ficha. */
const t = (s: string) => s;
const campo = (
  chave: string,
  valor: unknown,
  extra: Partial<CampoEditavel> = {},
): CampoEditavel => ({
  chave,
  rotulo: chave,
  tipo: "text",
  valor,
  ...extra,
});

describe("leitura do valor (o que a caixa mostra)", () => {
  it("vazio é null; lista e múltipla mostram o rótulo; data vira dd/mm/aaaa; Sim/Não; moeda em reais", () => {
    const opcoes = [
      { value: "g", label: "Google" },
      { value: "m", label: "Meta" },
    ];
    expect(valorParaLeitura("text", undefined, "", t)).toBeNull();
    expect(valorParaLeitura("select", opcoes, "g", t)).toBe("Google");
    expect(valorParaLeitura("multiselect", opcoes, ["g", "m"], t)).toBe("Google, Meta");
    expect(valorParaLeitura("date", undefined, "2026-10-17", t)).toBe("17/10/2026");
    expect(valorParaLeitura("boolean", undefined, true, t)).toBe("Sim");
    expect(valorParaLeitura("currency", undefined, 1500.5, t)).toBe("1.500,50");
  });

  it("campoVazio: null, undefined, '' e [] são vazios; 0 e false não", () => {
    expect(campoVazio(null)).toBe(true);
    expect(campoVazio("")).toBe(true);
    expect(campoVazio([])).toBe(true);
    expect(campoVazio(0)).toBe(false);
    expect(campoVazio(false)).toBe(false);
  });
});

describe("busca e vazios (N3)", () => {
  const campos = [campo("nome", "Ana"), campo("cargo", null), campo("email", "a@b.c")];
  it("a busca filtra pelo rótulo, sem acento e sem caixa", () => {
    expect(filtrarCampos(campos, "CARGO", false).map((c) => c.chave)).toEqual(["cargo"]);
    expect(filtrarCampos(campos, "", false)).toHaveLength(3);
  });
  it("ocultar vazios tira os sem valor", () => {
    expect(filtrarCampos(campos, "", true).map((c) => c.chave)).toEqual(["nome", "email"]);
  });
  it("lerOcultarVazios: o padrão é mostrar tudo (a flag da Clint é invertida)", () => {
    const storage = new Map<string, string>();
    expect(lerOcultarVazios({ getItem: (k) => storage.get(k) ?? null }, "contato")).toBe(false);
    storage.set("escale_campos_vazios_contato", "1");
    expect(lerOcultarVazios({ getItem: (k) => storage.get(k) ?? null }, "contato")).toBe(true);
    expect(lerOcultarVazios(null, "contato")).toBe(false);
  });
});

describe("telefone na tela", () => {
  it("o canônico BR aparece formatado: (43) 99803-1566 (o mesmo formato da lista de contatos)", () => {
    expect(textoDeTelefone("+5543998031566")).toBe("(43) 99803-1566");
    expect(textoDeTelefone("+554332223344")).toBe("(43) 3222-3344");
    expect(valorParaLeitura("phone", undefined, "+5543998031566", t)).toBe("(43) 99803-1566");
  });
  it("outro país não quebra; o que não é número fica como está", () => {
    expect(textoDeTelefone("+351912345678")).toBe("+351 912345678");
    expect(textoDeTelefone("+14155551234")).toBe("+1 4155551234");
    expect(textoDeTelefone("abc")).toBe("abc");
    expect(textoDeTelefone("43998031566")).toBe("43998031566");
    expect(textoDeTelefone(null)).toBe("");
  });
  it("o formato de tela volta para o mesmo canônico na hora de gravar", () => {
    const tela = textoDeTelefone("+5543998031566");
    expect(telefoneParaGravar(tela)).toEqual({ ok: true, valor: "+5543998031566" });
  });
});

describe("o que vai para o banco", () => {
  it("telefone: canônico com +; 10 ou 11 dígitos sem + ganham +55; inválido recusa", () => {
    expect(telefoneParaGravar("+55 43 99803-1566")).toEqual({ ok: true, valor: "+5543998031566" });
    expect(telefoneParaGravar("(43) 99803-1566")).toEqual({ ok: true, valor: "+5543998031566" });
    expect(telefoneParaGravar("4332223344")).toEqual({ ok: true, valor: "+554332223344" });
    expect(telefoneParaGravar("123")).toEqual({
      ok: false,
      erro: "O telefone informado está inválido.",
    });
    expect(telefoneParaGravar("")).toEqual({
      ok: false,
      erro: "Para apagar o telefone, use a ficha do contato.",
    });
  });

  it("data: dd/mm/aaaa ↔ ISO, e recusa data impossível", () => {
    expect(dataIsoDeBr("17/10/2026")).toBe("2026-10-17");
    expect(dataIsoDeBr("31/02/2026")).toBeNull();
    expect(dataIsoDeBr("2026-10-17")).toBe("2026-10-17");
    expect(dataBrDeIso("2026-10-17")).toBe("17/10/2026");
  });

  it("moeda: texto brasileiro ↔ número em reais", () => {
    expect(reaisDeTexto("1.500,50")).toBe(1500.5);
    expect(reaisDeTexto("R$ 1500")).toBe(1500);
    expect(reaisDeTexto("abc")).toBeNull();
    expect(textoDeReais(1500.5)).toBe("1.500,50");
  });

  it("moeda: sem vírgula, ponto seguido de 3 dígitos é separador de milhar", () => {
    expect(reaisDeTexto("1.500")).toBe(1500);
    expect(reaisDeTexto("12.345")).toBe(12345);
    expect(reaisDeTexto("1.500.000")).toBe(1500000);
    expect(reaisDeTexto("R$ 1.500")).toBe(1500);
    expect(reaisDeTexto("1.500,50")).toBe(1500.5);
    expect(reaisDeTexto("1.500.000,5")).toBe(1500000.5);
    // continuam decimais
    expect(reaisDeTexto("1,5")).toBe(1.5);
    expect(reaisDeTexto("1500,50")).toBe(1500.5);
    expect(reaisDeTexto("10.5")).toBe(10.5);
    expect(reaisDeTexto("10.50")).toBe(10.5);
    expect(valorParaGravar("currency", "1.500")).toEqual({ ok: true, valor: 1500 });
    expect(valorParaGravar("currency", "1.500.000")).toEqual({ ok: true, valor: 1500000 });
    expect(valorParaGravar("currency", "abc")).toEqual({ ok: false, erro: "Digite um valor." });
  });

  it("valorParaGravar por tipo: vazio vira null; número e moeda viram número; data vira ISO", () => {
    expect(valorParaGravar("text", "  Ana ")).toEqual({ ok: true, valor: "Ana" });
    expect(valorParaGravar("text", "   ")).toEqual({ ok: true, valor: null });
    expect(valorParaGravar("number", "12,5")).toEqual({ ok: true, valor: 12.5 });
    expect(valorParaGravar("number", "x")).toEqual({ ok: false, erro: "Digite um número." });
    expect(valorParaGravar("currency", "1.500,50")).toEqual({ ok: true, valor: 1500.5 });
    expect(valorParaGravar("date", "17/10/2026")).toEqual({ ok: true, valor: "2026-10-17" });
    expect(valorParaGravar("date", "99/99/9999")).toEqual({
      ok: false,
      erro: "Digite uma data válida (dd/mm/aaaa).",
    });
    expect(valorParaGravar("email", "ana@")).toEqual({
      ok: false,
      erro: "Necessário ser um email válido.",
    });
    expect(valorParaGravar("url", "escaleia.com")).toEqual({
      ok: true,
      valor: "https://escaleia.com/",
    });
  });
});

describe("patch do contato (N4)", () => {
  const contato = { custom_fields: { cargo: "CEO", link_site: "https://a.com" } };
  const coluna = (chave: string) => ({ chave, origem: "coluna" as const });
  const link = (chave: string) => ({ chave, origem: "link" as const });
  const crm = (chave: string) => ({ chave, origem: "crm" as const });
  it("nome, telefone e e-mail vão nas colunas; o resto em custom_fields INTEIRO", () => {
    expect(patchDoContato(contato, coluna("nome"), "Ana")).toEqual({ name: "Ana" });
    expect(patchDoContato(contato, coluna("telefone"), "+5543998031566")).toEqual({
      phone_number: "+5543998031566",
    });
    expect(patchDoContato(contato, coluna("email"), "a@b.co")).toEqual({ email: "a@b.co" });
    expect(patchDoContato(contato, crm("cargo"), "CTO")).toEqual({
      custom_fields: { cargo: "CTO", link_site: "https://a.com" },
    });
  });
  it("um link vai pela chave link_<tipo>, normalizado; vazio apaga a chave", () => {
    expect(patchDoContato(contato, link("link_instagram"), "https://instagram.com/ana")).toEqual({
      custom_fields: {
        cargo: "CEO",
        link_site: "https://a.com",
        link_instagram: "https://instagram.com/ana",
      },
    });
    expect(patchDoContato(contato, link("link_site"), null)).toEqual({
      custom_fields: { cargo: "CEO" },
    });
  });
  it("e-mail e telefone vazios não geram patch", () => {
    expect(patchDoContato(contato, coluna("email"), null)).toBeNull();
    expect(patchDoContato(contato, coluna("telefone"), "")).toBeNull();
  });

  // Revisão final (I5): o roteamento é pela ORIGEM do campo, nunca pelo texto da chave.
  it("campo do CRM com chave valor/nome/telefone/email/link_x vai para custom_fields", () => {
    for (const chave of ["valor", "nome", "telefone", "email", "link_x", "link_site"]) {
      expect(patchDoContato(contato, crm(chave), "texto livre")).toEqual({
        custom_fields: { ...contato.custom_fields, [chave]: "texto livre" },
      });
    }
  });
  it("só as chaves do catálogo de links passam pelo ramo do link", () => {
    expect(patchDoContato(contato, link("link_x"), "https://a.com")).toBeNull();
  });
});

describe("número (revisão final, I3)", () => {
  it("mostra no formato brasileiro e volta igual", () => {
    expect(textoDeNumero(12.5)).toBe("12,5");
    expect(textoDeNumero(1500)).toBe("1.500");
    expect(textoDeNumero(-1.5)).toBe("-1,5");
    for (const n of [12.5, 1500, -1.5, 1234.5, 0.25, 1500000]) {
      expect(valorParaGravar("number", textoDeNumero(n))).toEqual({ ok: true, valor: n });
    }
  });
  it("ponto com 3 dígitos é milhar; ponto decimal sem vírgula continua decimal", () => {
    expect(valorParaGravar("number", "1.500")).toEqual({ ok: true, valor: 1500 });
    expect(valorParaGravar("number", "12.5")).toEqual({ ok: true, valor: 12.5 });
    expect(valorParaGravar("number", "-1.5")).toEqual({ ok: true, valor: -1.5 });
    expect(valorParaGravar("number", "1.500,25")).toEqual({ ok: true, valor: 1500.25 });
    expect(valorParaGravar("number", "12abc")).toEqual({ ok: false, erro: "Digite um número." });
  });
  it("a leitura do número também é brasileira", () => {
    expect(valorParaLeitura("number", undefined, 1234.5, t)).toBe("1.234,5");
  });
});

describe("telefone sem DDD (revisão final)", () => {
  it("sem '+', só 10–11 dígitos (ou 12–13 começando com 55) valem", () => {
    expect(telefoneParaGravar("998031566")).toEqual({
      ok: false,
      erro: "O telefone informado está inválido.",
    });
    expect(telefoneParaGravar("98031566")).toEqual({
      ok: false,
      erro: "O telefone informado está inválido.",
    });
    expect(telefoneParaGravar("5543998031566")).toEqual({ ok: true, valor: "+5543998031566" });
    expect(telefoneParaGravar("+1 415 555 0100")).toEqual({ ok: true, valor: "+14155550100" });
  });
});
