import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/escale/useOpcoesDaDimensao", () => ({
  useOpcoesDaDimensao: () => ({
    data: [
      { valor: "a", rotulo: "Novo" },
      { valor: "b", rotulo: "Qualificado" },
      { valor: "c", rotulo: "Proposta" },
      { valor: "d", rotulo: "Fechado" },
    ],
  }),
}));

import { CatalogoDoEditor } from "@/components/escale/indicadores/editor/CatalogoDoEditor";
import type { AlvoDoCatalogo } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { adicionarIndicador, rascunhoNovo, type RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import { CATALOGO_FALSO as CAT } from "@/tests/helpers/catalogo-da-tela";

function Montar({
  alvo = "indicador",
  rascunho = rascunhoNovo(),
  catalogo = CAT as typeof CAT | null,
  aoAdicionar = () => undefined,
}: {
  alvo?: AlvoDoCatalogo;
  rascunho?: RascunhoDoGrafico;
  catalogo?: typeof CAT | null;
  aoAdicionar?: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(true);
  return (
    <CatalogoDoEditor alvo={alvo} catalogo={catalogo ?? undefined} rascunho={rascunho} aberto={aberto} aoMudarAberto={setAberto} aoAdicionar={aoAdicionar}>
      <button type="button">abrir</button>
    </CatalogoDoEditor>
  );
}

describe("catálogo na tela", () => {
  it.each([
    ["indicador", "Adicionar Indicador"],
    ["variavel", "Adicionar Variável"],
    ["tempo", "Adicionar Tempo"],
    ["filtro", "Adicionar Filtro"],
  ] as const)("título do alvo %s", (alvo, titulo) => {
    render(<Montar alvo={alvo} />);
    expect(screen.getByRole("heading", { name: titulo })).toBeInTheDocument();
  });

  it("categorias de Todos a Campanhas, sem Meta; grupos fechados com a contagem", () => {
    render(<Montar />);
    for (const nome of ["Todos", "Negócios", "Atividades", "Conversas", "Ligações", "Campanhas"]) {
      expect(screen.getByRole("button", { name: nome })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Meta" })).toBeNull();
    expect(screen.getByText("· 3")).toBeInTheDocument();
  });

  it("grupo aberto mostra a linha representada e o detalhe do grupo; o item mostra a trilha, o selo e o antes de usar", async () => {
    const user = userEvent.setup();
    render(<Montar />);
    await user.click(screen.getByRole("button", { name: /^Negócio ·/ }));
    expect(screen.getAllByText("Uma linha por negócio.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("RESPONDE PERGUNTAS COMO", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText("Grupo selecionado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Quantidade/ }));
    expect(screen.getByText("Negócios / Negócio")).toBeInTheDocument();
    expect(screen.getAllByText("contagem").length).toBeGreaterThan(0);
    expect(screen.getByText("Antes de usar")).toBeInTheDocument();
    expect(screen.getByText("Ao clicar no número você vê")).toBeInTheDocument();
    expect(screen.getByText("Título")).toBeInTheDocument();
  });

  it("Adicionar chama aoAdicionar com o id e o popover continua aberto", async () => {
    const user = userEvent.setup();
    const aoAdicionar = vi.fn();
    render(<Montar aoAdicionar={aoAdicionar} />);
    await user.click(screen.getByRole("button", { name: /^Negócio ·/ }));
    await user.click(screen.getByRole("button", { name: /^Quantidade/ }));
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(aoAdicionar).toHaveBeenCalledWith("negocio.quantidade");
    expect(screen.getByRole("heading", { name: "Adicionar Indicador" })).toBeInTheDocument();
  });

  it("item já escolhido mostra Já adicionado e o botão desligado; outro assunto fica esmaecido", async () => {
    const user = userEvent.setup();
    render(<Montar rascunho={adicionarIndicador(rascunhoNovo(), "negocio.quantidade", CAT)} />);
    await user.click(screen.getByRole("button", { name: /^Negócio ·/ }));
    expect(screen.getByText("Já adicionado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Quantidade/ }));
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^Conversa ·/ }));
    expect(screen.getByRole("button", { name: /Conversas iniciadas/ }).className).toContain("opacity-50");
  });

  it("busca por apelido mostra também chamado de com o trecho marcado; sem achados, a mensagem", async () => {
    render(<Montar />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "vendas" } });
    await waitFor(() => expect(screen.getByText(/também chamado de/)).toBeInTheDocument());
    expect(document.querySelector("mark")?.textContent).toBe("vendas");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "xyz" } });
    await waitFor(() => expect(screen.getByText('Nada encontrado para "xyz"')).toBeInTheDocument());
  });

  it("categoria Conversas esconde Negócio", async () => {
    const user = userEvent.setup();
    render(<Montar />);
    await user.click(screen.getByRole("button", { name: "Conversas" }));
    expect(screen.queryByRole("button", { name: /^Negócio ·/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Conversa ·/ })).toBeInTheDocument();
  });

  it("variável com opções mostra Exemplo de como aparece com 3 valores", async () => {
    const user = userEvent.setup();
    render(<Montar alvo="variavel" />);
    await user.click(screen.getByRole("button", { name: /^Negócio ·/ }));
    await user.click(screen.getByRole("button", { name: /^Etapa/ }));
    expect(screen.getByText("Exemplo de como aparece:")).toBeInTheDocument();
    expect(screen.getByText("Proposta")).toBeInTheDocument();
    expect(screen.queryByText("Fechado")).toBeNull();
  });

  it("sem catálogo, Carregando indicadores...", () => {
    render(<Montar catalogo={null} />);
    expect(screen.getByText("Carregando indicadores...")).toBeInTheDocument();
  });
});
