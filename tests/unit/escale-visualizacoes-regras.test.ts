import { describe, expect, it } from "vitest";

import type { BoardData, Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { montarOrigens, type Origens } from "@/lib/escale/origens/regras";
import {
  VISUALIZACAO_MAX_ORIGENS,
  alternarNaSelecao,
  cardsDaColuna,
  estadoDoGrupo,
  filtrarVisualizacoes,
  montarColunas,
  montarGravacao,
  ordenarNaArvore,
  origensVivasDaVisualizacao,
  planejarSoltura,
  settingsDaVisualizacao,
  validarNomeDeVisualizacao,
  validarOrigensDaVisualizacao,
  visualizacaoDoCaminho,
  type Visualizacao,
} from "@/lib/escale/visualizacoes/regras";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras", color: null, icon: "iniciais", is_archived: false },
    { id: "g-cred", name: "Credenciados", color: null, icon: "iniciais", is_archived: false },
  ],
  funis: [
    { id: "f-leads", name: "Leads", group_id: "g-obras", is_archived: false, is_default: true },
    { id: "f-pa", name: "Leads PA", group_id: "g-obras", is_archived: false, is_default: false },
    { id: "f-nayara", name: "Nayara", group_id: "g-cred", is_archived: false, is_default: false },
    { id: "f-morto", name: "Morto", group_id: "g-cred", is_archived: true, is_default: false },
  ],
};

const vis = (id: string, name: string, origens: string[] = ["f-leads"]): Visualizacao => ({
  id,
  name,
  acesso: "todos",
  origens,
  pessoas: [],
});

const etapa = (id: string, pipeline_id: string, name: string, position: number, color: string | null = null) =>
  ({ id, pipeline_id, name, position, color }) as unknown as Stage;
const quadro = (id: string, stages: Stage[], settings: Record<string, unknown> = {}) =>
  ({ pipeline: { id, name: id, settings } as unknown as Pipeline, stages, leads: [] }) as BoardData;
const card = (id: string, pipeline_id: string, stage_id: string, position_in_stage: number) =>
  ({ id, pipeline_id, stage_id, position_in_stage, updated_at: "2026-10-14T00:00:00Z" }) as unknown as Lead;

describe("validarNomeDeVisualizacao", () => {
  it("apara, junta espaços e recusa vazio e longo demais", () => {
    expect(validarNomeDeVisualizacao("  Time   comercial ", [], null)).toEqual({ ok: true, nome: "Time comercial" });
    expect(validarNomeDeVisualizacao("   ", [], null)).toEqual({ ok: false, erro: "Dê um nome à visualização." });
    expect(validarNomeDeVisualizacao("x".repeat(61), [], null)).toEqual({
      ok: false,
      erro: "O nome da visualização pode ter até 60 caracteres.",
    });
  });

  it("nome repetido sem olhar caixa nem acento é recusado, menos o da própria", () => {
    const existentes = [vis("v1", "Análise")];
    expect(validarNomeDeVisualizacao("analise", existentes, null)).toEqual({
      ok: false,
      erro: "Já existe uma visualização com esse nome.",
    });
    expect(validarNomeDeVisualizacao("ANÁLISE", existentes, "v1")).toEqual({ ok: true, nome: "ANÁLISE" });
  });
});

describe("validarOrigensDaVisualizacao", () => {
  it("tira repetidas e mantém a ordem pedida", () => {
    expect(validarOrigensDaVisualizacao(["f-nayara", "f-leads", "f-nayara"], ORIGENS)).toEqual({
      ok: true,
      ids: ["f-nayara", "f-leads"],
    });
  });

  it("recusa nenhuma, mais de 20, arquivada e desconhecida", () => {
    const faixa = { ok: false, erro: "Uma visualização junta de 1 a 20 origens." };
    expect(validarOrigensDaVisualizacao([], ORIGENS)).toEqual(faixa);
    const muitas = Array.from({ length: VISUALIZACAO_MAX_ORIGENS + 1 }, (_, i) => `f-${i}`);
    expect(validarOrigensDaVisualizacao(muitas, ORIGENS)).toEqual(faixa);
    const invalida = { ok: false, erro: "Escolha origens ativas desta organização." };
    expect(validarOrigensDaVisualizacao(["f-leads", "f-morto"], ORIGENS)).toEqual(invalida);
    expect(validarOrigensDaVisualizacao(["f-do-vizinho"], ORIGENS)).toEqual(invalida);
  });
});

