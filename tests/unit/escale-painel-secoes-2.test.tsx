import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({
  useTagDeIdioma: () => "pt-BR",
  useLocaleDeData: () => undefined,
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org1", role: "manager", currency: "BRL" }),
  useUser: () => ({ id: "u1" }),
  usePermission: () => true,
}));
const alternar = vi.hoisted(() => vi.fn(async () => "concluida"));
vi.mock("@/hooks/escale/useAtividadesDoNegocio", () => ({
  useAtividadesDoNegocio: () => ({
    dados: {
      atividades: [
        {
          id: "a1",
          title: "Pré-qualificação",
          due_date: "2026-10-18T19:31:00Z",
          status: "pending",
          tipo: "tarefa",
        },
        {
          id: "a2",
          title: "Ligação 1",
          due_date: "2026-10-17T19:31:00Z",
          status: "pending",
          tipo: "ligacao",
        },
      ],
      modelos: [],
    },
    carregando: false,
    falhou: false,
    alternar,
    excluir: vi.fn(),
    editar: vi.fn(),
    recarregar: vi.fn(),
  }),
}));
const gravarPref = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/escale/usePreferenciasDeConversas", async () => {
  const { PREFERENCIAS_PADRAO } = await import("@/lib/escale/conversas/preferencias");
  return {
    usePreferenciasDeConversas: () => ({ data: PREFERENCIAS_PADRAO, isLoading: false }),
    useGravarPreferencia: () => ({ mutate: gravarPref, isPending: false }),
  };
});
const editar = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useEditLead: () => ({ mutate: vi.fn(), mutateAsync: editar, isPending: false }),
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({
  useMoveCard: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/components/escale/negocio/DonoDaFicha", () => ({
  DonoDaFicha: () => <span data-testid="dono" />,
}));
vi.mock("@/hooks/escale/useArquivosDoContato", () => ({
  useArquivosDoContato: () => ({ data: [], isLoading: false, isError: false }),
  useEnviarArquivos: () => ({ mutateAsync: vi.fn(async () => ({ enviados: 1, falhas: [] })) }),
  useExcluirArquivo: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/escale/useHistoricoDoNegocio", () => ({
  useHistoricoDoNegocio: () => ({
    itens: [
      {
        id: "h1",
        type: "contact_created",
        performed_at: "2026-10-11T14:50:03Z",
        payload: {},
        source_module: "x",
        actor_kind: "user",
      },
    ],
    isLoading: false,
    isError: false,
    temMais: false,
    carregarMais: vi.fn(),
    carregandoMais: false,
  }),
}));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({ useNotasDoNegocio: () => ({ data: [] }) }));
vi.mock("@/components/escale/negocio/abas/CartaoDoHistorico", () => ({
  CartaoDoHistorico: ({ item }: { item: { id: string } }) => (
    <li data-testid={`cartao-${item.id}`} />
  ),
}));
vi.mock("@/hooks/escale/useConversasDoContato", () => ({
  useConversasDoContato: () => ({
    data: [
      {
        id: "cv1",
        status: "open",
        last_message_at: "2026-10-18T22:31:00Z",
        last_message_preview: "O atendente foi alterado",
        unread_count_for_assignee: 0,
        contacts: { id: "ct1", display_name: "Neto" },
        channel_sessions: { provider: "meta_cloud" },
      },
      {
        id: "cv0",
        status: "closed",
        last_message_at: "2026-09-01T10:00:00Z",
        last_message_preview: "Obrigado",
        unread_count_for_assignee: 0,
        contacts: { id: "ct1", display_name: "Neto" },
        channel_sessions: { provider: "waha" },
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

import { SecaoAtividades } from "@/components/escale/conversas/painel/secoes/SecaoAtividades";
import { SecaoAnexos } from "@/components/escale/conversas/painel/secoes/SecaoAnexos";
import { SecaoConversas } from "@/components/escale/conversas/painel/secoes/SecaoConversas";
import { SecaoHistorico } from "@/components/escale/conversas/painel/secoes/SecaoHistorico";
import { SecaoNegocio } from "@/components/escale/conversas/painel/secoes/SecaoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const quadro = {
  lead: {
    id: "l1",
    pipeline_id: "p1",
    stage_id: "s1",
    status: "open",
    contact_id: "ct1",
    custom_fields: { sdr: "Ana" },
    value_cents: 150000,
    currency: "BRL",
    owner_user_id: "u1",
    updated_at: "2026-10-18T10:00:00Z",
  },
  pipeline: {
    id: "p1",
    name: "Obra Futura",
    settings: { fields: [{ key: "sdr", label: "sdr", type: "text" }] },
  },
  stages: [
    {
      id: "s1",
      name: "1. Entrada Lead",
      position: 1,
      is_won: false,
      is_lost: false,
      is_archived: false,
    },
    {
      id: "s2",
      name: "2. Contato",
      position: 2,
      is_won: false,
      is_lost: false,
      is_archived: false,
    },
  ],
  leads: [],
} as unknown as QuadroDoNegocio;
const conversa = {
  id: "cv1",
  contact_id: "ct1",
  contacts: { id: "ct1", display_name: "Neto" },
} as unknown as ConversationWithContact;

describe("as seções (c16, c17, c50, c54, c20)", () => {
  it("Atividades: por dia, a caixinha conclui, o link do negócio", async () => {
    envolver(<SecaoAtividades quadro={quadro} aoVoltar={vi.fn()} />);
    expect(screen.getAllByText(/1 atividade/)).toHaveLength(2);
    expect(screen.getByText("Pré-qualificação")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    expect(alternar).toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: /Criar, editar ou reagendar no negócio/ }),
    ).toHaveAttribute("href", expect.stringContaining("/app/negocios/l1"));
  });

  it("Negócio: Origem, Etapa, Dono, Valor, Status e Ir para negócio; Personalizar campos grava a lista", () => {
    envolver(<SecaoNegocio quadro={quadro} aoVoltar={vi.fn()} />);
    for (const r of ["Origem", "Etapa", "Dono", "Valor do negócio", "Status"])
      expect(screen.getByText(r)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir para negócio/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Personalizar campos" }));
    const janela = screen.getByRole("dialog");
    expect(within(janela).getByText("Campos disponíveis")).toBeInTheDocument();
    expect(within(janela).getByText("Informações básicas")).toBeInTheDocument();
    fireEvent.click(within(janela).getByRole("checkbox", { name: "sdr" }));
    expect(within(janela).getByText("6 campos")).toBeInTheDocument();
    fireEvent.click(within(janela).getByRole("button", { name: "Salvar campos" }));
    expect(gravarPref).toHaveBeenCalledWith({
      chave: "campos_do_negocio",
      valor: ["origem", "etapa", "dono", "valor", "status", "crm:sdr"],
    });
  });

  it("Anexos vazio: a frase e Novo arquivo", () => {
    envolver(<SecaoAnexos conversa={conversa} quadro={quadro} aoVoltar={vi.fn()} />);
    expect(screen.getByText("Nenhum arquivo encontrado")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Novo arquivo/ }).length).toBeGreaterThan(0);
  });

  it("Histórico: o seletor 'Todos' e os cartões", () => {
    envolver(<SecaoHistorico quadro={quadro} aoVoltar={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Selecione um grupo" })).toBeInTheDocument();
    expect(screen.getByTestId("cartao-h1")).toBeInTheDocument();
  });

  it("Conversas: as sessões com o selo, a atual marcada, clique seleciona", () => {
    const aoAbrirConversa = vi.fn();
    envolver(
      <SecaoConversas conversa={conversa} aoAbrirConversa={aoAbrirConversa} aoVoltar={vi.fn()} />,
    );
    expect(screen.getByText("Em aberto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /O atendente foi alterado/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: /Obrigado/ }));
    expect(aoAbrirConversa).toHaveBeenCalledWith("cv0");
  });
});
