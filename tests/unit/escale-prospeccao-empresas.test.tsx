import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmpresasDaProspeccao } from "@/components/escale/prospeccao/detalhe/EmpresasDaProspeccao";
import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { RAZAO_NAO_SELECIONADA } from "@/lib/prospecting/schema";
import { detalhe, empresa, ID } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({ useAcaoDaProspeccao: vi.fn() }));

const mutateAsync = vi.fn();
beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({});
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
});

const DUAS = [
  empresa({ id: "a" }),
  empresa({
    id: "b",
    progresso: "qualified",
    conversaId: null,
    dados: { ...empresa().dados, name: "Studio Pele", phone: null },
  }),
];

describe("EmpresasDaProspeccao (012; D10)", () => {
  it("volta para uma página com linhas quando a lista encolhe (B9-5)", async () => {
    const muitas = Array.from({ length: 25 }, (_, i) => empresa({ id: `m${i}` }));
    const { rerender } = render(<EmpresasDaProspeccao detalhe={detalhe({ empresas: muitas })} />);
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    rerender(<EmpresasDaProspeccao detalhe={detalhe({ empresas: muitas.slice(0, 5) })} />);
    expect(screen.queryByText("Nenhuma empresa neste filtro")).not.toBeInTheDocument();
    expect(screen.getAllByText("Clínica Bela")).toHaveLength(5);
  });

  it("tabela: empresa, telefone, progresso, conversa; contagem", () => {
    render(<EmpresasDaProspeccao detalhe={detalhe({ empresas: DUAS })} />);
    expect(screen.getByText("2 empresas")).toBeInTheDocument();
    expect(screen.getByText("Clínica Bela")).toBeInTheDocument();
    expect(screen.getByText("Sem telefone")).toBeInTheDocument();
    expect(screen.getByText("Respondeu")).toBeInTheDocument();
    expect(screen.getByText("Qualificado")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Abrir conversa" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Abrir conversa" })).toHaveAttribute(
      "href",
      "/app/inbox?id=v1",
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("busca por nome", () => {
    render(<EmpresasDaProspeccao detalhe={detalhe({ empresas: DUAS })} />);
    fireEvent.change(screen.getByPlaceholderText("Buscar empresa"), { target: { value: "pele" } });
    expect(screen.queryByText("Clínica Bela")).not.toBeInTheDocument();
    expect(screen.getByText("Studio Pele")).toBeInTheDocument();
  });

  it("rascunho: caixas e Desmarcar todas pelo select", async () => {
    const rascunho = detalhe({
      status: "draft",
      empresas: [
        empresa({ id: "a", status: "new", progresso: "new" }),
        empresa({ id: "b", status: "new", progresso: "new" }),
      ],
    });
    render(<EmpresasDaProspeccao detalhe={rascunho} />);
    expect(
      screen.getByText("Somente as empresas marcadas entram na fila ao iniciar as abordagens."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Desmarcar todas" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      action: "select",
      id: ID,
      candidate_ids: ["a", "b"],
      selected: false,
    });
  });

  it("pausada: desmarcar uma na fila vai pelo select_in_queue", async () => {
    const pausada = detalhe({
      status: "paused",
      empresas: [
        empresa({
          id: "a",
          status: "queued",
          progresso: "queued",
          conversaId: null,
          negocioId: null,
        }),
      ],
    });
    render(<EmpresasDaProspeccao detalhe={pausada} />);
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Marcar empresa para abordagem: Clínica Bela" }),
    );
    expect(mutateAsync).toHaveBeenCalledWith({
      action: "select_in_queue",
      id: ID,
      candidate_ids: ["a"],
      selected: false,
    });
  });

  it("excluir desmarcadas pede confirmação e usa o discard_unselected", async () => {
    const pausada = detalhe({
      status: "paused",
      empresas: [
        empresa({
          id: "a",
          status: "skipped",
          selecionada: false,
          erro: RAZAO_NAO_SELECIONADA,
          conversaId: null,
          negocioId: null,
          progresso: "skipped",
        }),
      ],
    });
    render(<EmpresasDaProspeccao detalhe={pausada} />);
    await userEvent.click(screen.getByRole("button", { name: "Excluir desmarcadas (1)" }));
    expect(
      screen.getByText(
        "As empresas desmarcadas saem desta lista e podem aparecer de novo numa busca futura. Esta ação não pode ser desfeita.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Excluir desmarcadas" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "discard_unselected", id: ID });
  });
});