describe("montarGravacao", () => {
  it("acesso todos zera a lista de pessoas", () => {
    expect(
      montarGravacao({ name: " Time ", acesso: "todos", origens: ["f-pa"], pessoas: ["u1"] }, ORIGENS, [], null),
    ).toEqual({ ok: true, gravacao: { nome: "Time", acesso: "todos", origens: ["f-pa"], pessoas: [] } });
  });

  it("acesso escolhidos exige pelo menos uma pessoa e tira repetidas", () => {
    expect(montarGravacao({ name: "Time", acesso: "escolhidos", origens: ["f-pa"], pessoas: [] }, ORIGENS, [], null)).toEqual({
      ok: false,
      erro: "Escolha quem vê a visualização.",
    });
    expect(
      montarGravacao({ name: "Time", acesso: "escolhidos", origens: ["f-pa"], pessoas: ["u1", "u1", "u2"] }, ORIGENS, [], null),
    ).toEqual({ ok: true, gravacao: { nome: "Time", acesso: "escolhidos", origens: ["f-pa"], pessoas: ["u1", "u2"] } });
  });

  it("o erro do nome vem antes do das origens", () => {
    expect(montarGravacao({ name: "", acesso: "todos", origens: [], pessoas: [] }, ORIGENS, [], null)).toEqual({
      ok: false,
      erro: "Dê um nome à visualização.",
    });
  });
});

/** `ORIGENS` mais um grupo arquivado: arquivar o grupo não arquiva os funis dele. */
const COM_GRUPO_ARQUIVADO: Origens = {
  grupos: [...ORIGENS.grupos, { id: "g-velho", name: "Antigo", color: null, icon: "iniciais", is_archived: true }],
  funis: [
    ...ORIGENS.funis,
    { id: "f-pos", name: "Pós-venda", group_id: "g-velho", is_archived: false, is_default: false },
    { id: "f-solto", name: "Solto", group_id: null, is_archived: false, is_default: false },
  ],
};

describe("origem de grupo arquivado não está viva", () => {
  it("origensVivasDaVisualizacao tira a origem cujo grupo está arquivado e mantém a sem grupo", () => {
    const v = vis("v1", "Time", ["f-nayara", "f-pos", "f-solto"]);
    expect(origensVivasDaVisualizacao(v, COM_GRUPO_ARQUIVADO).map((f) => f.id)).toEqual(["f-nayara", "f-solto"]);
  });

  it("validarOrigensDaVisualizacao recusa origem de grupo arquivado", () => {
    expect(validarOrigensDaVisualizacao(["f-leads", "f-pos"], COM_GRUPO_ARQUIVADO)).toEqual({
      ok: false,
      erro: "Escolha origens ativas desta organização.",
    });
    expect(validarOrigensDaVisualizacao(["f-leads", "f-solto"], COM_GRUPO_ARQUIVADO)).toEqual({
      ok: true,
      ids: ["f-leads", "f-solto"],
    });
  });
});

describe("origens da visualização e seleção do painel", () => {
  it("as origens vivas, na ordem da visualização, sem arquivada nem apagada", () => {
    const v = vis("v1", "Time", ["f-nayara", "f-morto", "f-apagada", "f-leads"]);
    expect(origensVivasDaVisualizacao(v, ORIGENS).map((f) => f.id)).toEqual(["f-nayara", "f-leads"]);
  });

  it("a seleção sai na ordem do painel: grupos por nome, origens na posição", () => {
    const arvore = montarOrigens(ORIGENS);
    expect(ordenarNaArvore(new Set(["f-leads", "f-nayara", "f-pa"]), arvore)).toEqual(["f-nayara", "f-leads", "f-pa"]);
  });

  it("a caixinha do grupo é marcada, parcial ou vazia", () => {
    const [cred, obras] = montarOrigens(ORIGENS).grupos;
    expect(estadoDoGrupo(obras!, new Set(["f-leads", "f-pa"]))).toBe("marcada");
    expect(estadoDoGrupo(obras!, new Set(["f-leads"]))).toBe("parcial");
    expect(estadoDoGrupo(cred!, new Set(["f-leads"]))).toBe("vazia");
  });

  it("alternar marca e desmarca várias de uma vez sem mexer no conjunto de origem", () => {
    const antes = new Set(["f-leads"]);
    const depois = alternarNaSelecao(antes, ["f-pa", "f-nayara"], true);
    expect([...depois].sort()).toEqual(["f-leads", "f-nayara", "f-pa"]);
    expect([...alternarNaSelecao(depois, ["f-leads", "f-pa"], false)]).toEqual(["f-nayara"]);
    expect([...antes]).toEqual(["f-leads"]);
  });

  it("lê a visualização do endereço do quadro", () => {
    expect(visualizacaoDoCaminho("/app/pipelines/visualizacoes/v-1")).toBe("v-1");
    expect(visualizacaoDoCaminho("/app/pipelines/v-1")).toBeNull();
  });
});

