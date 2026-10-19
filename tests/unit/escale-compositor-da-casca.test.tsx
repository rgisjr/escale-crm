import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AvisoForaDaJanela } from "@/components/escale/conversas/centro/compositor/AvisoForaDaJanela";
import { CompositorDaCasca } from "@/components/escale/conversas/centro/compositor/CompositorDaCasca";
import { FaixaAtribuirAMim } from "@/components/escale/conversas/centro/compositor/FaixaAtribuirAMim";
import { JanelaNotaInterna } from "@/components/escale/conversas/centro/compositor/JanelaNotaInterna";
import { PainelRespostasRapidas } from "@/components/escale/conversas/centro/compositor/PainelRespostasRapidas";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const enviar = vi.fn();
const criarNota = vi.fn();
const rascunho = vi.fn();
const claim = vi.fn();
let visibilidade = "all";
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "u1", support: null },
    activeOrg: { orgId: "o1", role: "agent", visibility_mode: visibilidade },
  }),
  usePermission: () => true,
}));
vi.mock("@/hooks/inbox/useSendMessage", () => ({
  useSendMessage: () => ({ mutate: enviar, mutateAsync: enviar, isPending: false }),
}));
vi.mock("@/hooks/inbox/useCreateNote", () => ({
  useCreateNote: () => ({ mutateAsync: criarNota, isPending: false }),
}));
vi.mock("@/hooks/inbox/useDraftReply", () => ({
  useDraftReply: () => ({ mutateAsync: rascunho, isPending: false }),
}));
vi.mock("@/hooks/inbox/useClaimConversation", () => ({
  useClaimConversation: () => ({ mutate: claim, isPending: false }),
}));
vi.mock("@/hooks/inbox/useUploadMedia", () => ({
  useUploadMedia: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u2", role: "agent", full_name: "Bia" }] }),
}));
vi.mock("@/hooks/escale/useRespostasRapidas", () => ({
  useRespostasDaConversa: () => ({
    data: {
      respostas: [
        {
          id: "t1",
          atalho: "oi",
          corpo: "Olá {{nome}}, tudo bem?",
          canais: ["whatsapp"],
          compartilhada: true,
          todos_os_setores: true,
          setores: [],
          dono: null,
          criada_por: null,
          atualizada_em: "",
        },
        {
          id: "t2",
          atalho: "mi",
          corpo: "Só minha",
          canais: ["whatsapp"],
          compartilhada: false,
          todos_os_setores: true,
          setores: [],
          dono: "u1",
          criada_por: "u1",
          atualizada_em: "",
        },
      ],
      setorDaConversa: null,
      podeOutrosSetores: false,
    },
  }),
  useSalvarResposta: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({ useSetores: () => ({ data: [] }) }));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({ useMinhasPermissoes: () => ({}) }));
vi.mock("@/hooks/escale/useModelosDeMensagem", () => ({
  useModelosDeMensagem: () => ({
    modelos: [],
    carregando: false,
    recarregar: vi.fn(),
    fonte: "oficial",
    recentes: [],
    marcarUsado: vi.fn(),
  }),
}));
vi.mock("@/components/inbox/composer/AudioRecorder", () => ({
  AudioRecorder: () => <button type="button">Gravar áudio</button>,
}));
vi.mock("@/components/inbox/composer/EmojiButton", () => ({
  EmojiButton: ({ onPick }: { onPick: (e: string) => void }) => (
    <button type="button" aria-label="Emoji" onClick={() => onPick("😀")} />
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const conversa = (extra: Partial<ConversationWithContact> = {}): ConversationWithContact =>
  ({
    id: "c1",
    organization_id: "o1",
    contact_id: "ct1",
    channel_session_id: "cs1",
    status: "open",
    assigned_to_user_id: "u1",
    assigned_to_user_name: "Eu",
    last_inbound_at: new Date().toISOString(),
    last_outbound_at: null,
    unread_count_for_assignee: 0,
    metadata: {},
    snooze_until: null,
    contacts: {
      id: "ct1",
      display_name: "Ana",
      name: "Ana Souza",
      phone_number: "+55",
      tags: [],
      is_blocked: false,
      is_anonymized: false,
      is_personal: false,
    },
    channel_sessions: { phone_number: "+55", display_name: "Comercial", provider: "meta_cloud" },
    ...extra,
  }) as ConversationWithContact;
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  enviar.mockClear();
  criarNota.mockClear();
  rascunho.mockClear();
  claim.mockClear();
  visibilidade = "all";
});

describe("CompositorDaCasca (c02)", () => {
  it("tem os 11 ícones, envia com Enter, insere emoji, abre as respostas com '/', 'Agendar' leva o texto", async () => {
    const aoAgendar = vi.fn();
    wrap(
      <CompositorDaCasca
        conversationId="c1"
        conversa={conversa()}
        modo="livre"
        bloqueio={null}
        respondendo={null}
        aoCancelarResposta={vi.fn()}
        aoAgendar={aoAgendar}
      />,
    );
    for (const nome of [
      "Assistente IA",
      "Emoji",
      "Anexar",
      "Câmera",
      "Gravar áudio",
      "Respostas rápidas",
      "Modelos de mensagem",
      "Nota interna",
      "Agendar mensagem",
      "Enviar Flow",
      "Assinatura",
    ]) {
      expect(screen.getByRole("button", { name: nome })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Enviar Flow" })).toHaveAttribute(
      "title",
      "Em breve",
    );
    const campo = screen.getByPlaceholderText("Mensagem");
    fireEvent.change(campo, { target: { value: "Bom dia" } });
    fireEvent.click(screen.getByRole("button", { name: "Agendar mensagem" }));
    expect(aoAgendar).toHaveBeenCalledWith("Bom dia");
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_id: "c1", body: "Bom dia", type: "text" }),
      expect.anything(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Emoji" }));
    expect((campo as HTMLTextAreaElement).value).toContain("😀");
    fireEvent.change(campo, { target: { value: "/oi" } });
    expect(await screen.findByText("/oi", { selector: "span" })).toBeInTheDocument();
  });
  it("com bloqueio mostra o motivo no lugar do campo; fechada mostra 'Reabra o atendimento…'", () => {
    const { rerender } = wrap(
      <CompositorDaCasca
        conversationId="c1"
        conversa={conversa()}
        modo="livre"
        bloqueio="Contato bloqueado"
        respondendo={null}
        aoCancelarResposta={vi.fn()}
        aoAgendar={vi.fn()}
      />,
    );
    expect(screen.getByText("Contato bloqueado")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Mensagem")).toBeNull();
    rerender(
      <QueryClientProvider client={qc}>
        <CompositorDaCasca
          conversationId="c1"
          conversa={conversa({ status: "closed" })}
          modo="livre"
          bloqueio={null}
          respondendo={null}
          aoCancelarResposta={vi.fn()}
          aoAgendar={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Reabra o atendimento para responder.")).toBeInTheDocument();
  });
});

describe("AvisoForaDaJanela (c56, c73)", () => {
  it("só modelo, outro modelo e aguardando contato", () => {
    const abrir = vi.fn();
    const { rerender } = wrap(
      <AvisoForaDaJanela
        modo="so_modelo"
        aoAbrirModelos={abrir}
        aoAbrirAssistente={vi.fn()}
        aoAgendar={vi.fn()}
      />,
    );
    expect(screen.getByText("Fora da janela de 24h da Meta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar modelo de mensagem" }));
    expect(abrir).toHaveBeenCalled();
    rerender(
      <QueryClientProvider client={qc}>
        <AvisoForaDaJanela
          modo="outro_modelo"
          aoAbrirModelos={abrir}
          aoAbrirAssistente={vi.fn()}
          aoAgendar={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Enviar outro modelo de mensagem")).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={qc}>
        <AvisoForaDaJanela
          modo="aguardando_contato"
          aoAbrirModelos={abrir}
          aoAbrirAssistente={vi.fn()}
          aoAgendar={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText("Aguarde a resposta do contato para enviar novas mensagens."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /modelo/ })).toBeNull();
  });
});

describe("FaixaAtribuirAMim (C11)", () => {
  it("não aparece com visibilidade total; aparece com 'own' quando a conversa é de outro; oferece 'Atribuir a mim' quando não tem dono", () => {
    const { rerender, container } = wrap(
      <FaixaAtribuirAMim conversa={conversa({ assigned_to_user_id: "u2" })} />,
    );
    expect(container).toBeEmptyDOMElement();
    visibilidade = "own";
    rerender(
      <QueryClientProvider client={qc}>
        <FaixaAtribuirAMim conversa={conversa({ assigned_to_user_id: "u2" })} />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText("Você só pode responder em conversas atribuídas a você."),
    ).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={qc}>
        <FaixaAtribuirAMim conversa={conversa({ assigned_to_user_id: null })} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Atribuir a mim" }));
    expect(claim).toHaveBeenCalledWith(
      { conversation_id: "c1", expected_assignee: null },
      expect.anything(),
    );
  });
});

describe("PainelRespostasRapidas (c09) e JanelaNotaInterna (c12)", () => {
  it("agrupa Gerais e Minhas, filtra pela busca, interpola {{nome}} ao escolher; a nota salva pelo hook", async () => {
    const escolher = vi.fn();
    wrap(
      <PainelRespostasRapidas
        conversationId="c1"
        aberto
        aoFechar={vi.fn()}
        termoInicial=""
        contato={{ name: "Ana Souza", displayName: "Ana" }}
        aoEscolher={escolher}
      />,
    );
    expect(screen.getByText("Gerais")).toBeInTheDocument();
    expect(screen.getByText("Minhas")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar"), { target: { value: "oi" } });
    expect(screen.queryByText("/mi")).toBeNull();
    fireEvent.click(screen.getByText("/oi"));
    expect(escolher).toHaveBeenCalledWith("Olá Ana Souza, tudo bem?");
    fireEvent.click(screen.getByRole("button", { name: /Nova resposta/ }));
    expect(screen.getByText("Criar Resposta rápida")).toBeInTheDocument();

    const fechar = vi.fn();
    criarNota.mockResolvedValue({ data: {} });
    wrap(<JanelaNotaInterna aberta aoFechar={fechar} conversationId="c1" />);
    expect(
      screen.getByText("O contato não vê esta nota, somente você e sua equipe"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Adicione aqui uma anotação do seu atendimento"), {
      target: { value: "Pediu desconto" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nota" }));
    await waitFor(() =>
      expect(criarNota).toHaveBeenCalledWith({ conversation_id: "c1", body: "Pediu desconto" }),
    );
    expect(fechar).toHaveBeenCalled();
  });
});
