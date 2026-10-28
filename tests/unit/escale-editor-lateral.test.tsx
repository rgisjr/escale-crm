import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/escale/useOpcoesDaDimensao", () => ({
  useOpcoesDaDimensao: () => ({ isLoading: false, data: [{ valor: "e1", rotulo: "Novo" }, { valor: "e2", rotulo: "Proposta" }] }),
}));

import { LateralDoEditor } from "@/components/escale/indicadores/editor/LateralDoEditor";
import type { ErroDoRascunho } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import { CHAVE_DA_LARGURA } from "@/lib/escale/indicadores/editor/preferencias";
import {
  adicionarCondicao,
  adicionarIndicador,
  adicionarVariavel,
  rascunhoNovo,
  type RascunhoDoGrafico,
} from "@/lib/escale/indicadores/editor/rascunho";
import { CATALOGO_FALSO as CAT } from "@/tests/helpers/catalogo-da-tela";

let ultimo: RascunhoDoGrafico;
function Montar({ inicial = rascunhoNovo(), erros = [] as ErroDoRascunho[] }: { inicial?: RascunhoDoGrafico; erros?: ErroDoRascunho[] }) {
  const [r, setR] = useState(inicial);
  useEffect(() => {
    ultimo = r;
  });
  return (
    <LateralDoEditor
      rascunho={r}
      catalogo={CAT}
      erroDoCatalogo={false}
      aoTentarOCatalogo={() => undefined}
      erros={erros}
      mudar={(f) => setR(f)}
      etapasDoResultado={[]}
    />
  );
}

beforeEach(() => window.localStorage.clear());

describe("lateral do editor", () => {
  it("abas Filtros e Opções; seções na ordem, com o Filtro Quantitativo; Indicador calculado só com indicador", () => {
    render(<Montar />);
    expect(screen.getByRole("tab", { name: "Filtros" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Opções" })).toBeInTheDocument();
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent?.replace("?", ""));
    expect(titulos).toEqual(["Indicador", "Variável", "Tempo", "Filtro", "Filtro Quantitativo"]);
    expect(screen.queryByText(/Indicador calculado/)).toBeNull();
  });

  it("o ? mostra a dica ao passar o mouse; Filtro não tem ?", async () => {
    const user = userEvent.setup();
    render(<Montar />);
    const ajudas = screen.getAllByRole("img", { name: "Ajuda" });
    expect(ajudas).toHaveLength(4);
    await user.hover(ajudas[0]!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Selecione os indicadores que você quer analisar no seu dashboard.");
  });

  it("chip do indicador com Remover; variável some o botão com 2; tempo volta o botão ao remover", async () => {
    const user = userEvent.setup();
    let r = adicionarIndicador(rascunhoNovo(), "negocio.quantidade", CAT);
    r = adicionarVariavel(adicionarVariavel(r, "negocio.etapa"), "negocio.origem");
    render(<Montar inicial={r} />);
    expect(screen.getByText("Negócio Quantidade")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar variável" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Adicionar campo de tempo/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Remover Negócio Data de criação" }));
    expect(screen.getByRole("button", { name: /Adicionar campo de tempo/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remover Negócio Quantidade" }));
    expect(ultimo.indicadores).toEqual([]);
  });

  it("erro de indicador mostra campo obrigatório", () => {
    render(<Montar erros={[{ secao: "indicador" }]} />);
    expect(screen.getByText("campo obrigatório")).toBeInTheDocument();
  });

  it("filtro: + Adicionar filtro abre o catálogo e cria a condição; o valor da lista aparece", async () => {
    const user = userEvent.setup();
    render(<Montar />);
    await user.click(screen.getByRole("button", { name: "Adicionar filtro" }));
    await user.click(screen.getByRole("button", { name: /^Negócio ·/ }));
    await user.click(screen.getByRole("button", { name: /^Etapa/ }));
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(ultimo.filtro[0]!.condicoes).toHaveLength(1);
    expect(screen.getByText("Corresponde a", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Negócio Etapa")).toBeInTheDocument();
    expect(screen.getByText("é")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Selecione a(s) etapa(s)" })).toBeInTheDocument();
  });

  it("trocar para está vazio esconde o valor; número aceita 1.234,5; sem valor mostra campo obrigatório", async () => {
    const user = userEvent.setup();
    let r = adicionarCondicao(rascunhoNovo(), 0, "negocio.etapa", CAT);
    const chave = r.filtro[0]!.condicoes[0]!.chave;
    const { rerender } = render(<Montar inicial={r} erros={[{ secao: "filtro", condicao: chave }]} />);
    expect(screen.getByText("campo obrigatório")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Operador" }));
    await user.click(screen.getByRole("option", { name: "está vazio" }));
    expect(screen.queryByRole("combobox", { name: "Selecione a(s) etapa(s)" })).toBeNull();

    r = adicionarCondicao(rascunhoNovo(), 0, "negocio.valor", CAT);
    rerender(<Montar key="numero" inicial={r} />);
    const campo = screen.getByRole("textbox", { name: "Valor" });
    fireEvent.change(campo, { target: { value: "1.234,5" } });
    expect(ultimo.filtro[0]!.condicoes[0]!.valor).toBe("1.234,5");
  });

  it("+ Novo grupo cria a 2ª caixa e some na 4ª", async () => {
    const user = userEvent.setup();
    const r = adicionarCondicao(rascunhoNovo(), 0, "negocio.titulo", CAT);
    render(<Montar inicial={r} />);
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole("button", { name: "Novo grupo" }));
      await user.keyboard("{Escape}");
    }
    expect(ultimo.filtro).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Novo grupo" })).toBeNull();
  });

  it("a alça muda a largura em 16 px pelo teclado e grava", () => {
    render(<Montar />);
    const alca = screen.getByRole("separator");
    expect(alca).toHaveAttribute("aria-valuenow", "400");
    fireEvent.keyDown(alca, { key: "ArrowRight" });
    expect(alca).toHaveAttribute("aria-valuenow", "416");
    expect(window.localStorage.getItem(CHAVE_DA_LARGURA)).toBe("416");
    expect(within(alca.parentElement!).getByRole("tab", { name: "Opções" })).toBeInTheDocument();
  });
});
