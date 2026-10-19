import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const salvos = vi.hoisted(() => ({
  lista: [] as Array<{
    id: string;
    nome: string;
    compartilhado: boolean;
    meu: boolean;
    criterios: object;
  }>,
  criar: vi.fn(),
  excluir: vi.fn(),
  mudar: vi.fn(),
}));
vi.mock("@/hooks/escale/useFiltrosDaLista", () => ({
  useFiltrosDaLista: () => ({ data: salvos.lista }),
  useCriarFiltroDaLista: () => ({ mutate: salvos.criar, isPending: false }),
  useExcluirFiltroDaLista: () => ({ mutate: salvos.excluir }),
  useMudarFiltroDaLista: () => ({ mutate: salvos.mudar, isPending: false }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "o1", role: "manager" } }),
}));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({
  useConversationCounts: () => ({ data: { all: 120 } }),
}));

import { BalaoSalvarFiltro } from "@/components/escale/conversas/filtros/BalaoSalvarFiltro";
import { FunilDaFila } from "@/components/escale/conversas/filtros/FunilDaFila";
import { MenuDePresets } from "@/components/escale/conversas/fila/MenuDePresets";

const wrap = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  salvos.lista = [];
  vi.clearAllMocks();
});

describe("o botão de presets (c31, c71)", () => {
  it("mostra o preset, 'Personalizado' fora dele e o nome do salvo aplicado", () => {
    const { rerender } = wrap(
      <MenuDePresets
        painel={{ conversas: { status: ["em_espera"] } }}
        aoMudarPainel={vi.fn()}
        aoCriarFiltro={vi.fn()}
        temGrupos={false}
      />,
    );
    expect(screen.getByRole("button", { name: /Em espera/ })).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MenuDePresets
          painel={{ conversas: { marcas: ["suspensas"] } }}
          aoMudarPainel={vi.fn()}
          aoCriarFiltro={vi.fn()}
          temGrupos={false}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: /Personalizado/ })).toBeInTheDocument();
    salvos.lista = [
      {
        id: "s1",
        nome: "Suspensas",
        compartilhado: false,
        meu: true,
        criterios: { conversas: { marcas: ["suspensas"] } },
      },
    ];
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MenuDePresets
          painel={{ conversas: { marcas: ["suspensas"] } }}
          aoMudarPainel={vi.fn()}
          aoCriarFiltro={vi.fn()}
          temGrupos={false}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: /Suspensas/ })).toBeInTheDocument();
  });

  it("escolher preset ou salvo muda o painel; 'Criar filtro' abre o painel", () => {
    const aoMudarPainel = vi.fn();
    const aoCriarFiltro = vi.fn();
    salvos.lista = [
      {
        id: "s1",
        nome: "Perdidos",
        compartilhado: false,
        meu: true,
        criterios: { negocios: { status: ["lost"] } },
      },
    ];
    wrap(
      <MenuDePresets
        painel={{}}
        aoMudarPainel={aoMudarPainel}
        aoCriarFiltro={aoCriarFiltro}
        temGrupos
      />,
    );
    fireEvent.pointerDown(screen.getByRole("button", { name: /Todos/ }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(screen.getByRole("menuitem", { name: /Fechadas/ }));
    expect(aoMudarPainel).toHaveBeenCalledWith({ conversas: { status: ["fechado"] } });
    fireEvent.pointerDown(screen.getByRole("button", { name: /Todos/ }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByRole("menuitem", { name: /Somente grupos/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /Perdidos/ }));
    expect(aoMudarPainel).toHaveBeenLastCalledWith({ negocios: { status: ["lost"] } });
    fireEvent.pointerDown(screen.getByRole("button", { name: /Todos/ }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(screen.getByRole("menuitem", { name: /Criar filtro/ }));
    expect(aoCriarFiltro).toHaveBeenCalled();
  });
});

describe("o funil e o Salvar filtro (c64, c72)", () => {
  it("o funil mostra o selo com o total de critérios", () => {
    render(<FunilDaFila total={1} ativo={false} aoAlternar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Filtros" })).toHaveTextContent("1");
  });

  it("o balão grava o nome com o painel enxuto", () => {
    wrap(<BalaoSalvarFiltro painel={{ conversas: { status: ["em_espera"], atendentes: [] } }} />);
    fireEvent.click(screen.getByRole("button", { name: /Salvar filtro/ }));
    fireEvent.change(screen.getByPlaceholderText("Ex: Clientes em aberto"), {
      target: { value: "Espera" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvos.criar).toHaveBeenCalledWith(
      { nome: "Espera", compartilhado: false, criterios: { conversas: { status: ["em_espera"] } } },
      expect.anything(),
    );
  });
});
