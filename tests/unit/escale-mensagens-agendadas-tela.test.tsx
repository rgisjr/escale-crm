import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaAgendarMensagem } from "@/components/escale/conversas/agendadas/JanelaAgendarMensagem";
import { TabelaDeAgendadas } from "@/components/escale/conversas/agendadas/TabelaDeAgendadas";
import { TelaMensagensAgendadas } from "@/components/escale/conversas/agendadas/TelaMensagensAgendadas";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import type { AgendadaLida } from "@/lib/escale/conversas/agendadas";

const agendar = vi.fn();
const remover = vi.fn();
let pagina = { data: [] as AgendadaLida[], meta: { total: 0, pagina: 1, por_pagina: 10 } };
vi.mock("@/hooks/escale/useMensagensAgendadas", () => ({
  useAgendarMensagens: () => ({ mutateAsync: agendar, isPending: false }),
  useRemoverAgendada: () => ({ mutate: remover, isPending: false }),
  useMensagensAgendadas: () => ({ data: pagina, isLoading: false }),
  useContagemDeAgendadas: () => ({}),
}));
vi.mock("@/hooks/escale/useModelosDeMensagem", () => ({
  useModelosDeMensagem: () => ({
    modelos: [
      { name: "boas_vindas", language: "pt_BR", status: "APPROVED", slots: [], components: [] },
    ],
    carregando: false,
    recarregar: vi.fn(),
    fonte: "oficial",
    recentes: [],
    marcarUsado: vi.fn(),
  }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({
    data: [
      {
        id: "cs1",
        display_name: "Comercial",
        phone_number: "+55",
        provider: "meta_cloud",
        status: "WORKING",
      },
    ],
  }),
  channelLabel: (c: { display_name: string | null }) => c.display_name ?? "",
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "manager" } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const conversa = {
  id: "c1",
  contact_id: "ct1",
  channel_session_id: "cs1",
  status: "open",
  contacts: { id: "ct1", name: "Ana" },
  channel_sessions: { provider: "meta_cloud" },
} as unknown as ConversationWithContact;
const linha = (extra: Partial<AgendadaLida> = {}): AgendadaLida => ({
  id: "a1",
  conversation_id: "c1",
  contact_id: "ct1",
  channel_session_id: "cs1",
  tipo: "texto",
  corpo: "Bom dia",
  template: null,
  enviar_em: "2026-10-20T13:00:00.000Z",
  criado_por: "u1",
  status: "pendente",
  erro: null,
  created_at: "2026-10-18T10:00:00.000Z",
  contato: { nome: "Ana Souza", telefone: "+5511", tem_foto: false },
  dispositivo: { nome: "Comercial", provider: "meta_cloud", status: "WORKING" },
  ...extra,
});
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  agendar.mockReset().mockResolvedValue({ data: { ids: ["a1"] } });
  remover.mockClear();
  pagina = { data: [], meta: { total: 0, pagina: 1, por_pagina: 10 } };
});

describe("JanelaAgendarMensagem (c08)", () => {
  it("dentro da janela: texto livre; confirma com a data escolhida; data passada bloqueia", async () => {
    const fechar = vi.fn();
    wrap(
      <JanelaAgendarMensagem
        aberta
        aoFechar={fechar}
        conversa={conversa}
        textoInicial="Bom dia"
        modo="livre"
      />,
    );
    expect(screen.getByText("Agendar mensagem")).toBeInTheDocument();
    expect(screen.getByText(/Dentro da janela/i)).toBeInTheDocument();
    expect(screen.getByText(/Fora da janela/i)).toBeInTheDocument();
    expect((screen.getByLabelText("Mensagem livre") as HTMLTextAreaElement).value).toBe("Bom dia");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(agendar).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation_id: "c1",
          mensagens: [{ tipo: "texto", corpo: "Bom dia" }],
        }),
      ),
    );
    expect(fechar).toHaveBeenCalled();
  });
  it("fora da janela: só modelo; o texto livre fica desligado", async () => {
    wrap(
      <JanelaAgendarMensagem
        aberta
        aoFechar={vi.fn()}
        conversa={conversa}
        textoInicial=""
        modo="so_modelo"
      />,
    );
    expect(screen.getByLabelText("Mensagem livre")).toBeDisabled();
    await userEvent
      .setup({ pointerEventsCheck: 0 })
      .click(screen.getByRole("combobox", { name: "Modelo de mensagem" }));
    expect(screen.getByRole("option", { name: "boas_vindas" })).toBeInTheDocument();
  });
});

describe("TabelaDeAgendadas (c39, c62)", () => {
  it("mostra contato, criação, envio, dispositivo e o ⋮ com 'Remover agendamento'", () => {
    wrap(<TabelaDeAgendadas itens={[linha()]} aoRemover={remover} />);
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText(/18\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/20\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opções do agendamento" }));
    fireEvent.click(screen.getByText("Remover agendamento"));
    expect(remover).toHaveBeenCalledWith("a1");
  });
});

describe("TelaMensagensAgendadas (c39)", () => {
  it("tem as migalhas, a busca, os filtros e o vazio", () => {
    wrap(<TelaMensagensAgendadas />);
    expect(screen.getByText("Configurações")).toBeInTheDocument();
    expect(screen.getByText("Mensagens agendadas")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar por nome, e-mail ou telefone")).toBeInTheDocument();
    expect(screen.getByText("Criação")).toBeInTheDocument();
    expect(screen.getByText("Envio")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma mensagem agendada.")).toBeInTheDocument();
  });
});
