import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  usePathname: () => "/app/inbox",
  useSearchParams: () => nav.params,
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeOrg: { orgId: "org1", role: "agent" },
    user: { id: "u1", support: null },
  }),
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "org1", role: "agent" }),
  usePermission: () => true,
}));
const fila = vi.hoisted(() => ({
  data: { pages: [{ data: [] as unknown[] }] },
  isLoading: false,
  isError: false,
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
  realtimeStatus: "SUBSCRIBED",
}));
vi.mock("@/hooks/escale/useFilaDeConversas", () => ({ useFilaDeConversas: () => fila }));
vi.mock("@/hooks/inbox/useConversation", () => ({
  useConversation: () => ({ data: undefined, isPending: false, error: null }),
  isNotFound: () => false,
}));
const marcar = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/inbox/useMarkAsRead", () => ({ useMarkAsRead: marcar }));
const canais = vi.hoisted(() => ({ data: [{ id: "ch1" }] as unknown[], isLoading: false }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({ useChannelSessions: () => canais }));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({
  useConversationCounts: () => ({ data: { all: 120, fila: 0, unassigned: 0, mine: 0 } }),
}));
vi.mock("@/hooks/escale/usePreferenciasDeConversas", async () => {
  const { PREFERENCIAS_PADRAO } = await import("@/lib/escale/conversas/preferencias");
  return {
    usePreferenciasDeConversas: () => ({ data: PREFERENCIAS_PADRAO, isLoading: false }),
    useGravarPreferencia: () => ({ mutate: vi.fn(), isPending: false }),
  };
});
vi.mock("@/components/escale/conversas/centro/ConversaAberta", () => ({
  ConversaAberta: () => <div data-testid="conversa-aberta" />,
}));
vi.mock("@/components/escale/conversas/painel/PainelDoContato", () => ({
  PainelDoContato: ({ conversa }: { conversa: unknown }) => (
    <div data-testid="painel">{conversa ? "com conversa" : "Nenhuma conversa selecionada"}</div>
  ),
}));

import { ConversasDaCasca } from "@/components/escale/conversas/ConversasDaCasca";

const envolver = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  window.sessionStorage.removeItem("escale_modo_espiao");
  nav.params = new URLSearchParams();
  marcar.mockClear();
});

describe("ConversasDaCasca (c01, c23)", () => {
  it("a barra do módulo, a fila vazia, o centro vazio e o painel vazio", () => {
    envolver(<ConversasDaCasca />);
    expect(screen.getByRole("heading", { name: "Conversas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova conversa" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute(
      "href",
      "/app/inbox/configuracoes",
    );
    expect(screen.getByText("Envie e receba mensagens dos seus clientes")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Iniciar uma conversa" }).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByTestId("painel")).toHaveTextContent("Nenhuma conversa selecionada");
  });

  it("sem canal, o centro pede para conectar", () => {
    canais.data = [];
    envolver(<ConversasDaCasca />);
    expect(screen.getByText("Conecte um canal para começar a conversar")).toBeInTheDocument();
    canais.data = [{ id: "ch1" }];
  });

  it("'Nova conversa +' troca o centro pela tela de criar ou selecionar um contato", () => {
    envolver(<ConversasDaCasca />);
    fireEvent.click(screen.getByRole("button", { name: "Nova conversa" }));
    expect(screen.getByText("Crie ou selecione um contato")).toBeInTheDocument();
  });

  it("o modo espião mostra a faixa e não marca como lida", () => {
    window.sessionStorage.setItem("escale_modo_espiao", "1");
    fila.data = {
      pages: [
        {
          data: [
            {
              id: "c1",
              status: "open",
              unread_count_for_assignee: 2,
              last_message_at: null,
              last_inbound_at: null,
              last_outbound_at: null,
              snooze_until: null,
              contacts: {
                id: "ct1",
                display_name: "Neto",
                name: null,
                phone_number: null,
                tags: [],
              },
              channel_sessions: null,
            },
          ],
        },
      ],
    };
    nav.params = new URLSearchParams("id=c1");
    envolver(<ConversasDaCasca initialSelectedId="c1" />);
    expect(screen.getByText("Modo espião ativo")).toBeInTheDocument();
    expect(marcar).toHaveBeenLastCalledWith(null, 2);
    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    expect(marcar).toHaveBeenLastCalledWith("c1", 2);
    fila.data = { pages: [{ data: [] }] };
  });
});
