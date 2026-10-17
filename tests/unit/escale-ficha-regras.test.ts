import { describe, expect, it } from "vitest";

import {
  abaDaUrl,
  buscaDoQuadro,
  buscaDosParametros,
  cabecalhoDoDia,
  deveMostrarContador,
  diasDasTarefas,
  etapaParaReabrir,
  etapasDoProximo,
  haQuantoTempo,
  migalhasDoNegocio,
  rotaDoNegocio,
  rotaDoQuadro,
  secoesDoHistorico,
  vizinhosNaEtapa,
} from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G: as regras puras da ficha do negócio (C1, C4, C7, C8). */
const etapa = (id: string, position: number, extra: Partial<Stage> = {}): Stage => ({
  id,
  organization_id: "o",
  pipeline_id: "p",
  name: id,
  slug: id,
  position,
  color: null,
  is_won: false,
  is_lost: false,
  is_archived: false,
  expected_duration_hours: null,
  ...extra,
});
const negocio = (id: string, stage_id: string, position_in_stage: number): Lead =>
  ({ id, stage_id, position_in_stage, title: id }) as Lead;

describe("a URL da ficha", () => {
  it("aba desconhecida ou ausente cai em Atividades", () => {
    expect(abaDaUrl(null)).toBe("atividades");
    expect(abaDaUrl("xyz")).toBe("atividades");
    expect(abaDaUrl("historico")).toBe("historico");
  });

  it("os filtros do quadro viajam com a ficha; lead, aba e pe não", () => {
    expect(buscaDoQuadro("st=open&f=abc&lead=1&aba=contato&pe=e2")).toBe("st=open&f=abc");
    expect(rotaDoNegocio("n1", "st=open&lead=9")).toBe("/app/negocios/n1?st=open");
    expect(rotaDoNegocio("n1", "", { aba: "historico", etapa: "e2" })).toBe(
      "/app/negocios/n1?aba=historico&pe=e2",
    );
    expect(rotaDoNegocio("n1", "aba=contato", { aba: "atividades" })).toBe("/app/negocios/n1");
    expect(rotaDoQuadro("o1", "st=open&aba=contato")).toBe("/app/pipelines/o1?st=open");
    expect(rotaDoQuadro("o1")).toBe("/app/pipelines/o1");
  });

  it("os parâmetros da página do servidor viram busca, com os repetidos", () => {
    expect(buscaDosParametros({ st: ["open", "won"], lead: "x", vazio: undefined })).toBe(
      "st=open&st=won&lead=x",
    );
  });
});

describe("caminho grupo › origem › negócio (C1)", () => {
  it("o grupo não é link, a origem volta ao quadro com os filtros, o negócio é o último", () => {
    expect(
      migalhasDoNegocio({
        grupo: "INSS Vendas",
        origem: { id: "o1", nome: "Leads INSS Whatsapp" },
        negocio: "Ana | Nunes Regularize",
        qs: "st=open",
      }),
    ).toEqual([
      { rotulo: "INSS Vendas", href: null },
      { rotulo: "Leads INSS Whatsapp", href: "/app/pipelines/o1?st=open" },
      { rotulo: "Ana | Nunes Regularize", href: null },
    ]);
  });

  it("origem sem grupo: só origem › negócio", () => {
    expect(
      migalhasDoNegocio({ grupo: null, origem: { id: "o1", nome: "O" }, negocio: "N" }),
    ).toHaveLength(2);
  });
});

