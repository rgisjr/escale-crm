import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import { AbaOpcoesDoEditor } from "@/components/escale/indicadores/editor/AbaOpcoesDoEditor";
import { adicionarIndicador, adicionarVariavel, rascunhoNovo, type RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import type { TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";
import { CATALOGO_FALSO as CAT } from "@/tests/helpers/catalogo-da-tela";

let ultimo: RascunhoDoGrafico;
function Montar({ tipo = "linha", etapas = [] as Array<{ valor: string; rotulo: string }> }: { tipo?: TipoPrincipal; etapas?: Array<{ valor: string; rotulo: string }> }) {
  const [r, setR] = useState(() => adicionarVariavel(adicionarIndicador(rascunhoNovo(tipo), "negocio.quantidade", CAT), "negocio.origem"));
  useEffect(() => {
    ultimo = r;
  });
  return <AbaOpcoesDoEditor rascunho={r} catalogo={CAT} mudar={(f) => setR(f)} etapasDoResultado={etapas} />;
}

describe("aba Opções", () => {
  it("Linha: Visualização com os cinco interruptores e Ordenação; com Metas e projeções", () => {
    render(<Montar />);
    expect(screen.getByText("Visualização")).toBeInTheDocument();
    for (const nome of ["Valores", "Legendas", "Grade", "Exibir linha de média", "Exibir linha de mediana", "Projeção normal", "Projeção dias úteis"]) {
      expect(screen.getByRole("switch", { name: nome })).toBeInTheDocument();
    }
    expect(screen.getByText("Ordenação")).toBeInTheDocument();
    expect(screen.getByText("Metas")).toBeInTheDocument();
  });

  it("Donut só tem Valores e Legendas (e o interruptor de Metas); Tabela só tem as projeções", () => {
    const { unmount } = render(<Montar tipo="donut" />);
    expect(screen.getAllByRole("switch").map((s) => s.getAttribute("aria-label"))).toEqual(["Metas", "Valores", "Legendas"]);
    unmount();
    render(<Montar tipo="tabela" />);
    expect(screen.getByRole("switch", { name: "Projeção normal" })).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Valores" })).toBeNull();
  });

  it("desligar Grade muda a opção", async () => {
    const user = userEvent.setup();
    render(<Montar />);
    await user.click(screen.getByRole("switch", { name: "Grade" }));
    expect(ultimo.opcoes.visualizacao.grade).toBe(false);
  });

  it("Ordenar por lista indicadores e variáveis e grava; Direção tem Crescente e Decrescente", async () => {
    const user = userEvent.setup();
    render(<Montar />);
    const por = screen.getByRole("combobox", { name: "Ordenar por" });
    expect(por).toHaveTextContent("Selecione um campo");
    await user.click(por);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Selecione um campo", "Negócio Quantidade", "Negócio Origem"]);
    await user.click(screen.getByRole("option", { name: "Negócio Origem" }));
    expect(ultimo.ordem.por).toBe("negocio.origem");
    await user.click(screen.getByRole("combobox", { name: "Direção" }));
    await user.click(screen.getByRole("option", { name: "Decrescente" }));
    expect(ultimo.ordem.direcao).toBe("desc");
  });

  it("Funil: primeira etapa desligada antes do Executar; depois, com as etapas; cálculo com as 4 opções", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Montar tipo="funil" />);
    expect(screen.getByRole("combobox", { name: "Primeira etapa (topo do funil)" })).toBeDisabled();
    unmount();
    render(<Montar tipo="funil" etapas={[{ valor: "e1", rotulo: "Novo" }]} />);
    await user.click(screen.getByRole("combobox", { name: "Primeira etapa (topo do funil)" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Padrão (nenhuma etapa fixada)", "Novo"]);
    await user.click(screen.getByRole("option", { name: "Novo" }));
    expect(ultimo.opcoes.funil.primeiraEtapa).toBe("e1");
    await user.click(screen.getByRole("combobox", { name: "Cálculo da porcentagem" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Automático", "Primeira etapa (topo)", "Etapa anterior", "Participação no total",
    ]);
  });
});
