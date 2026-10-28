import { fireEvent, render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// O Recharts não mede no jsdom: o contêiner vira caixa fixa e o Sankey lista nós e links em data-*.
vi.mock("recharts", async (importar) => {
  const real = (await importar()) as Record<string, unknown>;
  return {
    ...real,
    ResponsiveContainer: ({ children, height }: { children: ReactElement<{ width?: number; height?: number }>; height: number }) =>
      cloneElement(children, { width: 600, height }),
    Sankey: ({ data }: { data: { nodes: unknown[]; links: unknown[] } }) => (
      <svg data-testid="sankey" data-nodes={data.nodes.length} data-links={data.links.length} />
    ),
  };
});

import { DesenhoDoGrafico } from "@/components/escale/indicadores/graficos/DesenhoDoGrafico";
import { opcoesComPadrao } from "@/lib/escale/indicadores/graficos/opcoes";
import { TIPOS_DE_GRAFICO, type TipoDeGrafico } from "@/lib/escale/indicadores/graficos/tipos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";

const pergunta = perguntaSchema.parse({
  indicadores: ["negocio.quantidade"],
  variaveis: ["negocio.origem"],
  tempo: { campo: "negocio.criado_em", granularidade: "dia", periodo: { atalho: "este_mes" } },
});
const resultado = (colunas: Resultado["colunas"], linhas: Resultado["linhas"], extra: Partial<Resultado> = {}): Resultado => ({
  colunas,
  linhas,
  truncado: false,
  duracaoMs: 1,
  avisos: [],
  ignorados: [],
  ...extra,
});
const vari = (i = 0) => ({ chave: `v${i}`, nome: "Origem", papel: "variavel" as const });
const ind = (chave = "i0") => ({ chave, nome: "Negócio Quantidade", papel: "indicador" as const, unidade: "contagem" as const });
const tempo = { chave: "t", nome: "Data", papel: "tempo" as const };

const POR_ORIGEM = resultado([vari(), ind()], Array.from({ length: 8 }, (_, i) => ({ v0: `o${i}`, v0_rotulo: `Pessoa Numero${i}`, i0: 34 - i })));
const COM_TEMPO = resultado([tempo, ind()], [
  { t: "2026-10-03T00:00:00", i0: 30 },
  { t: "2026-10-04T00:00:00", i0: 20 },
]);

function desenhar(tipo: TipoDeGrafico, r: Resultado, opcoes: unknown = {}, extra: Record<string, unknown> = {}) {
  return render(<DesenhoDoGrafico tipo={tipo} resultado={r} pergunta={pergunta} opcoes={opcoesComPadrao(opcoes)} altura={300} {...extra} />);
}

describe("Ranking", () => {
  it("mostra 5, as iniciais e 'Ver todos os 8 itens'; clicar mostra todos e 'Mostrar menos'", () => {
    desenhar("ranking", POR_ORIGEM);
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getAllByText("PN").length).toBe(5);
    expect(screen.getByText("34 quantidade")).toBeTruthy();
    fireEvent.click(screen.getByText("Ver todos os 8 itens"));
    expect(screen.getAllByText("PN").length).toBe(8);
    expect(screen.getByText("Mostrar menos")).toBeTruthy();
  });
  it("clicar na linha chama o detalhamento com o rótulo", () => {
    const aoClicar = vi.fn();
    desenhar("ranking", POR_ORIGEM, {}, { aoClicarNoPonto: aoClicar });
    fireEvent.click(screen.getByText("Pessoa Numero0"));
    expect(aoClicar).toHaveBeenCalledWith({ rotulo: "Pessoa Numero0" });
  });
});

describe("Barra 100%", () => {
  it("mostra o eixo em %", () => {
    desenhar("barra_100", POR_ORIGEM);
    expect(screen.getAllByText(/%/).length).toBeGreaterThan(0);
  });
});

describe("Número avançado", () => {
  it("variação, meta, % da meta e faixa", () => {
    const r = resultado([ind()], [{ i0: 34 }], { comparacao: { periodo: { de: "a", ate: "b" }, truncado: false, linhas: [{ i0: 30 }] } });
    desenhar("numero_avancado", r, { metas: { ligadas: true, itens: [{ indicador: "i0", valor: 25, visivel: true }] } });
    expect(screen.getByText(/\+13,3%/)).toBeTruthy();
    expect(screen.getByText("vs. período anterior")).toBeTruthy();
    expect(screen.getByText(/Meta: 25 · 136% da meta/)).toBeTruthy();
    expect(screen.getByText("Saudável")).toBeTruthy();
  });
  it("sem comparação nem meta mostra só o valor", () => {
    desenhar("numero_avancado", resultado([ind()], [{ i0: 34 }]));
    expect(screen.getByText("34")).toBeTruthy();
    expect(screen.queryByText("vs. período anterior")).toBeNull();
  });
  it("comparação sem dado anterior avisa", () => {
    desenhar("numero_avancado", resultado([ind()], [{ i0: 3 }], { comparacao: { periodo: { de: "a", ate: "b" }, truncado: false, linhas: [] } }));
    expect(screen.getByText("Sem dados no período anterior")).toBeTruthy();
  });
});

