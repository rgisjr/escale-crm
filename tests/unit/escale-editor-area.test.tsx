import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cloneElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", async (importar) => {
  const real = (await importar()) as Record<string, unknown>;
  return {
    ...real,
    ResponsiveContainer: ({ children, height }: { children: ReactElement<{ width?: number; height?: number }>; height: number }) =>
      cloneElement(children, { width: 600, height }),
  };
});

import { AreaDoGrafico } from "@/components/escale/indicadores/editor/AreaDoGrafico";
import { CabecalhoDoEditor } from "@/components/escale/indicadores/editor/CabecalhoDoEditor";
import { ApiError } from "@/lib/api/types";
import { opcoesComPadrao } from "@/lib/escale/indicadores/graficos/opcoes";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";

const foto = perguntaSchema.parse({ indicadores: ["negocio.quantidade"], variaveis: ["negocio.origem"] });
const resultado = (over: Partial<Resultado> = {}): Resultado => ({
  colunas: [
    { chave: "v0", nome: "Origem", papel: "variavel" },
    { chave: "i0", nome: "Q", papel: "indicador", unidade: "contagem" },
  ],
  linhas: [{ v0: "a", v0_rotulo: "Leads", i0: 5 }],
  truncado: false,
  duracaoMs: 1,
  avisos: [],
  ignorados: [],
  ...over,
});
const base = { tipo: "barra" as const, opcoes: opcoesComPadrao({}), aoExecutar: () => undefined };

describe("área do gráfico", () => {
  it("sem foto mostra o texto do vazio e o Executar", async () => {
    const user = userEvent.setup();
    const aoExecutar = vi.fn();
    render(<AreaDoGrafico {...base} aoExecutar={aoExecutar} foto={null} resultado={undefined} carregando={false} erro={null} />);
    expect(screen.getByText(/Para visualizar os dados, comece configurando/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Executar" }));
    expect(aoExecutar).toHaveBeenCalled();
  });

  it("carregando o 1º resultado: sem o botão", () => {
    render(<AreaDoGrafico {...base} foto={foto} resultado={undefined} carregando erro={null} />);
    expect(screen.queryByRole("button", { name: "Executar" })).toBeNull();
  });

  it("erro 504 mostra o título e a mensagem do motor; 500 mostra a genérica", () => {
    const { unmount } = render(
      <AreaDoGrafico {...base} foto={foto} resultado={undefined} carregando={false} erro={new ApiError(504, "consulta_demorou", undefined, "r", "A consulta demorou mais de 8 segundos. Tente um período menor.")} />,
    );
    expect(screen.getByText("Erro ao carregar os dados")).toBeInTheDocument();
    expect(screen.getByText("A consulta demorou mais de 8 segundos. Tente um período menor.")).toBeInTheDocument();
    unmount();
    render(<AreaDoGrafico {...base} foto={foto} resultado={undefined} carregando={false} erro={new ApiError(500, "internal_error", undefined, "r", "boom do banco")} />);
    expect(screen.getByText("Não foi possível carregar os dados.")).toBeInTheDocument();
    expect(screen.queryByText("boom do banco")).toBeNull();
  });

  it("pronto desenha o gráfico; aviso de moedas mostra o texto próprio", () => {
    const { unmount, container } = render(<AreaDoGrafico {...base} foto={foto} resultado={resultado()} carregando={false} erro={null} />);
    expect(container.querySelector("svg.recharts-surface")).not.toBeNull();
    unmount();
    render(<AreaDoGrafico {...base} foto={foto} resultado={resultado({ avisos: ["moedas_diferentes"] })} carregando={false} erro={null} />);
    expect(screen.getByText("Não foi possível calcular a soma dos valores.")).toBeInTheDocument();
  });
});

describe("cabeçalho do editor", () => {
  it("novo: Charts, sem BETA, Adicionar ao dashboard e o link de volta", () => {
    render(<CabecalhoDoEditor modo="novo" nome={null} painelDeOrigem={{ id: "p1", nome: "Gerência" }} aoSalvar={() => undefined} />);
    expect(screen.getByRole("heading", { name: "Charts" })).toBeInTheDocument();
    expect(screen.queryByText("BETA")).toBeNull();
    expect(screen.getByRole("button", { name: "Adicionar ao dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gerência" })).toHaveAttribute("href", "/app/metrics/p1");
  });

  it("editar: o nome do gráfico e Atualizar; sem painel, sem link", async () => {
    const user = userEvent.setup();
    const aoSalvar = vi.fn();
    render(<CabecalhoDoEditor modo="editar" nome="Negócios por origem" painelDeOrigem={null} aoSalvar={aoSalvar} />);
    expect(screen.getByRole("heading", { name: "Negócios por origem" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(aoSalvar).toHaveBeenCalled();
  });
});
