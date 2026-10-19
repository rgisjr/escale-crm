import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Regressão da escale.14: o "?" do PRÓXIMO NEGÓCIO no painel do contato é um
 * `Tooltip` do Radix, que lança "`Tooltip` must be used within
 * `TooltipProvider`" sem um provedor acima. Os outros testes da casca já
 * embrulham tudo num `TooltipProvider` e trocam o painel por um dublê, então
 * não viam que a página real não tem provedor: o Atendimento inteiro caía em
 * "Algo deu errado". Aqui a casca monta com o painel de verdade e SEM provedor
 * por fora, como no app.
 */

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/inbox",
  useSearchParams: () => new URLSearchParams(),
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
vi.mock("@/hooks/escale/useFilaDeConversas", () => ({
  useFilaDeConversas: () => ({
    data: { pages: [{ data: [] }] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    realtimeStatus: "SUBSCRIBED",
  }),
}));
vi.mock("@/hooks/inbox/useConversation", () => ({
  useConversation: () => ({ data: undefined, isPending: false, error: null }),
  isNotFound: () => false,
}));
vi.mock("@/hooks/inbox/useMarkAsRead", () => ({ useMarkAsRead: vi.fn() }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [{ id: "ch1" }], isLoading: false }),
}));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({
  useConversationCounts: () => ({ data: { all: 0, fila: 0, unassigned: 0, mine: 0 } }),
}));
vi.mock("@/hooks/escale/usePreferenciasDeConversas", async () => {
  const { PREFERENCIAS_PADRAO } = await import("@/lib/escale/conversas/preferencias");
  return {
    usePreferenciasDeConversas: () => ({ data: PREFERENCIAS_PADRAO, isLoading: false }),
    useGravarPreferencia: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

import { ConversasDaCasca } from "@/components/escale/conversas/ConversasDaCasca";

describe("ConversasDaCasca sem TooltipProvider por fora (hotfix escale.15)", () => {
  it("abre com o painel do contato real e o '?' do Próximo negócio", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConversasDaCasca />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { name: "Conversas" })).toBeInTheDocument();
    expect(screen.getByText("Próximo negócio")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma conversa selecionada")).toBeInTheDocument();
  });
});
