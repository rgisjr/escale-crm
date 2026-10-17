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
  textoDeReais,
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
  it("nome, telefone e e-mail vão nas colunas; o resto em custom_fields INTEIRO", () => {
    expect(patchDoContato(contato, "nome", "Ana")).toEqual({ name: "Ana" });
    expect(patchDoContato(contato, "telefone", "+5543998031566")).toEqual({
      phone_number: "+5543998031566",
    });
    expect(patchDoContato(contato, "email", "a@b.co")).toEqual({ email: "a@b.co" });
    expect(patchDoContato(contato, "cargo", "CTO")).toEqual({
      custom_fields: { cargo: "CTO", link_site: "https://a.com" },
    });
  });
  it("um link vai pela chave link_<tipo>, normalizado; vazio apaga a chave", () => {
    expect(patchDoContato(contato, "link_instagram", "https://instagram.com/ana")).toEqual({
      custom_fields: {
        cargo: "CEO",
        link_site: "https://a.com",
        link_instagram: "https://instagram.com/ana",
      },
    });
    expect(patchDoContato(contato, "link_site", null)).toEqual({ custom_fields: { cargo: "CEO" } });
  });
  it("e-mail e telefone vazios não geram patch", () => {
    expect(patchDoContato(contato, "email", null)).toBeNull();
    expect(patchDoContato(contato, "telefone", "")).toBeNull();
  });
});
