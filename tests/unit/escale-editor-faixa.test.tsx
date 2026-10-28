import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FaixaDoEditor } from "@/components/escale/indicadores/editor/FaixaDoEditor";
import { adicionarIndicador, rascunhoNovo, type RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import { CATALOGO_FALSO as CAT } from "@/tests/helpers/catalogo-da-tela";

let ultimo: RascunhoDoGrafico;
function Montar({ inicial = rascunhoNovo(), pendente = false, aoExecutar = () => undefined }: { inicial?: RascunhoDoGrafico; pendente?: boolean; aoExecutar?: () => void }) {
  const [r, setR] = useState(inicial);
  ultimo = r;
  return <FaixaDoEditor rascunho={r} catalogo={CAT} mudar={(f) => setR(f)} pendente={pendente} aoExecutar={aoExecutar} />;
}
const tres = () => {
  let r = adicionarIndicador(rascunhoNovo("barra"), "negocio.quantidade", CAT);
  r = adicionarIndicador(r, "negocio.ganhos", CAT);
  return adicionarIndicador(r, "negocio.soma_de_valores", CAT);
};

describe("faixa do editor", () => {
  it("tipo Linha por padrão; a lista tem os 10 tipos na ordem, Linha marcada", async () => {
    const user = userEvent.setup();
    render(<Montar />);
    expect(screen.getByRole("combobox", { name: "Tipo" })).toHaveTextContent("Linha");
    await user.click(screen.getByRole("combobox", { name: "Tipo" }));
    const opcoes = screen.getAllByRole("option");
    expect(opcoes.map((o) => o.textContent)).toEqual([
      "Linha", "Área", "Barra", "Barra Empilhada", "Pizza", "Donut", "Funil", "Tabela", "Número", "Painel de KPI",
    ]);
    expect(opcoes[0]).toHaveAttribute("aria-selected", "true");
    await user.click(within(opcoes[2]!).getByRole("button"));
    expect(ultimo.tipo).toBe("barra");
  });

  it("com 3 indicadores, Pizza abre o modal; Cancelar mantém Barra; Confirmar deixa Pizza com 1", async () => {
    const user = userEvent.setup();
    render(<Montar inicial={tres()} />);
    const escolherPizza = async () => {
      await user.click(screen.getByRole("combobox", { name: "Tipo" }));
      await user.click(within(screen.getByRole("option", { name: "Pizza" })).getByRole("button"));
    };
    await escolherPizza();
    expect(screen.getByText("Limite de indicadores")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").filter((c) => c.getAttribute("aria-checked") === "true")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(ultimo.tipo).toBe("barra");
    await escolherPizza();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(ultimo).toMatchObject({ tipo: "pizza", indicadores: ["negocio.quantidade"] });
  });

  it("o x do tipo volta para Linha", async () => {
    const user = userEvent.setup();
    render(<Montar inicial={rascunhoNovo("donut")} />);
    await user.click(screen.getByRole("button", { name: "Restaurar tipo padrão" }));
    expect(ultimo.tipo).toBe("linha");
  });

  it("Adicionar totais só em Tabela e liga tabela.totais", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Montar />);
    expect(screen.queryByRole("checkbox", { name: "Adicionar totais" })).toBeNull();
    unmount();
    render(<Montar inicial={rascunhoNovo("tabela")} />);
    await user.click(screen.getByRole("checkbox", { name: "Adicionar totais" }));
    expect(ultimo.opcoes.tabela.totais).toBe(true);
  });

  it("período Este mês e a lista de 10-054; Personalizado mostra o campo; o x volta a Este mês", async () => {
    const user = userEvent.setup();
    render(<Montar />);
    const seletor = screen.getByRole("combobox", { name: "Período" });
    expect(seletor).toHaveTextContent("Este mês");
    await user.click(seletor);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Tudo", "Hoje", "Ontem", "7 dias", "15 dias", "1 mês", "Este mês", "Personalizado",
    ]);
    await user.click(screen.getByRole("option", { name: "Personalizado" }));
    expect(ultimo.tempo.periodo.atalho).toBe("personalizado");
    expect(screen.getByRole("button", { name: "Período personalizado" })).toHaveTextContent(/^\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4}$/);
    await user.click(screen.getByRole("button", { name: "Limpar período" }));
    expect(ultimo.tempo.periodo).toEqual({ atalho: "este_mes" });
  });

  it("Fixar este período liga tempo.fixo e mostra a dica", async () => {
    const user = userEvent.setup();
    render(<Montar />);
    await user.click(screen.getByRole("switch", { name: "Fixar este período" }));
    expect(ultimo.tempo.fixo).toBe(true);
    await user.hover(screen.getByRole("img", { name: "Ajuda" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("ignora o filtro de data do dashboard");
  });

  it("agrupamento tem Trimestre e Ano; Hora desligada com Tudo", async () => {
    const user = userEvent.setup();
    const r = { ...adicionarIndicador(rascunhoNovo(), "negocio.quantidade", CAT), tempo: { ...adicionarIndicador(rascunhoNovo(), "negocio.quantidade", CAT).tempo, periodo: { atalho: "tudo" as const } } };
    render(<Montar inicial={r} />);
    await user.click(screen.getByRole("combobox", { name: "Agrupamento por" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Sem agrupamento", "Hora", "Dia", "Semana", "Mês", "Trimestre", "Ano",
    ]);
    expect(screen.getByRole("option", { name: "Hora" })).toHaveAttribute("aria-disabled", "true");
  });

  it("Executar no fim só com pendente", async () => {
    const user = userEvent.setup();
    const aoExecutar = vi.fn();
    const { unmount } = render(<Montar />);
    expect(screen.queryByRole("button", { name: "Executar" })).toBeNull();
    unmount();
    render(<Montar pendente aoExecutar={aoExecutar} />);
    await user.click(screen.getByRole("button", { name: "Executar" }));
    expect(aoExecutar).toHaveBeenCalled();
  });
});
