import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useUser: () => ({ id: "u-eu" }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u-outro", full_name: "Ana Atendente" }] }),
}));
const canais = vi.hoisted(() => ({ lista: [] as unknown[] }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: canais.lista }),
  channelLabel: (c: { display_name: string | null }) => c.display_name ?? "",
}));

import { RodapeDoTipo } from "@/components/escale/negocio/abas/atividades/RodapeDoTipo";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEnviarAtividade } from "@/hooks/escale/useEnviarAtividade";
import { apiClient } from "@/lib/api/client";
import type { AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import type { Lead } from "@/lib/types/leads";
import { toast } from "sonner";

/** FORK ESCALE · Fase 1I (C20, P14, P15): enviar a mensagem pronta em um clique, como a Clint. */
const LEAD = {
  id: "n1",
  contact_id: "c1",
  title: "Ana Souza",
  contact_phone: "+5543999990000",
  custom_fields: {},
  conversa: { id: "cv1", preview: null, last_message_at: null, unread: 0 },
} as unknown as Lead;
const ATV = {
  id: "w",
  status: "pending",
  tipo: "whatsapp",
  title: "Entrada de Lead",
} as AtividadeDoNegocio;
const WORKING = {
  id: "s1",
  status: "WORKING",
  created_at: "2026-01-01",
  display_name: "Comercial",
  metadata: null,
};

function respostas(atendente: string | null) {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { assigned_to_user_id: atendente } });
  vi.mocked(apiClient.post).mockImplementation(async (url: string) =>
    url.endsWith("open-with-contact") ? { data: { conversation_id: "cv2" } } : { data: {} },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  canais.lista = [WORKING];
});

describe("useEnviarAtividade", () => {
  it("conversa livre: envia o texto e conclui", async () => {
    respostas(null);
    const alternar = vi.fn(async () => "concluida");
    const { result } = renderHook(() => useEnviarAtividade(LEAD, alternar));
    let r: unknown;
    await act(async () => {
      r = await result.current.enviar(ATV, "Olá Ana");
    });
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/conversations/cv1");
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/messages", {
      conversation_id: "cv1",
      body: "Olá Ana",
      type: "text",
    });
    expect(alternar).toHaveBeenCalledWith(ATV);
    expect(r).toEqual({ tipo: "enviada", assumiu: false, concluida: true });
  });

  it("sem conversa: abre pelo contato antes de enviar", async () => {
    respostas(null);
    const { result } = renderHook(() =>
      useEnviarAtividade({ ...LEAD, conversa: null } as Lead, vi.fn()),
    );
    await act(async () => {
      await result.current.enviar(ATV, "Oi");
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/conversations/open-with-contact", {
      contact_id: "c1",
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/messages", {
      conversation_id: "cv2",
      body: "Oi",
      type: "text",
    });
  });

  it("outro atendente: não envia e devolve quem é; assumir faz o claim e envia", async () => {
    respostas("u-outro");
    const alternar = vi.fn(async () => "concluida");
    const { result } = renderHook(() => useEnviarAtividade(LEAD, alternar));
    let r: unknown;
    await act(async () => {
      r = await result.current.enviar(ATV, "Oi");
    });
    expect(r).toEqual({ tipo: "outro-atendente", atendenteId: "u-outro", conversaId: "cv1" });
    expect(apiClient.post).not.toHaveBeenCalledWith("/api/v1/messages", expect.anything());
    await act(async () => {
      r = await result.current.enviar(ATV, "Oi", { conversaId: "cv1", atendenteId: "u-outro" });
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/conversations/cv1/claim", {
      expected_assignee: "u-outro",
    });
    expect(r).toEqual({ tipo: "enviada", assumiu: true, concluida: true });
  });

  it("atividade já concluída: envia sem reabrir", async () => {
    respostas(null);
    const alternar = vi.fn();
    const { result } = renderHook(() => useEnviarAtividade(LEAD, alternar));
    await act(async () => {
      await result.current.enviar({ ...ATV, status: "done" }, "Oi");
    });
    expect(alternar).not.toHaveBeenCalled();
  });
});

