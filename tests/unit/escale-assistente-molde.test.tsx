import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PreviaDoCelular } from "@/components/escale/campanhas/assistente/PreviaDoCelular";
import { BarraDePassos } from "@/components/escale/campanhas/molde/BarraDePassos";
import { CampoComContador } from "@/components/escale/campanhas/molde/CampoComContador";
import { CartaoDeEscolha } from "@/components/escale/campanhas/molde/CartaoDeEscolha";
import { MoldeDoAssistente } from "@/components/escale/campanhas/molde/MoldeDoAssistente";
import { ResumoDoEnvio } from "@/components/escale/campanhas/molde/ResumoDoEnvio";
import { RodapeDoAssistente } from "@/components/escale/campanhas/molde/RodapeDoAssistente";
import { SeletorDeNumero } from "@/components/escale/campanhas/molde/SeletorDeNumero";
import { TrilhaDoAssistente } from "@/components/escale/campanhas/molde/TrilhaDoAssistente";
import { partesDoModelo, partesDoTexto, rotuloDoCampo } from "@/lib/escale/campanhas/previa";

describe("TrilhaDoAssistente e BarraDePassos", () => {
  it("a trilha liga os anteriores e marca o último como a página", () => {
    render(<TrilhaDoAssistente itens={[{ rotulo: "Campanhas", href: "/app/campaigns" }, { rotulo: "WhatsApp", href: "/app/campaigns" }, { rotulo: "Nova campanha" }]} />);
    expect(screen.getByRole("link", { name: "Campanhas" })).toHaveAttribute("href", "/app/campaigns");
    expect(screen.getByText("Nova campanha")).toHaveAttribute("aria-current", "page");
  });

  it("a barra mostra o feito com check, o atual cheio e o futuro numerado", () => {
    render(<BarraDePassos passos={["Um", "Dois", "Três"]} atual={1} />);
    const passos = screen.getAllByRole("listitem");
    expect(passos[0]!.querySelector("svg")).not.toBeNull();
    expect(passos[1]).toHaveAttribute("aria-current", "step");
    expect(within(passos[2]!).getByText("3")).toBeInTheDocument();
  });
});

describe("RodapeDoAssistente e MoldeDoAssistente", () => {
  it("Voltar, os extras e o principal (que trava enquanto carrega)", async () => {
    const voltar = vi.fn();
    const proximo = vi.fn();
    const { rerender } = render(
      <RodapeDoAssistente aoVoltar={voltar} extras={<button type="button">Salvar como rascunho</button>} principal={{ rotulo: "Próximo", aoClicar: proximo }} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(voltar).toHaveBeenCalledOnce();
    expect(proximo).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Salvar como rascunho" })).toBeInTheDocument();
    rerender(<RodapeDoAssistente principal={{ rotulo: "Próximo", aoClicar: proximo, carregando: true }} />);
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
  });

  it("o molde junta trilha, passos, conteúdo, lateral e rodapé", () => {
    render(
      <MoldeDoAssistente trilha={<nav>trilha</nav>} passos={["A", "B"]} atual={0} rodape={<footer>rodapé</footer>} lateral={<p>celular</p>}>
        <p>conteúdo</p>
      </MoldeDoAssistente>,
    );
    for (const texto of ["trilha", "conteúdo", "celular", "rodapé"]) expect(screen.getByText(texto)).toBeInTheDocument();
  });
});

describe("SeletorDeNumero", () => {
  const numeros = [
    { id: "n1", nome: "Bathully - Oficial", telefone: "+551153043062", conectado: true, grupo: "WhatsApp Oficial", setor: "Atendimento" },
    { id: "n2", nome: "Naiara", telefone: "+5516999653041", conectado: true, grupo: "WhatsApp não oficial", setor: null },
  ];

  it("abre agrupado, com telefone e setor, e escolhe", async () => {
    const aoMudar = vi.fn();
    render(<SeletorDeNumero numeros={numeros} valor={null} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: /Selecionar conta/ }));
    expect(screen.getByRole("group", { name: "WhatsApp Oficial" })).toBeInTheDocument();
    expect(screen.getByText("(11) 5304-3062 · Atendimento")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: /Naiara/ }));
    expect(aoMudar).toHaveBeenCalledWith("n2");
  });

  it("sem números, o vazio da Clint", async () => {
    render(<SeletorDeNumero numeros={[]} valor={null} aoMudar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Selecionar conta/ }));
    expect(screen.getByText("Nenhum dispositivo disponível")).toBeInTheDocument();
  });
});

