import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FaixaEmTransferencia } from "@/components/escale/conversas/centro/FaixaEmTransferencia";
import { SeletorDeAtendente } from "@/components/escale/conversas/centro/SeletorDeAtendente";
import { SeletorDeSetor } from "@/components/escale/conversas/centro/SeletorDeSetor";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const alterar = vi.fn();
const cancelar = vi.fn();
const liberarOutro = vi.fn();
const release = vi.fn();
let setorDaConversa: Record<string, unknown> = {};
let permissoes: Record<string, boolean> = {};
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({
    data: [
      {
        id: "s1",
        nome: "Atendimento",
        cor: "#0EA5C6",
        membros: [],
        dispositivos: 1,
        ids_dos_dispositivos: [],
      },
      {
        id: "s2",
        nome: "Suporte SAO",
        cor: "#F7DB5A",
        membros: [],
        dispositivos: 0,
        ids_dos_dispositivos: [],
      },
    ],
  }),
  useSetoresDasConversas: () => setorDaConversa,
  useAlterarSetor: () => ({
    alterar: { mutate: alterar, isPending: false },
    cancelar: { mutate: cancelar, isPending: false },
  }),
  useLiberarDeOutro: () => ({ mutate: liberarOutro, isPending: false }),
}));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({
  useMinhasPermissoes: () => permissoes,
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "agent" } }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u2", role: "agent", full_name: "Bia Lima" }] }),
}));
vi.mock("@/hooks/inbox/useTransferConversation", () => ({
  useTransferConversation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/inbox/useClaimConversation", () => ({
  useClaimConversation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/inbox/useReleaseConversation", () => ({
  useReleaseConversation: () => ({ mutate: release, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CV = "c0000000-0000-4000-8000-000000000001";
const conversa = (extra: Partial<ConversationWithContact> = {}) =>
  ({
    id: CV,
    assigned_to_user_id: "u2",
    assigned_to_user_name: "Bia Lima",
    ...extra,
  }) as ConversationWithContact;
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  for (const f of [alterar, cancelar, liberarOutro, release]) f.mockClear();
  setorDaConversa = {
    [CV]: {
      setor: { id: "s1", nome: "Atendimento", cor: "#0EA5C6" },
      em_transferencia: false,
      setor_anterior: null,
    },
  };
  permissoes = {};
});

describe("SeletorDeSetor (c02)", () => {
  it("mostra o selo do setor atual; escolher outro chama alterar; a busca filtra", () => {
    wrap(<SeletorDeSetor conversa={conversa()} />);
    const gatilho = screen.getByRole("button", { name: "Alterar setor: Atendimento" });
    expect(gatilho).toHaveTextContent("AT");
    fireEvent.click(gatilho);
    fireEvent.change(screen.getByPlaceholderText("Buscar por setor..."), {
      target: { value: "sup" },
    });
    expect(screen.queryByRole("option", { name: /Atendimento/ })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: /Suporte SAO/ }));
    expect(alterar).toHaveBeenCalledWith("s2");
  });
  it("sem setor mostra 'Sem setor'", () => {
    setorDaConversa = { [CV]: { setor: null, em_transferencia: false, setor_anterior: null } };
    wrap(<SeletorDeSetor conversa={conversa()} />);
    expect(screen.getByRole("button", { name: "Alterar setor: Sem setor" })).toBeInTheDocument();
  });
});

describe("FaixaEmTransferencia", () => {
  it("aparece só em transferência e cancela", () => {
    const { rerender, container } = wrap(<FaixaEmTransferencia conversa={conversa()} />);
    expect(container).toBeEmptyDOMElement();
    setorDaConversa = {
      [CV]: {
        setor: { id: "s2", nome: "Suporte SAO", cor: "#F7DB5A" },
        em_transferencia: true,
        setor_anterior: { id: "s1", nome: "Atendimento", cor: "#0EA5C6" },
      },
    };
    rerender(
      <QueryClientProvider client={qc}>
        <FaixaEmTransferencia conversa={conversa()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Em transferência para Suporte SAO")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar transferência" }));
    expect(cancelar).toHaveBeenCalled();
  });
});

describe("SeletorDeAtendente: liberar de outra pessoa (N8)", () => {
  it("sem permissão fica desligado com o texto novo; com 'Alterar atendentes' libera pela rota do fork", () => {
    const { unmount } = wrap(<SeletorDeAtendente conversa={conversa()} />);
    fireEvent.click(screen.getByRole("button", { name: /Bia Lima/ }));
    expect(screen.getByRole("option", { name: /Sem atendente/ })).toHaveAttribute(
      "title",
      "Só o atendente atual ou quem pode alterar atendentes libera a conversa.",
    );
    unmount();
    permissoes = { CHAT_CHANGE_ATTENDANT_ALL: true };
    wrap(<SeletorDeAtendente conversa={conversa()} />);
    fireEvent.click(screen.getByRole("button", { name: /Bia Lima/ }));
    fireEvent.click(screen.getByRole("option", { name: /Sem atendente/ }));
    expect(liberarOutro).toHaveBeenCalledWith(CV, expect.anything());
    expect(release).not.toHaveBeenCalled();
  });
});
