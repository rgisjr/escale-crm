import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/escale/useTagsDaCasca", () => ({
  useTagsDaCasca: () => ({ gravar: vi.fn(), renomear: vi.fn(), remover: vi.fn() }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u1", full_name: "Naiara Zeri" }] }),
}));

import { TelaDeTags } from "@/components/escale/configuracoes/tags/TelaDeTags";

const linhas = Array.from({ length: 12 }, (_, i) => ({
  tag: `tag${String(i).padStart(2, "0")}`,
  cor: null,
  descricao: i === 0 ? "Primeira" : null,
  emUso: i,
  criadaEm: i === 0 ? "2026-10-24T10:00:00Z" : null,
  criadaPor: i === 0 ? "u1" : null,
}));

describe("TelaDeTags", () => {
  it("mostra o cabeçalho da Clint, 10 por página e o total", () => {
    render(<TelaDeTags linhas={linhas} />);
    expect(screen.getByText("Tags cadastradas")).toBeInTheDocument();
    expect(screen.getByText("12 itens")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(11);
    const primeira = screen.getAllByRole("row")[1]!;
    expect(within(primeira).getByText("24/10/2026")).toBeInTheDocument();
    expect(within(primeira).getByText("Naiara Zeri")).toBeInTheDocument();
    expect(within(primeira).getByText("Primeira")).toBeInTheDocument();
  });

  it("a busca filtra e volta para a página 1", async () => {
    render(<TelaDeTags linhas={linhas} />);
    await userEvent.type(screen.getByPlaceholderText("Buscar"), "tag11");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("1 itens")).toBeInTheDocument();
  });

  it("⋮ abre Editar e Remover", async () => {
    render(<TelaDeTags linhas={linhas} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Ações" })[0]!);
    expect(screen.getByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Remover" })).toBeInTheDocument();
  });

  it("marcar uma tag mostra Remover selecionadas com a contagem", async () => {
    render(<TelaDeTags linhas={linhas} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar tag01" }));
    expect(screen.getByRole("button", { name: "Remover selecionadas (1)" })).toBeInTheDocument();
  });
});
