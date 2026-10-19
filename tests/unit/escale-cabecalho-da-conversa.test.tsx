import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BarraDeStatus } from "@/components/escale/conversas/centro/BarraDeStatus";
import { CabecalhoDaConversa } from "@/components/escale/conversas/centro/CabecalhoDaConversa";
import { SeletorDeAtendente } from "@/components/escale/conversas/centro/SeletorDeAtendente";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { apiClient } from "@/lib/api/client";
import { ESPERA_SEM_FIM } from "@/lib/escale/conversas/espera";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
  showApiError: vi.fn(),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "u1", full_name: "Eu Mesmo", idioma: "pt-BR" },
    activeOrg: { orgId: "o1", role: "agent" },
  }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({
    data: [
      { user_id: "u1", role: "agent", full_name: "Eu Mesmo" },
      { user_id: "u2", role: "agent", full_name: "Bia Lima" },
    ],
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const transfer = vi.fn();
const claim = vi.fn();
const release = vi.fn();
vi.mock("@/hooks/inbox/useTransferConversation", () => ({
  useTransferConversation: () => ({ mutate: transfer, isPending: false }),
}));
vi.mock("@/hooks/inbox/useClaimConversation", () => ({
  useClaimConversation: () => ({ mutate: claim, isPending: false }),
}));
vi.mock("@/hooks/inbox/useReleaseConversation", () => ({
  useReleaseConversation: () => ({ mutate: release, isPending: false }),
}));
vi.mock("@/components/escale/conversas/fila/FotoDaConversa", () => ({
  FotoDaConversa: () => <div data-testid="foto" />,
}));

const CV = "c0000000-0000-4000-8000-000000000001";
const conversa = (extra: Partial<ConversationWithContact> = {}): ConversationWithContact =>
  ({
    id: CV,
    organization_id: "o1",
    contact_id: "ct1",
    channel_session_id: "cs1",
    status: "open",
    service_revision: 3,
    assigned_to_user_id: "u2",
    assigned_to_user_name: "Bia Lima",
    last_inbound_at: new Date(Date.now() - 3_600_000).toISOString(),
    last_outbound_at: null,
    unread_count_for_assignee: 0,
    metadata: {},
    snooze_until: null,
    bot_silenced_until: null,
    contacts: {
      id: "ct1",
      display_name: "Ana",
      name: "Ana Souza",
      phone_number: "+5511999990000",
      tags: [],
      is_blocked: false,
      is_anonymized: false,
      is_personal: false,
    },
    channel_sessions: {
      phone_number: "+5511888880000",
      display_name: "Comercial",
      provider: "meta_cloud",
    },
    ...extra,
  }) as ConversationWithContact;
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  transfer.mockClear();
  claim.mockClear();
  release.mockClear();
});

describe("CabecalhoDaConversa (c02, c03)", () => {
  it("mostra nome, canal e dispositivo; o ⋮ tem Iniciar, Copiar link e Marcar como não lida", async () => {
    const marcar = vi.fn();
    wrap(
      <CabecalhoDaConversa
        conversa={conversa()}
        aoAbrirConversa={vi.fn()}
        aoBuscar={vi.fn()}
        buscaAberta={false}
        naoLidaManual={false}
        aoMarcarNaoLida={marcar}
      />,
    );
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp - Comercial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mais" }));
    expect(await screen.findByText("Iniciar uma conversa")).toBeInTheDocument();
    expect(screen.getByText("Copiar link da conversa")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Marcar como não lida"));
    expect(marcar).toHaveBeenCalled();
  });
});

describe("SeletorDeAtendente (c04)", () => {
  it("lista os membros com busca; escolher outro transfere; escolher a mim reivindica; 'Sem atendente' só para o próprio", async () => {
    wrap(<SeletorDeAtendente conversa={conversa()} />);
    fireEvent.click(screen.getByRole("button", { name: /Bia Lima/ }));
    const busca = await screen.findByPlaceholderText("Buscar por…");
    fireEvent.change(busca, { target: { value: "eu" } });
    expect(screen.queryByText("Bia Lima", { selector: "li *" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: /Eu Mesmo/ }));
    expect(claim).toHaveBeenCalledWith(
      { conversation_id: CV, expected_assignee: "u2" },
      expect.anything(),
    );
    // escolher fecha a lista: reabre e limpa a busca para ver a linha "Sem atendente"
    fireEvent.click(screen.getByRole("button", { name: /Bia Lima/ }));
    fireEvent.change(await screen.findByPlaceholderText("Buscar por…"), { target: { value: "" } });
    const semAtendente = screen.getByRole("option", { name: /Sem atendente/ });
    expect(semAtendente).toHaveAttribute("aria-disabled", "true");
    expect(semAtendente).toHaveAttribute("title", "Só o atendente atual pode liberar a conversa.");
  });
  it("quando sou o atendente, 'Sem atendente' libera; escolher outro transfere", async () => {
    wrap(
      <SeletorDeAtendente
        conversa={conversa({ assigned_to_user_id: "u1", assigned_to_user_name: "Eu Mesmo" })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Eu Mesmo/ }));
    fireEvent.click(await screen.findByRole("option", { name: /Sem atendente/ }));
    expect(release).toHaveBeenCalledWith({ conversation_id: CV }, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: /Eu Mesmo/ }));
    fireEvent.click(await screen.findByRole("option", { name: /Bia Lima/ }));
    expect(transfer).toHaveBeenCalledWith(
      { conversation_id: CV, to_user_id: "u2" },
      expect.anything(),
    );
  });
});

describe("BarraDeStatus (c05, c58, c60)", () => {
  it("janela aberta mostra hh:mm; 'Colocar em espera' chama a rota; em espera vira 'Remover espera'; fechada vira 'Reabrir atendimento'", async () => {
    const agora = new Date();
    const { rerender } = wrap(
      <BarraDeStatus conversa={conversa()} ultimaFoiTemplate={false} agora={agora} />,
    );
    expect(screen.getByText(/^2[23]:[0-5]\d$/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Colocar em espera" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/conversas-da-casca/${CV}/espera`, {}),
    );
    rerender(
      <QueryClientProvider client={qc}>
        <BarraDeStatus
          conversa={conversa({
            snooze_until: ESPERA_SEM_FIM,
            metadata: { escale_em_espera: true },
          })}
          ultimaFoiTemplate={false}
          agora={agora}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: "Remover espera" })).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={qc}>
        <BarraDeStatus
          conversa={conversa({ status: "closed", last_inbound_at: "2020-01-01T00:00:00Z" })}
          ultimaFoiTemplate={true}
          agora={agora}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: "Reabrir atendimento" })).toBeInTheDocument();
    expect(screen.getByText("Aguardando abrir janela")).toBeInTheDocument();
  });
});