describe("próximo negócio (C8)", () => {
  const leads = [
    negocio("c", "e1", 3),
    negocio("a", "e1", 1),
    negocio("b", "e1", 2),
    negocio("x", "e2", 1),
  ];

  it("sem ordenação escolhida, vale a posição na etapa (pos_id da Clint)", () => {
    expect(vizinhosNaEtapa(leads, "e1", "b")).toMatchObject({
      anterior: { id: "a" },
      proximo: { id: "c" },
    });
    expect(vizinhosNaEtapa(leads, "e1", "a").anterior).toBeNull();
    expect(vizinhosNaEtapa(leads, "e1", "c").proximo).toBeNull();
  });

  it("com ordenação escolhida no quadro, ela manda", () => {
    const inversa = (p: Lead, q: Lead) => q.position_in_stage - p.position_in_stage;
    expect(vizinhosNaEtapa(leads, "e1", "b", inversa)).toMatchObject({
      anterior: { id: "c" },
      proximo: { id: "a" },
    });
  });

  it("negócio fora da etapa escolhida (ou do recorte): o próximo é o primeiro dela, sem anterior", () => {
    expect(vizinhosNaEtapa(leads, "e1", "x")).toMatchObject({
      anterior: null,
      proximo: { id: "a" },
    });
    expect(vizinhosNaEtapa(leads, "e9", "x")).toEqual({ anterior: null, proximo: null });
  });

  it("o seletor lista as etapas não arquivadas, na ordem da origem", () => {
    expect(
      etapasDoProximo([etapa("b", 2), etapa("z", 3, { is_archived: true }), etapa("a", 1)]).map(
        (s) => s.id,
      ),
    ).toEqual(["a", "b"]);
  });
});

describe("reabrir (C4, Aberto num negócio fechado)", () => {
  const etapas = [
    etapa("e2", 2),
    etapa("ganho", 9, { is_won: true }),
    etapa("e1", 1),
    etapa("perda", 10, { is_lost: true }),
    etapa("velha", 0, { is_archived: true }),
  ];

  it("ganho volta para a última etapa aberta; perdido, para a primeira (Q3)", () => {
    expect(etapaParaReabrir(etapas, "won")).toBe("e2");
    expect(etapaParaReabrir(etapas, "lost")).toBe("e1");
  });

  it("sem etapa aberta, não há para onde reabrir", () => {
    expect(etapaParaReabrir([etapa("ganho", 1, { is_won: true })], "won")).toBeNull();
  });
});

describe("contador e datas", () => {
  it("o contador só aparece com mais de um negócio (Clint: `Ue>1`)", () => {
    expect(deveMostrarContador(0)).toBe(false);
    expect(deveMostrarContador(1)).toBe(false);
    expect(deveMostrarContador(2)).toBe(true);
  });

  it("o dia como na Clint: 'Qui, 15 Out'", () => {
    expect(cabecalhoDoDia(new Date(2026, 9, 15, 16, 21).toISOString())).toBe("Qui, 15 Out");
  });

  it("'há 3 dias'", () => {
    expect(haQuantoTempo("2026-10-14T12:00:00Z", new Date("2026-10-17T12:00:00Z"))).toBe(
      "há 3 dias",
    );
  });

  it("tarefas por dia, do mais novo para o mais velho; sem prazo por último (print 01)", () => {
    const dias = diasDasTarefas([
      { id: "1", due_date: new Date(2026, 9, 14, 9).toISOString() },
      { id: "2", due_date: null },
      { id: "3", due_date: new Date(2026, 9, 15, 9).toISOString() },
      { id: "4", due_date: new Date(2026, 9, 15, 16).toISOString() },
    ]);
    expect(dias.map((d) => d.tarefas.map((x) => x.id))).toEqual([["4", "3"], ["1"], ["2"]]);
    expect(dias[0]!.rotulo).toBe("Qui, 15 Out");
    expect(dias[2]!.rotulo).toBeNull();
  });

  it("histórico em seções: esta semana, semana passada e depois a data do domingo", () => {
    const agora = new Date(2026, 9, 17, 12); // sábado
    const secoes = secoesDoHistorico(
      [
        { id: "a", performed_at: new Date(2026, 9, 14, 10).toISOString() },
        { id: "b", performed_at: new Date(2026, 9, 8, 10).toISOString() },
        { id: "c", performed_at: new Date(2026, 8, 20, 10).toISOString() },
      ],
      agora,
    );
    expect(secoes.map((s) => [s.rotulo, s.itens.map((i) => i.id)])).toEqual([
      ["Esta semana", ["a"]],
      ["Semana passada", ["b"]],
      ["20/09/2026", ["c"]],
    ]);
    expect(secoes[0]!.data).toBe("14 Out");
  });
});