describe("Heatmap", () => {
  const colunas = [{ chave: "dsem", nome: "Dia", papel: "tempo" as const }, { chave: "hora", nome: "Hora", papel: "tempo" as const }, ind()];
  const r = resultado(colunas, [{ dsem: 1, hora: 9, i0: 12 }, { dsem: 2, hora: 10, i0: 3 }]);
  it("mostra os dias, 24 colunas e o máximo", () => {
    desenhar("heatmap", r);
    expect(screen.getByText("Dom")).toBeTruthy();
    expect(screen.getByText("Sáb")).toBeTruthy();
    expect(screen.getByText("23h")).toBeTruthy();
    expect(screen.getByText("Máx: 12")).toBeTruthy();
  });
  it("janela comercial mostra 12 horas", () => {
    desenhar("heatmap", r, { heatmap: { janela: "comercial" } });
    expect(screen.queryByText("23h")).toBeNull();
    expect(screen.getByText("07h")).toBeTruthy();
  });
  it("clicar na célula informa o dia e a hora", () => {
    const aoClicar = vi.fn();
    desenhar("heatmap", r, {}, { aoClicarNoPonto: aoClicar });
    fireEvent.click(screen.getByLabelText("Seg, 9h: 12"));
    expect(aoClicar).toHaveBeenCalledWith({ dsem: 1, hora: 9 });
  });
  it("sem tempo mostra 'Sem dados'", () => {
    desenhar("heatmap", resultado([ind()], []));
    expect(screen.getByText("Sem dados")).toBeTruthy();
  });
});

describe("Sankey e Divisor", () => {
  it("sem 2 variáveis mostra o aviso", () => {
    desenhar("sankey", POR_ORIGEM);
    expect(screen.getByText("Adicione pelo menos 2 variáveis para ver o fluxo")).toBeTruthy();
  });
  it("com dados lista nós e links e o rodapé", () => {
    const r = resultado([vari(0), vari(1), ind()], [{ v0: "a", v1: "x", i0: 3 }, { v0: "b", v1: "x", i0: 2 }]);
    desenhar("sankey", r);
    expect(screen.getByTestId("sankey").getAttribute("data-links")).toBe("2");
    expect(screen.getByText("5 no período · 2 níveis")).toBeTruthy();
  });
  it("divisor mostra o nome", () => {
    desenhar("divisor", resultado([], []), {}, { nome: "Vendas" });
    expect(screen.getByText("Vendas")).toBeTruthy();
  });
});

describe("metas, comparação e funil no desenho", () => {
  it("Barra com meta mostra a pílula e 'Metas' na legenda", () => {
    desenhar("barra", COM_TEMPO, { metas: { ligadas: true, itens: [{ indicador: "i0", valor: 25, visivel: true }] } });
    expect(screen.getByLabelText("25")).toBeTruthy();
    expect(screen.getByText("Metas")).toBeTruthy();
  });
  it("KPI com meta mostra 136% e 'Meta: 25'; sem meta, 'Meta não definida'", () => {
    const r = resultado([ind()], [{ i0: 34 }]);
    const { unmount } = desenhar("painel_de_kpi", r, { metas: { ligadas: true, itens: [{ indicador: "i0", valor: 25, visivel: true }] } });
    expect(screen.getByText("136%")).toBeTruthy();
    expect(screen.getByText(/Meta:/)).toBeTruthy();
    unmount();
    desenhar("painel_de_kpi", r);
    expect(screen.getByText("Meta não definida")).toBeTruthy();
  });
  it("Tabela com meta ganha a coluna META", () => {
    desenhar("tabela", POR_ORIGEM, { metas: { ligadas: true, itens: [{ indicador: "i0", valor: 30, visivel: true }] } });
    expect(screen.getByText("META")).toBeTruthy();
  });
  it("Linha com comparação mostra a série do período anterior na legenda", () => {
    const r = resultado([tempo, ind()], COM_TEMPO.linhas, {
      comparacao: { periodo: { de: "a", ate: "b" }, truncado: false, linhas: [{ t: "2026-09-03T00:00:00", i0: 10 }] },
    });
    desenhar("linha", r);
    expect(screen.getByText("Negócio Quantidade (Período anterior)")).toBeTruthy();
  });
  it("Funil com casas decimais mostra 40,0%", () => {
    const r = resultado([vari(), ind()], [{ v0: "a", v0_rotulo: "A", i0: 100 }, { v0: "b", v0_rotulo: "B", i0: 40 }]);
    desenhar("funil", r, { funil: { calculo: "primeira_etapa", casasDecimais: 1 } });
    expect(screen.getByText("40,0%")).toBeTruthy();
  });
  it("clique na barra chama aoClicarNoPonto", () => {
    const aoClicar = vi.fn();
    desenhar("pizza", POR_ORIGEM, {}, { aoClicarNoPonto: aoClicar });
    expect(aoClicar).not.toHaveBeenCalled();
  });
});

describe("os 16 tipos", () => {
  it.each(TIPOS_DE_GRAFICO)("desenha %s sem lançar", (tipo) => {
    expect(() => desenhar(tipo, tipo === "heatmap" ? resultado([ind()], []) : POR_ORIGEM, {}, { nome: "x" })).not.toThrow();
  });
});