describe("useEnviarAtividade: o que não pode acontecer", () => {
  it("com o canal da tela, abre a conversa por ele em vez de usar a mais recente do contato", async () => {
    respostas(null);
    const { result } = renderHook(() => useEnviarAtividade(LEAD, vi.fn(), "s1"));
    await act(async () => {
      await result.current.enviar(ATV, "Oi");
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/conversations/open-with-contact", {
      contact_id: "c1",
      channel_session_id: "s1",
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/v1/messages",
      expect.objectContaining({ conversation_id: "cv2" }),
    );
  });

  it("mensagem que o servidor marcou como 'failed' não conclui a atividade", async () => {
    respostas(null);
    vi.mocked(apiClient.post).mockImplementation(async (url: string) =>
      url === "/api/v1/messages" ? { data: { status: "failed" } } : { data: {} },
    );
    const alternar = vi.fn();
    const { result } = renderHook(() => useEnviarAtividade(LEAD, alternar));
    await act(async () => {
      await expect(result.current.enviar(ATV, "Oi")).rejects.toThrow();
    });
    expect(alternar).not.toHaveBeenCalled();
  });

  it("se só a conclusão falha, avisa que a mensagem saiu (não convida a reenviar)", async () => {
    respostas(null);
    const alternar = vi.fn(async () => Promise.reject(new Error("x")));
    const { result } = renderHook(() => useEnviarAtividade(LEAD, alternar));
    let r: unknown;
    await act(async () => {
      r = await result.current.enviar(ATV, "Oi");
    });
    expect(r).toEqual({ tipo: "enviada", assumiu: false, concluida: false });
  });

  it("atividade cancelada não é reaberta pelo envio", async () => {
    respostas(null);
    const alternar = vi.fn();
    const { result } = renderHook(() => useEnviarAtividade(LEAD, alternar));
    await act(async () => {
      await result.current.enviar({ ...ATV, status: "cancelled" }, "Oi");
    });
    expect(alternar).not.toHaveBeenCalled();
  });
});

describe("rodapé do WhatsApp", () => {
  const montar = (texto = "Olá Ana", lead: Lead = LEAD) => {
    const alternar = vi.fn(async () => "concluida");
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <TooltipProvider>
        <RodapeDoTipo lead={lead} atividade={ATV} texto={texto} alternar={alternar} />
      </TooltipProvider>,
    );
    return { user, alternar };
  };

  it("sem canal, canal parado ou sem texto: 'Enviar mensagem' desligado com o motivo da Clint", () => {
    canais.lista = [];
    const { unmount } = render(
      <TooltipProvider>
        <RodapeDoTipo lead={LEAD} atividade={ATV} texto="Oi" alternar={vi.fn()} />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: /Enviar mensagem/ })).toHaveAttribute(
      "title",
      "Você não possui um dispositivo vinculado!",
    );
    unmount();
    canais.lista = [{ ...WORKING, status: "STOPPED" }];
    montar();
    expect(screen.getByRole("button", { name: /Enviar mensagem/ })).toHaveAttribute(
      "title",
      "Seu dispositivo está desconectado!",
    );
  });

  it("Enter envia na hora: ao abrir, o foco já está em 'Enviar mensagem' (resposta de 17/10)", async () => {
    respostas(null);
    const { user } = montar();
    expect(screen.getByRole("button", { name: /Enviar mensagem/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("A atividade foi realizada com sucesso!"),
    );
  });

  it("envia, conclui e mostra o toast da Clint", async () => {
    respostas(null);
    const { user, alternar } = montar();
    await user.click(screen.getByRole("button", { name: /Enviar mensagem/ }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("A atividade foi realizada com sucesso!"),
    );
    expect(alternar).toHaveBeenCalled();
  });

  it("contato com outro atendente: a janela da Clint; confirmar assume e envia", async () => {
    respostas("u-outro");
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: /Enviar mensagem/ }));
    expect(
      await screen.findByText("Este contato está em atendimento com o usuário Ana Atendente"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Você gostaria de assumir o atendimento e enviar a mensagem mesmo assim?"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Atendimento assumido e mensagem enviada com sucesso!",
      ),
    );
  });

  it("o ▾ abre no WhatsApp Web com o texto", async () => {
    const abrir = vi.spyOn(window, "open").mockReturnValue(null);
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: "Mais opções de envio" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir no WhatsApp Web" }));
    expect(abrir).toHaveBeenCalledWith(
      "https://web.whatsapp.com/send?phone=5543999990000&text=Ol%C3%A1%20Ana",
      "_blank",
      "noopener",
    );
    expect(screen.queryByRole("menuitem", { name: "Alterar dispositivo" })).toBeNull();
  });
});

describe("rodapé de outros tipos", () => {
  it("ligação: 'Chamar Ana' fica 'Em breve' (resposta de 17/10)", () => {
    render(
      <TooltipProvider>
        <RodapeDoTipo
          lead={LEAD}
          atividade={{ ...ATV, tipo: "ligacao" }}
          texto=""
          alternar={vi.fn()}
        />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "Chamar Ana" })).toHaveAttribute("title", "Em breve");
  });
  it("instagram e email: o botão de executar fica 'Em breve'; tarefa não tem botão", () => {
    const { rerender } = render(
      <TooltipProvider>
        <RodapeDoTipo
          lead={LEAD}
          atividade={{ ...ATV, tipo: "email" }}
          texto=""
          alternar={vi.fn()}
        />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "Enviar email" })).toHaveAttribute(
      "title",
      "Em breve",
    );
    rerender(
      <TooltipProvider>
        <RodapeDoTipo
          lead={LEAD}
          atividade={{ ...ATV, tipo: "tarefa" }}
          texto=""
          alternar={vi.fn()}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
