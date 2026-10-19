import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "o1", role: "manager" }, user: { id: "u1" } }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({
    data: [{ user_id: "b0000000-0000-4000-8000-000000000001", full_name: "Camilly" }],
  }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({
    data: [{ agent_id: "c0000000-0000-4000-8000-000000000001", name: "Qualificação" }],
  }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({
    data: [
      {
        id: "d0000000-0000-4000-8000-000000000001",
        nome: "Atendimento",
        cor: "#597EFF",
        ids_dos_dispositivos: [],
      },
    ],
  }),
}));
vi.mock("@/hooks/escale/useGruposDasOrigens", () => ({
  useGruposDasOrigens: () => ({ data: [] }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({
    data: [
      {
        id: "e0000000-0000-4000-8000-000000000001",
        provider: "waha",
        status: "STOPPED",
        display_name: "Bathuly - 3062",
        phone_number: null,
      },
    ],
  }),
}));
vi.mock("@/components/inbox/ChannelLogo", () => ({
  ChannelLogo: () => <span data-testid="logo" />,
}));

import { PainelDeFiltrosDaFila } from "@/components/escale/conversas/filtros/PainelDeFiltrosDaFila";
import { OPCOES_VAZIAS } from "@/lib/escale/contatos/opcoes-do-filtro";
import type { FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";

const wrap = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => window.localStorage.clear());

describe("PainelDeFiltrosDaFila (c32, c64)", () => {
  it("os acordeões; Grupos só com grupos; o selo e o X da seção; Resetar só com critério", () => {
    const aoMudar = vi.fn();
    const painel: FiltrosDoPainel = { conversas: { status: ["em_espera"] } };
    const { rerender } = wrap(
      <PainelDeFiltrosDaFila
        painel={painel}
        aoMudar={aoMudar}
        aoFechar={vi.fn()}
        opcoes={OPCOES_VAZIAS}
        temGrupos={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Conversas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grupos" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Negócios" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contatos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Canais" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar Conversas" }));
    expect(aoMudar).toHaveBeenCalledWith({});
    fireEvent.click(screen.getByRole("button", { name: "Resetar" }));
    expect(aoMudar).toHaveBeenLastCalledWith({});
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <PainelDeFiltrosDaFila
          painel={{}}
          aoMudar={aoMudar}
          aoFechar={vi.fn()}
          opcoes={OPCOES_VAZIAS}
          temGrupos
        />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("button", { name: "Resetar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grupos" })).toBeInTheDocument();
  });

  it("Conversas: os 12 toggles na ordem da Clint; os de chamada desligados; ligar grava a marca", () => {
    const aoMudar = vi.fn();
    wrap(
      <PainelDeFiltrosDaFila
        painel={{}}
        aoMudar={aoMudar}
        aoFechar={vi.fn()}
        opcoes={OPCOES_VAZIAS}
        temGrupos={false}
      />,
    );
    const chaves = screen.getAllByRole("switch");
    expect(chaves).toHaveLength(12);
    expect(screen.getByRole("switch", { name: "Janela de chamada aberta" })).toBeDisabled();
    fireEvent.click(screen.getByRole("switch", { name: "Conversas suspensas" }));
    expect(aoMudar).toHaveBeenCalledWith({ conversas: { marcas: ["suspensas"] } });
    expect(screen.getAllByTestId("logo")).toHaveLength(4);
  });

  it("Canais: os dispositivos agrupados com 'Desconectado'", () => {
    wrap(
      <PainelDeFiltrosDaFila
        painel={{}}
        aoMudar={vi.fn()}
        aoFechar={vi.fn()}
        opcoes={OPCOES_VAZIAS}
        temGrupos={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Canais" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Canais e Dispositivos" }));
    const lista = screen.getByRole("group", { name: /^whatsapp$/i });
    expect(within(lista).getByText("Desconectado")).toBeInTheDocument();
  });

  it("lembra os acordeões abertos no navegador", () => {
    wrap(
      <PainelDeFiltrosDaFila
        painel={{}}
        aoMudar={vi.fn()}
        aoFechar={vi.fn()}
        opcoes={OPCOES_VAZIAS}
        temGrupos={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Negócios" }));
    expect(JSON.parse(window.localStorage.getItem("escale_acordeoes_da_fila") ?? "[]")).toContain(
      "negocios",
    );
  });
});
