import { describe, expect, it } from "vitest";

import { renderTemplate } from "@/lib/automation/template";
import { renderizar } from "@/lib/campanhas/renderizador";
import { interpolateTemplate } from "@/lib/inbox/template-vars";

/**
 * FORK ESCALE · Frente V (Task 2): a cerca da troca do resolvedor.
 *
 * Estes casos foram gravados com as funções de ANTES da lista única de
 * variáveis. Os textos já salvos (automações ativas, campanhas em andamento,
 * respostas rápidas) usam os formatos antigos, e cada um tem a sua regra
 * (o "dialeto" de onde foi escrito). Depois da troca, nenhuma expectativa
 * daqui pode mudar.
 */

const CONTEXTO_DA_AUTOMACAO = {
  contact: { id: "c1", name: "Ana Paula Souza", email: "ana@x.com", phone_number: "+5543999990000" },
  lead: {
    id: "l1",
    title: "Pedido X",
    custom_fields: { servico: "projeto", interesses: ["a", "b"], vazio: "" },
  },
};

describe("automação (renderTemplate): o texto salvo sai igual", () => {
  const casos: Array<[string, string]> = [
    ["Oi {{nome}}, tudo bem?", "Oi Ana Paula Souza, tudo bem?"],
    ["Oi {{primeiro_nome}}!", "Oi Ana!"],
    ["Tel {{telefone}} / {{email}}", "Tel +5543999990000 / ana@x.com"],
    ["{{lead.title}} para {{contact.name}}", "Pedido X para Ana Paula Souza"],
    ["Serviço: {{servico}} ({{lead.custom_fields.servico}})", "Serviço: projeto (projeto)"],
    ["{{interesses}}", "a, b"],
    ["X{{fantasma}}Y{{lead.ghost}}Z", "XYZ"],
    ["{{ nome }}", "Ana Paula Souza"],
    ["{{constructor}}{{toString}}", ""],
    ["Colchete [livre] fica", "Colchete [livre] fica"],
  ];
  for (const [entrada, saida] of casos) {
    it(entrada, () => expect(renderTemplate(entrada, CONTEXTO_DA_AUTOMACAO)).toBe(saida));
  }
  it("o formatador de HTML escapa só o valor", () => {
    const ctx = { contact: { name: "<b>Ana</b>" } };
    const esc = (v: string) => v.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    expect(renderTemplate("<p>{{nome}}</p>", ctx, esc)).toBe("<p>&lt;b&gt;Ana&lt;/b&gt;</p>");
  });
  it("contato sem nome: vazio", () => {
    expect(renderTemplate("Oi {{primeiro_nome}}!", { contact: { name: null } })).toBe("Oi !");
  });
});

describe("inbox e respostas rápidas (interpolateTemplate): o texto salvo sai igual", () => {
  it("nome e primeiro nome", () => {
    expect(interpolateTemplate("Oi {{nome}} / {{primeiro_nome}}", { name: "Ana Paula" })).toBe(
      "Oi Ana Paula / Ana",
    );
  });
  it("sem nome, o literal sobrevive; cai no display_name", () => {
    expect(interpolateTemplate("Oi {{nome}}", { name: null })).toBe("Oi {{nome}}");
    expect(interpolateTemplate("Oi {{primeiro_nome}}", { name: "", displayName: "Bia Lima" })).toBe(
      "Oi Bia",
    );
  });
  it("desconhecida e caminho ficam literais", () => {
    expect(interpolateTemplate("{{codigo}} {{lead.x}}", { name: "Ana" })).toBe("{{codigo}} {{lead.x}}");
  });
});

describe("campanha (renderizar): o texto salvo sai igual", () => {
  const quando = { agora: new Date("2026-10-25T13:00:00Z"), fuso: "America/Sao_Paulo" };
  it("nome, primeiro nome e campos personalizados", () => {
    const r = renderizar(
      "{{saudacao}}, {{primeiro_nome}}! {{lead.gancho}} {{contato.link_previa}} {{lead.custom_fields.gancho}}",
      { nome: "Ana Paula", lead: { gancho: "obra" }, contato: { link_previa: "https://x" } },
      quando,
    );
    expect(r).toEqual({
      texto: "Bom dia, Ana! obra https://x obra",
      faltando: [],
      desconhecidas: [],
    });
  });
  it("falta e desconhecida", () => {
    const r = renderizar("Oi {{nome}} {{lead.gancho}} {{sobrenome}}", { nome: "", lead: null });
    expect(r).toEqual({
      texto: "Oi {{nome}} {{lead.gancho}} {{sobrenome}}",
      faltando: ["nome", "lead.gancho"],
      desconhecidas: ["sobrenome"],
    });
  });
  it("saudação sem instante fica literal (prévia)", () => {
    expect(renderizar("{{saudacao}} {{nome}}", { nome: "Ana" }).texto).toBe("{{saudacao}} Ana");
  });
  it("protótipo não vaza", () => {
    expect(renderizar("{{lead.__proto__}}", { nome: "Ana", lead: {} }).faltando).toEqual([
      "lead.__proto__",
    ]);
  });
});
