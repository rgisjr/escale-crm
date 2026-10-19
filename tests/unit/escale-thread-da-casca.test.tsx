import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BalaoDaCasca } from "@/components/escale/conversas/centro/thread/BalaoDaCasca";
import { EventoDaThread } from "@/components/escale/conversas/centro/thread/EventoDaThread";
import {
  ThreadDaCasca,
  ultimaMensagem,
} from "@/components/escale/conversas/centro/thread/ThreadDaCasca";
import type { Message } from "@/lib/types/messaging";

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "agent" } }),
  usePermission: () => true,
}));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useLocaleDeData: () => "pt-BR" }));
vi.mock("@/components/inbox/media/MediaRenderer", () => ({
  MediaRenderer: ({ message }: { message: Message }) => <div data-testid={`midia-${message.id}`} />,
}));
vi.mock("@/components/inbox/PassagemCard", () => ({
  PassagemCard: () => <div data-testid="passagem" />,
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({
    data: [
      { user_id: "u1", role: "agent", full_name: "Eu" },
      { user_id: "u2", role: "agent", full_name: "Bia" },
    ],
  }),
}));
const mensagens: Message[] = [];
vi.mock("@/hooks/inbox/useMessagesRealtime", () => ({
  useMessagesRealtime: () => ({
    data: { pages: [{ data: mensagens, meta: { has_more: false, cursor: null } }] },
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    isLoading: false,
  }),
}));
vi.mock("@/hooks/inbox/useConversationNotes", () => ({
  useConversationNotes: () => [
    {
      id: "n1",
      conversation_id: "c1",
      body: "Cliente pediu desconto",
      created_by_user_id: "u1",
      created_by_name: "Eu",
      created_at: "2026-10-18T12:30:00Z",
    },
  ],
}));
vi.mock("@/hooks/inbox/usePassagensDaConversa", () => ({ usePassagensDaConversa: () => [] }));
vi.mock("@/hooks/escale/useConversaDaCasca", () => ({
  useConversaDaCasca: () => ({
    eventos: [{ id: "e1", tipo: "espera", em: "2026-10-18T13:00:00Z", user_id: "u2" }],
    carregandoEventos: false,
  }),
}));
vi.mock("@/hooks/inbox/useAlterarMensagem", () => ({
  useAlterarMensagem: () => ({
    editar: { mutateAsync: vi.fn() },
    apagar: { mutateAsync: vi.fn() },
    ocultar: { mutateAsync: vi.fn() },
    restaurar: { mutateAsync: vi.fn() },
  }),
}));
const reenviar = vi.fn();
vi.mock("@/hooks/inbox/useSendMessage", () => ({
  useSendMessage: () => ({ mutate: reenviar, isPending: false }),
}));

const msg = (extra: Partial<Message>): Message =>
  ({
    id: "m1",
    organization_id: "o1",
    conversation_id: "c1",
    channel_session_id: "cs",
    contact_id: "ct",
    external_id: null,
    type: "text",
    direction: "inbound",
    status: "delivered",
    ack: null,
    error_code: null,
    error_message: null,
    body: "Olá",
    media_url: null,
    media_mime: null,
    media_size_bytes: null,
    media_storage_path: null,
    sent_via: "external_device",
    sent_by_user_id: null,
    sent_at: "2026-10-18T12:00:00Z",
    delivered_at: null,
    read_at: null,
    metadata: {},
    edited_at: null,
    revoked_at: null,
    reply_to_message_id: null,
    created_at: "2026-10-18T12:00:00Z",
    ...extra,
  }) as Message;
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
const nomes = new Map([
  ["u1", "Eu"],
  ["u2", "Bia"],
]);
const semAcao = {
  aoResponder: vi.fn(),
  aoEditar: vi.fn(),
  aoApagarParaTodos: vi.fn(),
  aoApagarParaMim: vi.fn(),
  aoRestaurar: vi.fn(),
  aoReenviar: vi.fn(),
};

beforeEach(() => {
  qc = new QueryClient();
  mensagens.length = 0;
  reenviar.mockClear();
});

