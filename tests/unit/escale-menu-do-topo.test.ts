import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";
import type { ModuloOpcional } from "@/lib/instalacao/modulos";
import { NAV_GROUPS, searchable } from "@/lib/navigation/registry";
import {
  ACOES_DE_CRIAR,
  ITENS_DO_TOPO,
  acoesDeCriar,
  destinoAtivo,
  entradaDaIa,
  itemAtivo,
  montarMenuDoTopo,
  textoDoSelo,
} from "@/lib/escale/menu-do-topo";

const COM_EMPRESAS: ModuloOpcional[] = ["crm_b2b"];
const ADMIN = searchable(false, "admin", undefined, COM_EMPRESAS, []);
const AGENT = searchable(false, "agent", undefined, [], []);
const AGENT_COM_PROPOSTAS = searchable(false, "agent", undefined, [], ["propostas"]);
const VIEWER = searchable(false, "viewer", undefined, [], []);

describe("menu do topo (igual ao da Clint, variante superior)", () => {
  it("admin vê os 7 itens da Clint, na ordem da Clint", () => {
    expect(montarMenuDoTopo(ADMIN).topo.map((i) => i.rotulo)).toEqual([
      "Negócios",
      "Contatos",
      "Atividades",
      "Atendimento",
      "Automações",
      "Campanhas",
      "Indicadores",
    ]);
  });

  it("Atendimento é o nosso Conversas, com o contador da fila; Campanhas é a tela de campanhas", () => {
    const topo = montarMenuDoTopo(ADMIN).topo;
    expect(topo.find((i) => i.rotulo === "Atendimento")).toMatchObject({ href: "/app/inbox", contador: "fila" });
    expect(topo.find((i) => i.rotulo === "Campanhas")?.href).toBe("/app/campaigns");
  });

  it("Empresas, Agenda e Agentes IA saem do topo e vão para o Mais", () => {
    const menu = montarMenuDoTopo(ADMIN);
    const saem = ["/app/companies", "/app/agenda", "/app/ai/agents"];
    const noMais = menu.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens.map((d) => d.href)));
    expect(noMais).toEqual(expect.arrayContaining(saem));
    expect(menu.topo.some((i) => saem.includes(i.href))).toBe(false);
  });

  it("item que o papel ou o módulo não permite não aparece (mesma regra da lateral)", () => {
    expect(montarMenuDoTopo(AGENT).topo.map((i) => i.href)).toEqual([
      "/app/kanban",
      "/app/contacts",
      "/app/tasks",
      "/app/inbox",
      "/app/campaigns",
      "/app/metrics",
    ]);
  });

  it("toda tela visível aparece exatamente uma vez: no topo ou no Mais", () => {
    for (const visiveis of [ADMIN, AGENT]) {
      const menu = montarMenuDoTopo(visiveis);
      const alcancaveis = [
        ...menu.topo.map((i) => i.href),
        ...menu.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens.map((d) => d.href))),
      ];
      expect(new Set(alcancaveis).size).toBe(alcancaveis.length);
      expect([...alcancaveis].sort()).toEqual(visiveis.map((d) => d.href).sort());
    }
  });

  it("o Mais segue a ordem dos grupos do registro e não repete o topo", () => {
    const menu = montarMenuDoTopo(ADMIN);
    const ordem = NAV_GROUPS.map((g) => g.id);
    const vistos = menu.mais.map((g) => g.grupo.id);
    expect(vistos).toEqual(ordem.filter((id) => vistos.includes(id)));
    const noTopo = new Set(menu.topo.map((i) => i.href));
    const repetidos = menu.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens)).filter((d) => noTopo.has(d.href));
    expect(repetidos).toEqual([]);
  });

  it("o item fica ativo também nas telas de dentro dele", () => {
    const negocios = ITENS_DO_TOPO[0]!;
    const atendimento = ITENS_DO_TOPO.find((i) => i.href === "/app/inbox")!;
    expect(itemAtivo("/app/pipelines/p-1", negocios)).toBe(true);
    expect(itemAtivo("/app/leads/l-1", negocios)).toBe(true);
    expect(itemAtivo("/app/kanban", negocios)).toBe(true);
    expect(itemAtivo("/app/inbox/c-9", atendimento)).toBe(true);
    expect(itemAtivo("/app/inboxx", atendimento)).toBe(false);
    expect(destinoAtivo("/app/webhooks/regra-1", "/app/webhooks")).toBe(true);
    expect(destinoAtivo("/app/webhooksx", "/app/webhooks")).toBe(false);
  });

  it("todo rótulo do topo e do Novo + tem espanhol no dicionário", () => {
    const rotulos = [...ITENS_DO_TOPO.map((i) => i.rotulo), ...ACOES_DE_CRIAR.map((a) => a.rotulo)];
    expect(rotulos.filter((r) => !DICIONARIO[r]?.es)).toEqual([]);
  });
});

