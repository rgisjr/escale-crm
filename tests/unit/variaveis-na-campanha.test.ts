import { describe, expect, it } from "vitest";

import { camposUsadosNoTexto, renderizar } from "@/lib/campanhas/renderizador";
import type { MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import {
  fontesDoDestinatario,
  tokenDaCampanha,
  tokenDoCampo,
  tokensDoModelo,
  valoresDoModelo,
} from "@/lib/escale/campanhas/modelo";
import { mensagemDoModelo } from "@/lib/escale/campanhas/modelos-da-meta";
import { partesDoTexto } from "@/lib/escale/campanhas/previa";

/** FORK ESCALE · Frente V (Task 12): a campanha com a lista única e o mapeamento salvo. */
const modelo = (variaveis: MensagemDeModelo["variaveis"]): MensagemDeModelo => ({
  tipo: "modelo",
  nome: "oi",
  idioma: "pt_BR",
  categoria: null,
  corpo: "Olá {{1}}, sobre {{2}}.",
  variaveis,
});
const ANA = { nome: "Ana Paula", lead: { gancho: "obra" }, contato: { link: "https://x" } };

describe("tokens da campanha", () => {
  it("o que a campanha sabe resolver", () => {
    expect(["[CONTACT.FIRST_NAME]", "[CONTACT.NAME]", "[DEAL.GANCHO]", "[CONTACT.LINK]", "{{saudacao}}"].every(tokenDaCampanha)).toBe(true);
    expect(["[DEAL.STAGE]", "[USER.FIRST_NAME]", "[ORGANIZATION.NAME]", "[CONTACT.EMAIL]"].some(tokenDaCampanha)).toBe(false);
    expect(tokenDoCampo("[CONTACT.NAME]")).toBe("[CONTACT.NAME]");
    expect(tokenDoCampo("primeiro_nome")).toBe("{{primeiro_nome}}");
  });

  it("o modelo diz à audiência que mapas buscar", () => {
    const m = modelo({
      "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: null },
      "2": { fonte: "campo", campo: "[DEAL.GANCHO]", alternativo: null },
    });
    expect(camposUsadosNoTexto(tokensDoModelo(m))).toEqual({ lead: true, contato: false });
    expect(camposUsadosNoTexto("Oi [CONTACT.FIRST_NAME], veja [CONTACT.LINK]")).toEqual({ lead: false, contato: true });
  });
});

describe("valoresDoModelo", () => {
  it("token novo resolve com o nome e os campos do destinatário", () => {
    const m = modelo({
      "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: null },
      "2": { fonte: "campo", campo: "[DEAL.GANCHO]", alternativo: null },
    });
    expect(valoresDoModelo(m, ANA)).toEqual({ valores: { "1": "Ana", "2": "obra" }, faltando: [] });
  });

  it("sem o dado: alternativo, senão falta", () => {
    const m = modelo({
      "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: "cliente" },
      "2": { fonte: "campo", campo: "[DEAL.GANCHO]", alternativo: null },
    });
    expect(valoresDoModelo(m, { nome: "", lead: null })).toEqual({ valores: { "1": "cliente" }, faltando: ["2"] });
  });

  it("regressão: a campanha antiga (primeiro_nome, lead.x) sai igual", () => {
    const m = modelo({
      "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null },
      "2": { fonte: "campo", campo: "lead.gancho", alternativo: null },
    });
    expect(valoresDoModelo(m, ANA)).toEqual({ valores: { "1": "Ana", "2": "obra" }, faltando: [] });
  });
});

describe("texto livre", () => {
  it("o token novo resolve na preparação e o que falta tira a pessoa", () => {
    const r = renderizar("Oi [CONTACT.FIRST_NAME], [DEAL.GANCHO] {{saudacao}}", {
      ...ANA,
      fontes: fontesDoDestinatario(ANA),
    });
    expect(r).toEqual({ texto: "Oi Ana, obra {{saudacao}}", faltando: [], desconhecidas: [] });
    const semNegocio = { nome: "Ana", lead: null };
    expect(renderizar("[DEAL.GANCHO]", { ...semNegocio, fontes: fontesDoDestinatario(semNegocio) }).faltando).toEqual([
      "DEAL.GANCHO",
    ]);
  });

  it("a prévia mostra o chip com o rótulo", () => {
    expect(partesDoTexto("Oi [CONTACT.FIRST_NAME] e {{nome}}", [])).toEqual([
      { tipo: "texto", texto: "Oi " },
      { tipo: "variavel", rotulo: "Primeiro nome" },
      { tipo: "texto", texto: " e " },
      { tipo: "variavel", rotulo: "Nome" },
    ]);
    expect(partesDoTexto("[DEAL.GANCHO]", [{ campo: "lead.gancho", rotulo: "Gancho" }])).toEqual([
      { tipo: "variavel", rotulo: "Gancho" },
    ]);
  });
});

describe("mensagemDoModelo com o mapeamento salvo", () => {
  it("vem preenchida com o que a campanha resolve; o resto fica para escolher", () => {
    const m = mensagemDoModelo({
      name: "oi",
      language: "pt_BR",
      status: "APPROVED",
      components: [{ type: "BODY", text: "Olá {{1}}, {{2}}, {{3}}." }],
      slots: [
        { key: "1", expects: "text", onde: "corpo", valueKey: "1" },
        { key: "2", expects: "text", onde: "corpo", valueKey: "2" },
        { key: "3", expects: "text", onde: "corpo", valueKey: "3" },
      ],
      mapeamento: {
        desatualizado: false,
        variaveis: {
          "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: "cliente" },
          "2": { fonte: "campo", campo: "[DEAL.STAGE]", alternativo: null },
          "3": { fonte: "fixo", valor: "obra" },
        },
      },
    });
    expect(m.variaveis).toEqual({
      "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: "cliente" },
      "3": { fonte: "fixo", valor: "obra" },
    });
  });
});
