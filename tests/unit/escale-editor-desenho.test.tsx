import { render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("recharts", async (importar) => {
  const real = (await importar()) as Record<string, unknown>;
  return {
    ...real,
    ResponsiveContainer: ({ children, height }: { children: ReactElement<{ width?: number; height?: number }>; height: number }) =>
      cloneElement(children, { width: 600, height }),
  };
});

import { DesenhoDoGrafico } from "@/components/escale/indicadores/graficos/DesenhoDoGrafico";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { CATALOGO } from "@/lib/escale/indicadores/catalogo";
import { dadosCartesianos, etapasDoFunil, linhasDeReferencia } from "@/lib/escale/indicadores/graficos/dados";
import { opcoesComPadrao, opcoesDoGraficoNovo } from "@/lib/escale/indicadores/graficos/opcoes";
import { IDS_COM_ORDEM_NATURAL } from "@/lib/escale/indicadores/graficos/ordem-natural";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";

const resultado = (colunas: Resultado["colunas"], linhas: Resultado["linhas"]): Resultado => ({
  colunas,
  linhas,
  truncado: false,
  duracaoMs: 1,
  avisos: [],
  ignorados: [],
});
const vari = { chave: "v0", nome: "Origem", papel: "variavel" as const };
const ind = { chave: "i0", nome: "Q", papel: "indicador" as const, unidade: "contagem" as const };
const FUNIL = resultado(
  [vari, ind],
  [34, 17, 16, 6, 6, 5, 2, 2].map((v, i) => ({ v0: `k${i}`, v0_rotulo: `E${i}`, i0: v })),
);

describe("opções", () => {
  it("padrão de leitura e do gráfico novo", () => {
    const o = opcoesComPadrao({});
    expect(o.visualizacao).toMatchObject({ valores: false, linhaDeMedia: false, linhaDeMediana: false });
    expect(o.funil).toMatchObject({ primeiraEtapa: null, calculo: "automatico" });
    expect(opcoesDoGraficoNovo().visualizacao).toMatchObject({ valores: true, legendas: true, grade: true });
  });
});

describe("funil", () => {
  const arred = (e: ReturnType<typeof etapasDoFunil>) => e.slice(0, 3).map((x) => Math.round(x.percentual));
  it("automático sem ordem natural é participação no total (10-043)", () => {
    expect(arred(etapasDoFunil(FUNIL, { primeiraEtapa: null, calculo: "automatico" }, false))).toEqual([39, 19, 18]);
  });
  it("automático com ordem natural é sobre a primeira etapa", () => {
    expect(arred(etapasDoFunil(FUNIL, { primeiraEtapa: null, calculo: "automatico" }, true))).toEqual([100, 50, 47]);
  });
  it("etapa anterior e etapa fixada no topo", () => {
    const anterior = etapasDoFunil(FUNIL, { primeiraEtapa: null, calculo: "etapa_anterior" });
    expect(anterior.map((e) => Math.round(e.percentual * 10) / 10).slice(0, 3)).toEqual([100, 50, 94.1]);
    const fixada = etapasDoFunil(FUNIL, { primeiraEtapa: "k2", calculo: "primeira_etapa" });
    expect(fixada[0]?.chave).toBe("k2");
    expect(fixada[0]?.percentual).toBe(100);
  });
  it("sem opções fica como na 7C (sobre a primeira etapa)", () => {
    expect(arred(etapasDoFunil(FUNIL))).toEqual([100, 50, 47]);
  });
});

describe("média e mediana", () => {
  it("ignoram pontos sem valor", () => {
    const r = resultado(
      [{ chave: "t", nome: "T", papel: "tempo" as const }, ind],
      [10, 20, null, 30].map((v, i) => ({ t: `2026-10-0${i + 1}T00:00:00`, i0: v })),
    );
    expect(linhasDeReferencia(dadosCartesianos(r, "dia", "barra"))).toEqual({ media: 20, mediana: 20 });
    expect(linhasDeReferencia({ pontos: [], series: [], eixoX: "tempo" })).toEqual({ media: null, mediana: null });
  });

  it("a barra desenha Média quando ligada", () => {
    const r = resultado([vari, ind], [10, 30].map((v, i) => ({ v0: `k${i}`, v0_rotulo: `E${i}`, i0: v })));
    const pergunta = perguntaSchema.parse({ indicadores: ["negocio.quantidade"], variaveis: ["negocio.origem"] });
    const opcoes = opcoesComPadrao({ visualizacao: { linhaDeMedia: true } });
    const { container } = render(<DesenhoDoGrafico tipo="barra" resultado={r} pergunta={pergunta} opcoes={opcoes} altura={300} />);
    expect(container.textContent).toContain("Média: 20");
  });
});

describe("catálogo e ordem natural", () => {
  it("a lista do navegador bate com o catálogo", () => {
    const doCatalogo = CATALOGO.flatMap((a) => a.dimensoes.filter((d) => d.ordemNatural).map((d) => d.id));
    expect([...doCatalogo].sort()).toEqual([...IDS_COM_ORDEM_NATURAL].sort());
  });
});

describe("componentes da casca", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());

  it("calendário com umMes mostra um mês só e os atalhos", () => {
    vi.setSystemTime(new Date(2026, 9, 15, 10, 0));
    render(<CalendarioDePeriodo valor={{ tipo: "criacao" }} aoMudar={() => undefined} semAbas umMes />);
    expect(screen.getByRole("group", { name: "outubro 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "novembro 2026" })).toBeNull();
    expect(screen.getByRole("button", { name: "Hoje" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo mês" })).toBeInTheDocument();
  });

  it("sem a prop, dois meses", () => {
    vi.setSystemTime(new Date(2026, 9, 15, 10, 0));
    render(<CalendarioDePeriodo valor={{ tipo: "criacao" }} aoMudar={() => undefined} />);
    expect(screen.getByRole("group", { name: "novembro 2026" })).toBeInTheDocument();
  });

  it("abas sem borda não têm border-b", () => {
    const abas = [{ valor: "a", rotulo: "A" }];
    const { rerender } = render(<AbasDaCasca abas={abas} valor="a" aoMudar={() => undefined} aria-label="x" />);
    expect(screen.getByRole("tablist")).toHaveClass("border-b");
    rerender(<AbasDaCasca abas={abas} valor="a" aoMudar={() => undefined} aria-label="x" semBorda />);
    expect(screen.getByRole("tablist")).not.toHaveClass("border-b");
  });
});