describe("o que o Novo + cria", () => {
  it("só entra o que a pessoa enxerga e o papel deixa criar", () => {
    expect(acoesDeCriar(ADMIN, "admin").map((a) => a.id)).toEqual(["contato", "empresa", "campanha"]);
    expect(acoesDeCriar(AGENT, "agent").map((a) => a.id)).toEqual(["contato"]);
    expect(acoesDeCriar(AGENT_COM_PROPOSTAS, "agent").map((a) => a.id)).toEqual(["contato", "proposta"]);
    expect(acoesDeCriar(VIEWER, "viewer")).toEqual([]);
    expect(acoesDeCriar(ADMIN, null)).toEqual([]);
  });

  it("contato abre a janela na própria tela; campanha e proposta vão para a tela de criar", () => {
    expect(ACOES_DE_CRIAR.map((a) => [a.id, a.destino])).toEqual([
      ["contato", null],
      ["empresa", "/app/companies?nova=1"],
      ["campanha", "/app/campaigns/new"],
      ["proposta", "/app/proposals/novo"],
    ]);
  });
});

// FORK ESCALE · Fase 8A: Campanhas só para gerente ou acima (N3).
describe("Campanhas por papel (Fase 8A)", () => {
  it("com o papel, Campanhas some do topo e do Mais abaixo de gerente", () => {
    const comoAgente = montarMenuDoTopo(AGENT, "agent");
    const noMais = comoAgente.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens.map((d) => d.href)));
    expect(comoAgente.topo.some((i) => i.href === "/app/campaigns")).toBe(false);
    expect(noMais).not.toContain("/app/campaigns");
    expect(montarMenuDoTopo(ADMIN, "manager").topo.some((i) => i.href === "/app/campaigns")).toBe(true);
    expect(itemAtivo("/app/prospecting", ITENS_DO_TOPO.find((i) => i.href === "/app/campaigns")!)).toBe(true);
  });
});

describe("a porta do ✦ e o selo vermelho", () => {
  it("✦ leva ao hub de IA quando a pessoa enxerga alguma tela do grupo IA", () => {
    expect(entradaDaIa(ADMIN)).toBe("/app/ai");
    expect(entradaDaIa(ADMIN.filter((d) => d.group !== "ia"))).toBeNull();
    expect(entradaDaIa([])).toBeNull();
  });

  it("o selo some no zero, vai até 99+ no topo e até +9 no botão de conversas", () => {
    expect(textoDoSelo(0, 99)).toBeNull();
    expect(textoDoSelo(-3, 9)).toBeNull();
    expect(textoDoSelo(5, 99)).toBe("5");
    expect(textoDoSelo(99, 99)).toBe("99");
    expect(textoDoSelo(100, 99)).toBe("99+");
    expect(textoDoSelo(9, 9)).toBe("9");
    expect(textoDoSelo(10, 9)).toBe("+9");
  });
});

describe("Indicadores por papel (Fase 7B)", () => {
  it("viewer não vê Indicadores no topo; atendente vê", () => {
    expect(montarMenuDoTopo(VIEWER, "viewer").topo.some((i) => i.href === "/app/metrics")).toBe(false);
    expect(montarMenuDoTopo(AGENT, "agent").topo.some((i) => i.href === "/app/metrics")).toBe(true);
  });

  it("Desempenho do atendimento aparece no Mais, em Agente de IA › Acompanhar o agente, para atendente", () => {
    const ia = montarMenuDoTopo(AGENT, "agent").mais.find((g) => g.grupo.id === "ia");
    const secao = ia?.secoes.find((s) => s.secao === "Acompanhar o agente");
    expect(secao?.itens.map((d) => d.href)).toContain("/app/ai/desempenho");
  });
});
