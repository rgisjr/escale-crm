import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CartaoDoSumario } from "@/components/escale/campanhas/molde/CartaoDoSumario";
import { FunilDeConversao } from "@/components/escale/campanhas/molde/FunilDeConversao";
import { JanelaDoDetalhe } from "@/components/escale/campanhas/molde/JanelaDoDetalhe";
import { PreviaDoCelular } from "@/components/escale/campanhas/molde/PreviaDoCelular";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { TituloDaSecao } from "@/components/escale/campanhas/molde/TituloDaSecao";
import { partesDaMensagem } from "@/lib/escale/campanhas/detalhe/mensagem";

describe("JanelaDoDetalhe (009)", () => {
  it("rótulo, título como nome da janela, ações, abas e fechar", async () => {
    const aoFechar = vi.fn();
    const aoTrocarAba = vi.fn();
    render(
      <JanelaDoDetalhe
        aberta
        aoFechar={aoFechar}
        rotulo="INFORMAÇÕES DA CAMPANHA"
        titulo="10.09"
        acoes={<button type="button">Baixar .CSV</button>}
        abas={[
          { valor: "sumario", rotulo: "Sumário" },
          { valor: "detalhes", rotulo: "Detalhes" },
        ]}
        abaAtiva="sumario"
        aoTrocarAba={aoTrocarAba}
      >
        <p>conteúdo</p>
      </JanelaDoDetalhe>,
    );
    const janela = screen.getByRole("dialog", { name: "10.09" });
    expect(within(janela).getByText("INFORMAÇÕES DA CAMPANHA")).toBeInTheDocument();
    expect(within(janela).getByRole("button", { name: "Baixar .CSV" })).toBeInTheDocument();
    expect(within(janela).getByRole("tab", { name: "Sumário" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.click(within(janela).getByRole("tab", { name: "Detalhes" }));
    expect(aoTrocarAba).toHaveBeenCalledWith("detalhes");
    await userEvent.click(within(janela).getByRole("button", { name: "Fechar" }));
    expect(aoFechar).toHaveBeenCalled();
  });
});

describe("CartaoDoSumario (009, 011)", () => {
  it("rótulo, valor e o complemento com o ponto; o '?' com a dica", () => {
    render(
      <CartaoDoSumario
        rotulo="Entregues"
        dica="Percentual sobre os enviados."
        valor="88%"
        complemento="23"
      />,
    );
    expect(screen.getByText("Entregues")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("· 23")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Percentual sobre os enviados." })).toBeInTheDocument();
  });

  it("clicável vira botão; carregando mostra o esqueleto; children troca o valor", async () => {
    const aoClicar = vi.fn();
    const { rerender, container } = render(
      <CartaoDoSumario rotulo="Negócios criados" valor="8" aoClicar={aoClicar} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Negócios criados/ }));
    expect(aoClicar).toHaveBeenCalled();
    rerender(<CartaoDoSumario rotulo="Enviados" carregando />);
    expect(container.querySelector("[data-esqueleto]")).not.toBeNull();
    rerender(
      <CartaoDoSumario rotulo="Tempo mediano até resposta">
        <p>Não foi possível calcular o tempo de resposta.</p>
      </CartaoDoSumario>,
    );
    expect(screen.getByText("Não foi possível calcular o tempo de resposta.")).toBeInTheDocument();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("sem valor, o traço", () => {
    render(<CartaoDoSumario rotulo="Custo por resposta" subtitulo="Custo real" />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Custo real")).toBeInTheDocument();
  });
});

describe("FunilDeConversao (009)", () => {
  it("título e legenda padrão, 'n · p%' e a largura da barra; sem base, o traço", () => {
    const { container } = render(
      <FunilDeConversao
        etapas={[
          { chave: "enviados", rotulo: "Enviados", quantidade: 1500, porcento: 100 },
          { chave: "entregues", rotulo: "Entregues", quantidade: 23, porcento: 88 },
          { chave: "lidas", rotulo: "Lidas", quantidade: 0, porcento: null },
        ]}
      />,
    );
    expect(screen.getByText("Funil de conversão")).toBeInTheDocument();
    expect(screen.getByText("% sobre enviados")).toBeInTheDocument();
    expect(screen.getByText("1.500 · 100%")).toBeInTheDocument();
    expect(screen.getByText("0 · —")).toBeInTheDocument();
    const barra = container.querySelector('[data-etapa="entregues"] [data-barra]') as HTMLElement;
    expect(barra.style.width).toBe("88%");
  });

  it("a 8D troca título e legenda", () => {
    render(<FunilDeConversao etapas={[]} legenda="% sobre encontradas" />);
    expect(screen.getByText("% sobre encontradas")).toBeInTheDocument();
  });
});

describe("SecaoDoSumario e TituloDaSecao (010, 011)", () => {
  it("título, selo junto do título, legenda à direita e o conteúdo", () => {
    render(
      <>
        <TituloDaSecao>Resultado</TituloDaSecao>
        <SecaoDoSumario
          titulo="Motivos do erro"
          tituloGrande
          selo={<span>4 falhas</span>}
          legenda="% sobre não entregues"
        >
          <p>3 motivos em 4 falhas de envio</p>
        </SecaoDoSumario>
      </>,
    );
    expect(screen.getByRole("heading", { name: "Resultado" })).toBeInTheDocument();
    const secao = screen.getByRole("region", { name: "Motivos do erro" });
    expect(within(secao).getByText("4 falhas")).toBeInTheDocument();
    expect(within(secao).getByText("% sobre não entregues")).toBeInTheDocument();
    expect(within(secao).getByText("3 motivos em 4 falhas de envio")).toBeInTheDocument();
  });
});

describe("PreviaDoCelular (009)", () => {
  it("o nome da conta, o balão com a variável em chip e a hora", () => {
    const { container } = render(
      <PreviaDoCelular
        nomeDaConta="INSS de Obra"
        partes={partesDaMensagem("Oi, {{primeiro_nome}}! Tudo bem?")}
        hora="14:59"
      />,
    );
    expect(screen.getByText("INSS de Obra")).toBeInTheDocument();
    expect(container.querySelector('[data-variavel="primeiro_nome"]')).toHaveTextContent(
      "Primeiro nome",
    );
    expect(screen.getAllByText("14:59").length).toBeGreaterThan(0);
  });

  it("sem mensagem, o texto de vazio", () => {
    render(<PreviaDoCelular nomeDaConta="X" partes={[]} hora="10:00" />);
    expect(screen.getByText("Sem mensagem")).toBeInTheDocument();
  });
});