describe("montarColunas", () => {
  it("etapas com o mesmo nome viram uma coluna, e a nova entra depois da última da mesma origem", () => {
    const colunas = montarColunas([
      quadro("A", [etapa("a1", "A", "Entrada", 1, "#111111"), etapa("a2", "A", "Atendimento", 2), etapa("a3", "A", "Proposta", 3)]),
      quadro("B", [etapa("b1", "B", "Entrada", 1), etapa("b2", "B", "Qualificação", 2), etapa("b3", "B", " Proposta ", 3)]),
    ]);
    expect(colunas.map((c) => c.nome)).toEqual(["Entrada", "Qualificação", "Atendimento", "Proposta"]);
    expect(colunas[0]).toMatchObject({ chave: "coluna:Entrada", cor: "#111111", destinos: { A: "a1", B: "b1" }, etapas: ["a1", "b1"] });
    expect(colunas[3]).toMatchObject({ destinos: { A: "a3", B: "b3" } });
    expect(colunas[2]).toMatchObject({ destinos: { A: "a2" }, etapas: ["a2"] });
  });

  it("o nome junta exato: caixa diferente é outra coluna", () => {
    const colunas = montarColunas([
      quadro("A", [etapa("a1", "A", "Proposta", 1)]),
      quadro("B", [etapa("b1", "B", "proposta", 1)]),
    ]);
    expect(colunas.map((c) => c.nome)).toEqual(["Proposta", "proposta"]);
  });

  it("a ordem vem da posição da etapa, e nome repetido na mesma origem cai na mesma coluna", () => {
    const colunas = montarColunas([
      quadro("A", [etapa("a2", "A", "Fim", 2), etapa("a1", "A", "Início", 1), etapa("a3", "A", "Fim", 3)]),
    ]);
    expect(colunas.map((c) => c.nome)).toEqual(["Início", "Fim"]);
    expect(colunas[1]).toMatchObject({ destinos: { A: "a2" }, etapas: ["a2", "a3"] });
  });
});

describe("cardsDaColuna e planejarSoltura", () => {
  const coluna = { chave: "coluna:Proposta", nome: "Proposta", cor: null, destinos: { A: "a3", B: "b3" }, etapas: ["a3", "b3"] };

  it("os cards da coluna são de todas as origens, pela posição", () => {
    const leads = [card("l1", "A", "a3", 3000), card("l2", "B", "b3", 1000), card("l3", "A", "a1", 500)];
    expect(cardsDaColuna(coluna, leads).map((l) => l.id)).toEqual(["l2", "l1"]);
  });

  it("origem sem a etapa recusa", () => {
    const soltura = planejarSoltura({
      lead: card("l9", "C", "c1", 1000),
      coluna,
      visiveis: [],
      indice: 0,
      etapaInteira: null,
    });
    expect(soltura).toEqual({ tipo: "recusa" });
  });

  it("a posição sai dos vizinhos da MESMA etapa de destino, pulando os cards das outras origens", () => {
    const visiveis = [card("x1", "A", "a3", 1000), card("y1", "B", "b3", 1500), card("x2", "A", "a3", 3000)];
    const soltura = planejarSoltura({
      lead: card("novo", "A", "a1", 10),
      coluna,
      visiveis,
      indice: 2,
      etapaInteira: [visiveis[0]!, visiveis[2]!],
    });
    expect(soltura).toEqual({ tipo: "mover", pipelineId: "A", stageId: "a3", positionInStage: 2000 });
  });

  it("coluna vazia para a origem: a primeira posição", () => {
    const soltura = planejarSoltura({
      lead: card("novo", "B", "b1", 10),
      coluna,
      visiveis: [card("x1", "A", "a3", 1000)],
      indice: 1,
      etapaInteira: [],
    });
    expect(soltura).toEqual({ tipo: "mover", pipelineId: "B", stageId: "b3", positionInStage: 1000 });
  });

  it("vizinhos empatados (posição já gravada igual) não movem", () => {
    const visiveis = [card("x1", "A", "a3", 1000), card("x2", "A", "a3", 1000)];
    const soltura = planejarSoltura({
      lead: card("novo", "A", "a1", 10),
      coluna,
      visiveis,
      indice: 1,
      etapaInteira: null,
    });
    expect(soltura).toEqual({ tipo: "nada" });
  });
});

describe("settingsDaVisualizacao", () => {
  it("junta os motivos de perda de todas as origens", () => {
    expect(
      settingsDaVisualizacao([
        quadro("A", [], { lost_reasons: ["Preço"] }),
        quadro("B", [], { lost_reasons: [{ label: "Sumiu", categoria: "Cliente" }] }),
        quadro("C", [], {}),
      ]),
    ).toEqual({ lost_reasons: ["Preço", { label: "Sumiu", categoria: "Cliente" }] });
  });
});

describe("filtrarVisualizacoes", () => {
  it("a lupa procura no nome sem acento nem caixa; sem termo, devolve todas", () => {
    const lista = [vis("v1", "Análise"), vis("v2", "Time comercial")];
    expect(filtrarVisualizacoes(lista, "ANALI").map((v) => v.id)).toEqual(["v1"]);
    expect(filtrarVisualizacoes(lista, "  ").map((v) => v.id)).toEqual(["v1", "v2"]);
  });
});
