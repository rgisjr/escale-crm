import { fireEvent, render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// O Recharts não mede no jsdom: o contêiner responsivo vira uma caixa de tamanho fixo.
vi.mock("recharts", async (importar) => {
  const real = (await importar()) as Record<string, unknown>;
  return {
    ...real,
    ResponsiveContainer: ({ children, height }: { children: ReactElement<{ width?: number; height?: number }>; height: number }) =>
      cloneElement(children, { width: 600, height }),
  };
});

import { DesenhoDoGrafico } from "@/components/escale/indicadores/graficos/DesenhoDoGrafico";
import { opcoesComPadrao } from "@/lib/escale/indicadores/graficos/opcoes";
import { TIPOS_PRINCIPAIS, type TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";

const pergunta = perguntaSchema.parse({
  indicadores: ["negocio.quantidade"],
  variaveis: ["negocio.origem"],
  tempo: { campo: "negocio.criado_em", granularidade: "dia", periodo: { atalho: "este_mes" } },
});
const resultado = (colunas: Resultado["colunas"], linhas: Resultado["linhas"]): Resultado => ({
  colunas,
  linhas,
  truncado: false,
  duracaoMs: 1,
  avisos: [],
  ignorados: [],
});
const vari = { chave: "v0", nome: "Origem", papel: "variavel" as const };
const ind = (chave = "i0", nome = "Negócio Quantidade", unidade: "contagem" | "valor" = "contagem") => ({
  chave,
  nome,
  papel: "indicador" as const,
  unidade,
});
const tempo = { chave: "t", nome: "Data", papel: "tempo" as const };

const COM_TEMPO = resultado([tempo, ind()], [
  { t: "2026-10-03T00:00:00", i0: 357800 },
  { t: "2026-10-04T00:00:00", i0: 120000 },
]);
const POR_ORIGEM = resultado([vari, ind()], [
  { v0: "a", v0_rotulo: "Leads INSS Forms", i0: 34 },
  { v0: "b", v0_rotulo: "Outros", i0: 17 },
]);

function desenhar(tipo: TipoPrincipal, r: Resultado, opcoes: unknown = {}, p = pergunta) {
  return render(<DesenhoDoGrafico tipo={tipo} resultado={r} pergunta={p} opcoes={opcoesComPadrao(opcoes)} altura={300} />);
}

describe("DesenhoDoGrafico", () => {
  it.each(TIPOS_PRINCIPAIS)("desenha %s sem lançar", (tipo) => {
    const r = ["linha", "area", "barra", "barra_empilhada"].includes(tipo) ? COM_TEMPO : POR_ORIGEM;
    expect(() => desenhar(tipo, r)).not.toThrow();
  });

  it("Barra mostra o rótulo do eixo e o tick compacto", () => {
    desenhar("barra", COM_TEMPO);
    expect(screen.getAllByText("03/10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("360 mil").length).toBeGreaterThan(0);
  });

  it("Barra com valores desligados não mostra o rótulo do valor; ligado mostra", () => {
    const { unmount } = desenhar("barra", COM_TEMPO, { visualizacao: { valores: false } });
    expect(screen.queryByText("120.000")).toBeNull();
    unmount();
    desenhar("barra", COM_TEMPO, { visualizacao: { valores: true } });
    expect(screen.getAllByText("120.000").length).toBeGreaterThan(0);
  });

  it("Pizza mostra o valor fora da fatia mesmo com valores desligados; legenda some com legendas desligadas", () => {
    const { unmount } = desenhar("pizza", POR_ORIGEM, { visualizacao: { valores: false } });
    expect(screen.getAllByText("34").length).toBeGreaterThan(0);
    expect(screen.getByText("Leads INSS Forms")).toBeTruthy();
    unmount();
    desenhar("pizza", POR_ORIGEM, { visualizacao: { legendas: false } });
    expect(screen.queryByText("Leads INSS Forms")).toBeNull();
  });

  it("Funil mostra nome, valor e percentual", () => {
    desenhar("funil", POR_ORIGEM);
    expect(screen.getByText("Leads INSS Forms")).toBeTruthy();
    expect(screen.getByText("34")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("Tabela pagina de 50, ordena e soma o total", () => {
    const linhas = Array.from({ length: 120 }, (_, i) => ({ v0: `o${String(i).padStart(3, "0")}`, i0: i + 1 }));
    const r = resultado([vari, ind()], linhas);
    desenhar("tabela", r, { tabela: { totais: true } });
    expect(screen.getAllByRole("row").length).toBe(1 + 50 + 1);
    expect(screen.getByText("Próximo")).toBeTruthy();
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getByText("7.260")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Negócio Quantidade/i }));
    fireEvent.click(screen.getByRole("button", { name: /Negócio Quantidade/i }));
    expect(screen.getByText("120")).toBeTruthy();
  });

  it("Número com 2 indicadores mostra o 1º e troca ao clicar em Próximo indicador", () => {
    const r = resultado([ind("i0", "Q"), ind("i1", "Soma", "valor")], [{ i0: 1541, i1: 53807.32 }]);
    desenhar("numero", r);
    expect(screen.getByText("1.541")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Próximo indicador" }));
    expect(screen.getByText(/R\$\s53\.807,32/)).toBeTruthy();
  });

  it("Painel de KPI mostra o valor e Meta não definida", () => {
    desenhar("painel_de_kpi", resultado([ind()], [{ i0: 2 }]));
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Meta não definida")).toBeTruthy();
  });
});