describe("CartaoDeEscolha, CampoComContador e ResumoDoEnvio", () => {
  it("o cartão é um rádio", async () => {
    const aoEscolher = vi.fn();
    render(<CartaoDeEscolha selecionado={false} aoEscolher={aoEscolher} titulo="Enviar agora" descricao="A campanha entra na fila imediatamente." />);
    const radio = screen.getByRole("radio", { name: /Enviar agora/ });
    expect(radio).toHaveAttribute("aria-checked", "false");
    await userEvent.click(radio);
    expect(aoEscolher).toHaveBeenCalledOnce();
  });

  it("o contador conta e avisa no limite", () => {
    const { rerender } = render(<CampoComContador rotulo="Nome da campanha" valor="Teste prints" aoMudar={vi.fn()} maximo={80} />);
    expect(screen.getByText("12/80")).toBeInTheDocument();
    rerender(<CampoComContador rotulo="Nome da campanha" valor={"x".repeat(80)} aoMudar={vi.fn()} maximo={80} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Limite de 80 caracteres atingido.");
  });

  it("o resumo lista as linhas e o rodapé", () => {
    render(<ResumoDoEnvio linhas={[{ icone: null, rotulo: "Nome da campanha", valor: "Teste" }]} rodape={<p>Custo estimado:</p>} />);
    expect(screen.getByText("Nome da campanha")).toBeInTheDocument();
    expect(screen.getByText("Teste")).toBeInTheDocument();
    expect(screen.getByText("Custo estimado:")).toBeInTheDocument();
  });
});

describe("prévia", () => {
  const personalizados = [{ campo: "contato.cidade", rotulo: "Cidade" }];

  it("os rótulos dos campos", () => {
    expect(rotuloDoCampo("primeiro_nome", personalizados)).toBe("Primeiro nome");
    expect(rotuloDoCampo("contato.cidade", personalizados)).toBe("Cidade");
    expect(rotuloDoCampo("lead.gancho", personalizados)).toBe("gancho");
  });

  it("texto livre: as variáveis viram chips; o resto é texto", () => {
    expect(partesDoTexto("Oi, {{primeiro_nome}}! De {{contato.cidade}}?", personalizados)).toEqual([
      { tipo: "texto", texto: "Oi, " },
      { tipo: "variavel", rotulo: "Primeiro nome" },
      { tipo: "texto", texto: "! De " },
      { tipo: "variavel", rotulo: "Cidade" },
      { tipo: "texto", texto: "?" },
    ]);
  });

  it("modelo: campo vira chip, valor fixo vira texto, sem variável fica {{n}}", () => {
    expect(
      partesDoModelo(
        {
          tipo: "modelo",
          nome: "m",
          idioma: "pt_BR",
          categoria: null,
          corpo: "Oi, {{1}}! Time {{2}} {{3}}",
          variaveis: { "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null }, "2": { fonte: "fixo", valor: "Escale" } },
        },
        [],
      ),
    ).toEqual([
      { tipo: "texto", texto: "Oi, " },
      { tipo: "variavel", rotulo: "Primeiro nome" },
      { tipo: "texto", texto: "! Time " },
      { tipo: "texto", texto: "Escale" },
      { tipo: "texto", texto: " " },
      { tipo: "texto", texto: "{{3}}" },
    ]);
  });

  it("o celular mostra o balão com o chip ou o vazio", () => {
    const { rerender } = render(<PreviaDoCelular dispositivo="Naiara" partes={[{ tipo: "texto", texto: "Oi, " }, { tipo: "variavel", rotulo: "Primeiro nome" }]} vazio="Selecione um modelo para ver a prévia da mensagem" />);
    expect(screen.getByText("Naiara")).toBeInTheDocument();
    expect(screen.getByText("Primeiro nome")).toBeInTheDocument();
    rerender(<PreviaDoCelular dispositivo={null} partes={null} vazio="Selecione um modelo para ver a prévia da mensagem" />);
    expect(screen.getByText("Selecione um modelo para ver a prévia da mensagem")).toBeInTheDocument();
    expect(screen.getByText("Dispositivo")).toBeInTheDocument();
  });
});
