import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FaixaDeFiltros } from "@/components/escale/contatos/filtros/FaixaDeFiltros";
import { SecaoContatoDoFiltro } from "@/components/escale/contatos/filtros/SecaoContatoDoFiltro";
import type { FiltrosDeContatos } from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [] }) }));

const OPCOES: OpcoesDoFiltro = {
  origens: [],
  motivos: [],
  camposDoNegocio: [],
  camposDoContato: [],
  camposDaEmpresa: [],
};
const envolver = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("filtro Comentário (Fase 10C)", () => {
  it("a seção Contato mostra o grupo com o vazio 'Com/Sem comentário'", () => {
    envolver(<SecaoContatoDoFiltro filtros={{}} aoMudar={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Comentário" })).toBeInTheDocument();
    expect(screen.getByText("Com/Sem comentário")).toBeInTheDocument();
  });

  it("escolher 'Veio de comentário' mantém o resto do filtro, sem mutar a entrada", async () => {
    const aoMudar = vi.fn();
    const entrada: FiltrosDeContatos = Object.freeze({ telefone: "com" }) as FiltrosDeContatos;
    envolver(<SecaoContatoDoFiltro filtros={entrada} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Comentário" }));
    await userEvent.click(screen.getByRole("option", { name: "Veio de comentário" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ telefone: "com", comentario: "com" });
    expect(entrada).toEqual({ telefone: "com" });
  });

  it("limpar o seletor manda comentario undefined", async () => {
    const aoMudar = vi.fn();
    envolver(<SecaoContatoDoFiltro filtros={{ comentario: "sem" }} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Comentário" }));
    await userEvent.click(screen.getByRole("option", { name: "Com/Sem comentário" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ comentario: undefined });
  });

  it("a faixa mostra o chip e o × tira só ele", () => {
    const aoMudar = vi.fn();
    envolver(
      <FaixaDeFiltros
        filtros={{ comentario: "sem" }}
        opcoes={OPCOES}
        aoMudar={aoMudar}
        aoAbrir={vi.fn()}
        podeResetar
        aoResetar={vi.fn()}
        aoRecolher={vi.fn()}
      />,
    );
    expect(screen.getByText("Não veio de comentário")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover filtro Comentário" }));
    expect(aoMudar).toHaveBeenLastCalledWith({});
  });
});
