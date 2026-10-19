import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({
    data: [{ user_id: "b0000000-0000-4000-8000-000000000001", full_name: "Camilly" }],
  }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({ data: [{ id: "s1", nome: "Atendimento", cor: "#597EFF" }] }),
}));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip"] }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "o1", role: "manager" } }),
}));

import { CabecalhoDaSelecao } from "@/components/escale/conversas/massa/CabecalhoDaSelecao";
import { CentroDeAcoesEmMassa } from "@/components/escale/conversas/massa/CentroDeAcoesEmMassa";
import { FaixaDoFiltroInteiro } from "@/components/escale/conversas/massa/FaixaDoFiltroInteiro";
import { JanelaDaAcaoEmMassa } from "@/components/escale/conversas/massa/JanelaDaAcaoEmMassa";

describe("a seleção (c25, c82, c83; N12)", () => {
  it("'Selecionar todos' sem marcadas, '{n} selecionados' com; o X sai", () => {
    const aoSair = vi.fn();
    const { rerender } = render(
      <CabecalhoDaSelecao
        estado={false}
        selecionadas={0}
        aoMarcarCarregadas={vi.fn()}
        aoSair={aoSair}
      />,
    );
    expect(screen.getByText("Selecionar todos")).toBeInTheDocument();
    rerender(
      <CabecalhoDaSelecao
        estado
        selecionadas={56127}
        aoMarcarCarregadas={vi.fn()}
        aoSair={aoSair}
      />,
    );
    expect(screen.getByText("56.127 selecionados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sair de ação em massa" }));
    expect(aoSair).toHaveBeenCalled();
  });

  it("a faixa oferece todas as do filtro, com o total escrito", () => {
    const aoSelecionarTodas = vi.fn();
    render(
      <FaixaDoFiltroInteiro
        modo="carregadas"
        carregadas={50}
        total={56128}
        aoSelecionarTodas={aoSelecionarTodas}
        aoLimpar={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Selecionar todas as 56.128 conversas do filtro" }),
    );
    expect(aoSelecionarTodas).toHaveBeenCalled();
  });
});

describe("as ações (c25–c30)", () => {
  it("os 4 cartões, o submenu de tag e 'Sair de ação em massa'", () => {
    const aoEscolher = vi.fn();
    render(<CentroDeAcoesEmMassa selecionadas={1} aoEscolher={aoEscolher} aoSair={vi.fn()} />);
    expect(screen.getByText("1 conversa selecionada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Alterar status" }));
    expect(aoEscolher).toHaveBeenCalledWith("status");
    fireEvent.click(screen.getByRole("button", { name: "Alterar tag do contato" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(aoEscolher).toHaveBeenLastCalledWith("remover_tag");
  });

  it("sem nenhuma marcada, avisa com o texto da Clint", () => {
    const aoEscolher = vi.fn();
    render(<CentroDeAcoesEmMassa selecionadas={0} aoEscolher={aoEscolher} aoSair={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Alterar setor" }));
    expect(aoEscolher).not.toHaveBeenCalled();
  });

  it("a janela: o campo da ação e 'Executar ação em massa' só com valor", () => {
    const aoExecutar = vi.fn();
    render(
      <JanelaDaAcaoEmMassa
        acao="setor"
        aoFechar={vi.fn()}
        aoExecutar={aoExecutar}
        executando={false}
      />,
    );
    expect(screen.getByText("Alterar setor")).toBeInTheDocument();
    expect(screen.getByText("Equipe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Executar ação em massa" })).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "Equipe" }));
    fireEvent.click(screen.getByRole("option", { name: "Atendimento" }));
    fireEvent.click(screen.getByRole("button", { name: "Executar ação em massa" }));
    expect(aoExecutar).toHaveBeenCalledWith({ setor_id: "s1" });
  });
});
