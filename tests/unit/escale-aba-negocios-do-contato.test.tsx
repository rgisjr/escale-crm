import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AbaNegociosDoContato } from "@/components/escale/contatos/ficha/AbaNegociosDoContato";
import type { NegocioDoContato } from "@/lib/escale/ficha-do-contato/regras";

const lote = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/hooks/kanban/useBulkAction", () => ({ useBulkAction: () => ({ ...lote, isPending: false }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => true }));

const negocio = (n: number, extra: Partial<NegocioDoContato> = {}): NegocioDoContato => ({
  id: `n${n}`,
  titulo: `Negócio ${n}`,
  origem_id: "o1",
  origem_nome: "Pedidos",
  origem_arquivada: false,
  etapa_nome: "Novo",
  status: "open",
  motivo_de_perda: null,
  valor_cents: null,
  moeda: null,
  dono_id: "u1",
  dono_nome: "Camilly",
  criado_em: "2026-10-01T10:00:00Z",
  ...extra,
});

function montar(negocios: NegocioDoContato[]) {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <AbaNegociosDoContato contatoId="c1" ficha={{ negocios, etapas: {} }} />
    </QueryClientProvider>,
  );
}

describe("AbaNegociosDoContato (Fase 2E, N9)", () => {
  it("as colunas da Clint; 'Motivo de perda' só com perdido; o dono na dica", () => {
    montar([negocio(1), negocio(2, { status: "lost", motivo_de_perda: "Preço", dono_id: null, dono_nome: null })]);
    for (const c of ["Negócio", "Origem", "Etapa", "Status", "Motivo de perda", "Ações"]) {
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    }
    expect(screen.getByTitle("Dono: Camilly")).toBeInTheDocument();
    expect(screen.getByTitle("Sem dono")).toBeInTheDocument();
    expect(screen.getByText("Preço")).toBeInTheDocument();
  });

  it("sem perdido, sem a coluna; arquivados escondidos até 'Mostrar arquivados'", () => {
    montar([negocio(1), negocio(3, { origem_arquivada: true })]);
    expect(screen.queryByRole("columnheader", { name: "Motivo de perda" })).toBeNull();
    expect(screen.queryByText("Negócio 3")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar arquivados" }));
    expect(screen.getByText("Negócio 3")).toBeInTheDocument();
    expect(screen.getByText("Arquivado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar arquivados" })).toBeInTheDocument();
  });

  it("⋮: 'Ir para o negócio' e 'Excluir negócio' com a confirmação", async () => {
    montar([negocio(1)]);
    const linha = screen.getByRole("row", { name: /Negócio 1/ });
    fireEvent.pointerDown(within(linha).getByRole("button", { name: "Ações" }), { button: 0, ctrlKey: false });
    expect(await screen.findByRole("menuitem", { name: "Ir para o negócio" })).toHaveAttribute("href", "/app/negocios/n1");
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir negócio" }));
    expect(await screen.findByText("Tem certeza que deseja excluir o negócio selecionado?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() =>
      expect(lote.mutate).toHaveBeenCalledWith({ action: "delete", lead_ids: ["n1"], params: {} }, expect.anything()),
    );
  });
});
