import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { AlternanciaDaCasca } from "@/components/escale/ui/AlternanciaDaCasca";
import { BalaoDoNome } from "@/components/escale/ui/BalaoDoNome";
import { BandeiraDaMoeda } from "@/components/escale/ui/BandeiraDaMoeda";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorDeChipsDaCasca } from "@/components/escale/ui/SeletorDeChipsDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { TooltipProvider } from "@/components/ui/tooltip";

const usuario = () => userEvent.setup({ pointerEventsCheck: 0 });

describe("AlternanciaDaCasca", () => {
  it("dois lados, um marcado", async () => {
    const aoMudar = vi.fn();
    render(
      <AlternanciaDaCasca
        valor="ao_sair"
        aoMudar={aoMudar}
        aria-label="Quando"
        opcoes={[
          { valor: "ao_sair", rotulo: "Ao sair" },
          { valor: "ao_entrar", rotulo: "Ao entrar" },
        ]}
      />,
    );
    expect(screen.getByRole("radio", { name: "Ao sair" })).toHaveAttribute("aria-checked", "true");
    await usuario().click(screen.getByRole("radio", { name: "Ao entrar" }));
    expect(aoMudar).toHaveBeenCalledWith("ao_entrar");
  });
});

function Multiplo() {
  const [valores, setValores] = useState<string[]>([]);
  return (
    <SeletorMultiploDaCasca
      valores={valores}
      aoMudar={setValores}
      aria-label="Etapas"
      vazio="Nenhuma etapa"
      exclusiva="all"
      opcoes={[
        { valor: "all", rotulo: "Todas as etapas" },
        { valor: "e1", rotulo: "Novo" },
        { valor: "e2", rotulo: "Proposta" },
      ]}
    />
  );
}

describe("SeletorMultiploDaCasca", () => {
  it("mostra o vazio, abre a lista, marca várias e a exclusiva limpa as outras", async () => {
    render(<Multiplo />);
    const gatilho = screen.getByRole("combobox", { name: "Etapas" });
    expect(gatilho).toHaveTextContent("Nenhuma etapa");
    const u = usuario();
    await u.click(gatilho);
    await u.click(screen.getByRole("checkbox", { name: "Novo" }));
    await u.click(screen.getByRole("checkbox", { name: "Proposta" }));
    expect(gatilho).toHaveTextContent("Novo, Proposta");
    await u.click(screen.getByRole("checkbox", { name: "Todas as etapas" }));
    expect(gatilho).toHaveTextContent("Todas as etapas");
    expect(screen.getByRole("checkbox", { name: "Novo" })).toHaveAttribute("aria-checked", "false");
    await u.click(screen.getByRole("checkbox", { name: "Novo" }));
    expect(gatilho).toHaveTextContent("Novo");
    expect(screen.getByRole("checkbox", { name: "Todas as etapas" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});

function Chips({ inicial = ["Preço"] }: { inicial?: string[] }) {
  const [valores, setValores] = useState<string[]>(inicial);
  return (
    <SeletorDeChipsDaCasca
      valores={valores}
      aoMudar={setValores}
      aria-label="Motivos de perda"
      opcoes={["Preço", "Sumiu", "Sem orçamento"]}
    />
  );
}

describe("SeletorDeChipsDaCasca", () => {
  it("chips das escolhidas; a lista só com as que faltam; digitar filtra; sem nenhuma, Nenhum resultado", async () => {
    render(<Chips />);
    const u = usuario();
    expect(screen.getByRole("button", { name: "Remover Preço" })).toBeInTheDocument();
    await u.click(screen.getByRole("combobox", { name: "Motivos de perda" }));
    expect(screen.queryByRole("option", { name: "Preço" })).toBeNull();
    await u.click(screen.getByRole("option", { name: "Sumiu" }));
    expect(screen.getByRole("button", { name: "Remover Sumiu" })).toBeInTheDocument();
    await u.type(screen.getByRole("combobox", { name: "Motivos de perda" }), "zzz");
    expect(screen.getByText("Nenhum resultado")).toBeInTheDocument();
  });

  it("o × do chip tira um, o Backspace tira o último e o × da direita limpa tudo", async () => {
    render(<Chips inicial={["Preço", "Sumiu", "Sem orçamento"]} />);
    const u = usuario();
    await u.click(screen.getByRole("button", { name: "Remover Preço" }));
    expect(screen.queryByRole("button", { name: "Remover Preço" })).toBeNull();
    await u.click(screen.getByRole("combobox", { name: "Motivos de perda" }));
    await u.keyboard("{Backspace}");
    expect(screen.queryByRole("button", { name: "Remover Sem orçamento" })).toBeNull();
    await u.click(screen.getByRole("button", { name: "Limpar tudo" }));
    expect(screen.queryByRole("button", { name: /^Remover / })).toBeNull();
  });
});

describe("BalaoDoNome", () => {
  it("abre com o título Nome; Salvar começa claro; o erro fica; sem erro, fecha", async () => {
    const aoSalvar = vi.fn((texto: string) =>
      texto === "Preço" ? "Esse motivo de perda já existe." : null,
    );
    render(
      <BalaoDoNome
        aria-label="Novo motivo de perda"
        placeholder="Adicione um motivo de perda"
        aoSalvar={aoSalvar}
        gatilho={<button type="button">Abrir</button>}
      />,
    );
    const u = usuario();
    await u.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.getByText("Nome")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    const campo = screen.getByRole("textbox", { name: "Novo motivo de perda" });
    await u.type(campo, "Preço{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Esse motivo de perda já existe.");
    await u.clear(campo);
    await u.type(campo, "Sumiu");
    await u.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenLastCalledWith("Sumiu");
    expect(screen.queryByRole("textbox", { name: "Novo motivo de perda" })).toBeNull();
  });
});

describe("SeletorDaCasca com aparencia janela (F18)", () => {
  it("sem busca mesmo com muitas opções, e a escolhida no azul do react-select", async () => {
    render(
      <SeletorDaCasca
        aparencia="janela"
        valor="g3"
        aoMudar={vi.fn()}
        aria-label="Grupo"
        opcoes={Array.from({ length: 10 }, (_, i) => ({ valor: `g${i}`, rotulo: `Grupo ${i}` }))}
      />,
    );
    await usuario().click(screen.getByRole("combobox", { name: "Grupo" }));
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.getByRole("option", { name: "Grupo 3" }).className).toContain(
      "--escale-seletor-foco",
    );
  });
});

describe("AbasDaCasca", () => {
  it("tablist com a ativa", async () => {
    const aoMudar = vi.fn();
    render(
      <AbasDaCasca
        aria-label="Configurações da origem"
        valor="geral"
        aoMudar={aoMudar}
        abas={[
          { valor: "geral", rotulo: "Geral" },
          { valor: "etapas", rotulo: "Etapas e atividades" },
        ]}
      />,
    );
    expect(screen.getByRole("tab", { name: "Geral" })).toHaveAttribute("aria-selected", "true");
    await usuario().click(screen.getByRole("tab", { name: "Etapas e atividades" }));
    expect(aoMudar).toHaveBeenCalledWith("etapas");
  });
});

describe("AjudaDaCasca", () => {
  it("o ? tem o texto no nome acessível", () => {
    render(
      <TooltipProvider>
        <AjudaDaCasca texto="Selecione a moeda." />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "Ajuda: Selecione a moeda." })).toBeInTheDocument();
  });
});

describe("BandeiraDaMoeda", () => {
  it("desenha a bandeira e some para leitor de tela", () => {
    const { container } = render(<BandeiraDaMoeda moeda="BRL" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