describe("ThreadDaCasca", () => {
  it("intercala mensagens, notas e eventos por hora, com o separador do dia e 'Ler mais' no anúncio", () => {
    mensagens.push(
      msg({
        id: "m1",
        metadata: {
          referral: {
            headline: "Promoção de outubro",
            body: "Compre agora",
            source_url: "https://fb.com/ad/1",
            image_url: "https://img/1.jpg",
          },
        },
      }),
      msg({
        id: "m2",
        direction: "outbound",
        sent_via: "user",
        sent_by_user_id: "u1",
        body: "Oi, Ana",
        sent_at: "2026-10-18T12:10:00Z",
        status: "read",
      }),
    );
    wrap(
      <ThreadDaCasca
        conversationId="c1"
        conversa={{ status: "open", contacts: { name: "Ana" } } as never}
      />,
    );
    const textos = screen.getAllByTestId(/^item-/).map((el) => el.getAttribute("data-testid"));
    expect(textos).toEqual([
      "item-message-m1",
      "item-message-m2",
      "item-note-n1",
      "item-evento-e1",
    ]);
    expect(screen.getByText("Anúncio")).toBeInTheDocument();
    expect(screen.getByText("Promoção de outubro")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver anúncio" })).toHaveAttribute(
      "href",
      "https://fb.com/ad/1",
    );
    expect(screen.getByText("Cliente pediu desconto")).toBeInTheDocument();
    expect(screen.getByText(/Bia/)).toBeInTheDocument();
    expect(screen.getByText(/colocou o atendimento em espera/)).toBeInTheDocument();
    expect(screen.getByText(/18\/10\/2026|Hoje|Ontem/)).toBeInTheDocument();
    expect(ultimaMensagem([{ data: mensagens, meta: { has_more: false, cursor: null } }])?.id).toBe(
      "m2",
    );
  });
});

describe("BalaoDaCasca", () => {
  it("saída com 'Editada', ✓✓ e o menu com Editar/Apagar; entrada com Responder e Apagar para mim; falha com Reenviar", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    const { rerender } = wrap(
      <BalaoDaCasca
        message={msg({
          direction: "outbound",
          sent_via: "user",
          sent_by_user_id: "u1",
          edited_at: "2026-10-18T12:05:00Z",
          status: "read",
        })}
        viewerUserId="u1"
        nomes={nomes}
        searchTerm=""
        agora={Date.parse("2026-10-18T12:10:00Z")}
        {...semAcao}
      />,
    );
    expect(screen.getByText("Editada")).toBeInTheDocument();
    expect(screen.getByLabelText("Lida")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Opções da mensagem" }));
    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Apagar para todos")).toBeInTheDocument();
    await u.keyboard("{Escape}");
    rerender(
      <QueryClientProvider client={qc}>
        <BalaoDaCasca
          message={msg({ metadata: { forwarded: true } })}
          viewerUserId="u1"
          nomes={nomes}
          searchTerm=""
          agora={Date.now()}
          {...semAcao}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Encaminhada")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Opções da mensagem" }));
    expect(screen.getByText("Responder")).toBeInTheDocument();
    expect(screen.getByText("Apagar para mim")).toBeInTheDocument();
    expect(screen.queryByText("Editar")).toBeNull();
    await u.keyboard("{Escape}");
    rerender(
      <QueryClientProvider client={qc}>
        <BalaoDaCasca
          message={msg({
            direction: "outbound",
            status: "failed",
            error_message: "Número inválido",
          })}
          viewerUserId="u1"
          nomes={nomes}
          searchTerm=""
          agora={Date.now()}
          {...semAcao}
        />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reenviar" }));
    expect(semAcao.aoReenviar).toHaveBeenCalled();
    rerender(
      <QueryClientProvider client={qc}>
        <BalaoDaCasca
          message={msg({ revoked_at: "2026-10-18T12:07:00Z" })}
          viewerUserId="u1"
          nomes={nomes}
          searchTerm=""
          agora={Date.now()}
          {...semAcao}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Esta mensagem foi apagada")).toBeInTheDocument();
  });
});

describe("EventoDaThread", () => {
  it("'iniciou o atendimento' quando o claim veio do vazio; 'alterado de X para Y' nas transferências", () => {
    const { rerender } = wrap(
      <EventoDaThread
        evento={{
          id: "a",
          tipo: "atendente",
          em: "2026-10-18T10:00:00Z",
          user_id: "u1",
          de_user_id: null,
          para_user_id: "u1",
          reason: "claim",
        }}
        nomes={nomes}
      />,
    );
    expect(screen.getByText(/iniciou o atendimento/)).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={qc}>
        <EventoDaThread
          evento={{
            id: "b",
            tipo: "atendente",
            em: "2026-10-18T10:00:00Z",
            user_id: "u1",
            de_user_id: "u1",
            para_user_id: "u2",
            reason: "transfer",
          }}
          nomes={nomes}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/O atendimento foi alterado de/)).toBeInTheDocument();
    expect(screen.getByText("Bia")).toBeInTheDocument();
  });
});
