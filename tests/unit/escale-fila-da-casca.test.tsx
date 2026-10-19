import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { VISUALIZACAO_PADRAO } from "@/lib/escale/conversas/visualizacao";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org1", role: "agent" }, user: { id: "u1" } }),
}));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({
  useConversationCounts: () => ({ data: { all: 120, fila: 0, unassigned: 0, mine: 0 } }),
}));
const gravar = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/escale/usePreferenciasDeConversas", () => ({
  useGravarPreferencia: () => ({ mutate: gravar, isPending: false }),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

import { BarraDaFila } from "@/components/escale/conversas/fila/BarraDaFila";
import { LinhaDaFila } from "@/components/escale/conversas/fila/LinhaDaFila";
import { ListaDaFila } from "@/components/escale/conversas/fila/ListaDaFila";
import { PainelPersonalizarVisualizacao } from "@/components/escale/conversas/fila/PainelPersonalizarVisualizacao";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const AGORA = new Date("2026-10-18T15:00:00-03:00");
const conversa = (extra: Partial<ConversationWithContact> = {}): ConversationWithContact =>
  ({
    id: "c1",
    status: "open",
    assigned_to_user_id: null,
    assigned_to_user_name: null,
    last_inbound_at: "2026-10-18T17:50:00Z",
    last_outbound_at: "2026-10-18T17:00:00Z",
    last_message_at: "2026-10-18T17:50:00Z",
    last_message_preview: "Qual a previsão de terminar?",
    unread_count_for_assignee: 3,
    snooze_until: null,
    is_group: false,
    contacts: {
      id: "ct1",
      display_name: "Adivane Antoniazzi",
      name: null,
      phone_number: "+5562999990000",
      tags: ["vip", "obra"],
      is_blocked: false,
      is_anonymized: false,
      is_personal: false,
    },
    channel_sessions: { provider: "waha", phone_number: null, display_name: null },
    ...extra,
  }) as unknown as ConversationWithContact;

const barra = (extra: Partial<Parameters<typeof BarraDaFila>[0]> = {}) => (
  <BarraDaFila
    busca=""
    aoBuscar={vi.fn()}
    preset="todos"
    aoMudarPreset={vi.fn()}
    ordem="interacao"
    aoMudarOrdem={vi.fn()}
    espiao={false}
    aoMudarEspiao={vi.fn()}
    personalizando={false}
    aoPersonalizar={vi.fn()}
    visualizacaoForaDoPadrao={false}
    {...extra}
  />
);

describe("BarraDaFila (c01, c31, c43, c22)", () => {
  it("busca, o botão do preset, o funil (Em breve), a ordem e o ⋮", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    const aoMudarPreset = vi.fn();
    envolver(barra({ aoMudarPreset }));
    expect(screen.getByPlaceholderText("Pesquisar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtros" })).toHaveAttribute("title", "Em breve");
    await u.click(screen.getByRole("button", { name: "Todos" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Status")).toBeInTheDocument();
    expect(within(menu).getByText("Salvos")).toBeInTheDocument();
    expect(within(menu).getByText("99+")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Criar filtro/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await u.click(within(menu).getByRole("menuitem", { name: /Em espera/ }));
    expect(aoMudarPreset).toHaveBeenCalledWith("em_espera");
  });

  it("a ordem e o ⋮ com modo espião e Personalizar visualização (ponto roxo fora do padrão)", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    const aoMudarOrdem = vi.fn();
    const aoMudarEspiao = vi.fn();
    envolver(barra({ aoMudarOrdem, aoMudarEspiao, visualizacaoForaDoPadrao: true }));
    await u.click(screen.getByRole("button", { name: "Ordenar por" }));
    await u.click(screen.getByRole("menuitem", { name: "Esperando mais tempo" }));
    expect(aoMudarOrdem).toHaveBeenCalledWith("espera");
    await u.click(screen.getByRole("button", { name: "Mais" }));
    expect(screen.getByRole("menuitem", { name: "Selecionar" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await u.click(screen.getByRole("menuitem", { name: "Ativar modo espião" }));
    expect(aoMudarEspiao).toHaveBeenCalledWith(true);
    await u.click(screen.getByRole("button", { name: "Mais" }));
    expect(screen.getByTestId("ponto-fora-do-padrao")).toBeInTheDocument();
  });
});

describe("LinhaDaFila (c01, c47, c54)", () => {
  it("nome, prévia, hora, 'sem atendente', não lidas; ✓✓ quando a última foi nossa", () => {
    const { rerender } = envolver(
      <LinhaDaFila
        conversa={conversa()}
        selecionada={false}
        aoSelecionar={vi.fn()}
        visualizacao={VISUALIZACAO_PADRAO}
        agora={AGORA}
      />,
    );
    expect(screen.getByText("Adivane Antoniazzi")).toBeInTheDocument();
    expect(screen.getByText("Qual a previsão de terminar?")).toBeInTheDocument();
    expect(screen.getByText("14:50")).toBeInTheDocument();
    expect(screen.getByTitle("Sem atendente")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByTestId("enviada")).not.toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <LinhaDaFila
          conversa={conversa({
            last_outbound_at: "2026-10-18T17:55:00Z",
            assigned_to_user_name: "Camilly",
          })}
          selecionada={false}
          aoSelecionar={vi.fn()}
          visualizacao={VISUALIZACAO_PADRAO}
          agora={AGORA}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("enviada")).toBeInTheDocument();
    expect(screen.getByTitle("Atendente: Camilly")).toHaveTextContent("C");
  });

  it("a segunda linha: tempo sem resposta com a cor, e as tags", () => {
    const v = {
      ...VISUALIZACAO_PADRAO,
      campos: { ...VISUALIZACAO_PADRAO.campos, tempoSemResposta: true, tags: true },
    };
    envolver(
      <LinhaDaFila
        conversa={conversa({
          last_inbound_at: "2026-10-18T12:00:00Z",
          last_outbound_at: "2026-10-18T11:00:00Z",
        })}
        selecionada={false}
        aoSelecionar={vi.fn()}
        visualizacao={v}
        agora={AGORA}
      />,
    );
    const espera = screen.getByTitle("Aguardando resposta há 6h");
    expect(espera).toHaveTextContent("6h");
    expect(espera).toHaveAttribute("data-cor", "vermelho");
    expect(screen.getByText("vip")).toBeInTheDocument();
  });

  it("fixada: o X solta e o alfinete explica", () => {
    const aoSoltar = vi.fn();
    envolver(
      <LinhaDaFila
        conversa={conversa()}
        selecionada
        fixada
        aoSelecionar={vi.fn()}
        aoSoltar={aoSoltar}
        visualizacao={VISUALIZACAO_PADRAO}
        agora={AGORA}
      />,
    );
    expect(
      screen.getByTitle(
        "Esta é a conversa atual e ela não corresponde a visualização dos filtros.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(aoSoltar).toHaveBeenCalled();
  });
});

describe("ListaDaFila (c75)", () => {
  const fila = {
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
  it("carregando, vazia com filtro, e a fixada no topo", () => {
    const { rerender } = envolver(
      <ListaDaFila
        fila={{ ...fila, isLoading: true } as never}
        itens={[]}
        fixada={null}
        selectedId={null}
        aoSelecionar={vi.fn()}
        aoSoltarFixada={vi.fn()}
        temFiltro={false}
        aoIniciar={vi.fn()}
        visualizacao={VISUALIZACAO_PADRAO}
      />,
    );
    expect(screen.getByText("Carregando mensagens...")).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ListaDaFila
          fila={fila as never}
          itens={[]}
          fixada={null}
          selectedId={null}
          aoSelecionar={vi.fn()}
          aoSoltarFixada={vi.fn()}
          temFiltro
          aoIniciar={vi.fn()}
          visualizacao={VISUALIZACAO_PADRAO}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Nenhuma conversa nos filtros")).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ListaDaFila
          fila={fila as never}
          itens={[conversa({ id: "c2" })]}
          fixada={conversa({ id: "c1" })}
          selectedId="c1"
          aoSelecionar={vi.fn()}
          aoSoltarFixada={vi.fn()}
          temFiltro
          aoIniciar={vi.fn()}
          visualizacao={VISUALIZACAO_PADRAO}
        />
      </QueryClientProvider>,
    );
    const linhas = screen.getAllByRole("button", { name: /Adivane/ });
    expect(linhas[0]).toHaveAttribute("data-fixada", "");
  });
});

describe("PainelPersonalizarVisualizacao (c44–c46)", () => {
  it("prévia, 7 toggles, o limite de 5, os limites de alerta e Restaurar padrão", () => {
    const cinco = {
      ...VISUALIZACAO_PADRAO,
      campos: {
        ...VISUALIZACAO_PADRAO.campos,
        setor: true,
        tempoSemResposta: true,
        mensagensAgendadas: true,
      },
    };
    envolver(<PainelPersonalizarVisualizacao visualizacao={cinco} aoFechar={vi.fn()} />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("5 de 5 campos ativos")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Tags" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Empresa" })).toHaveAttribute("title", "Em breve");
    fireEvent.click(screen.getByRole("switch", { name: "Atendente" }));
    expect(gravar).toHaveBeenLastCalledWith({
      chave: "visualizacao",
      valor: { ...cinco, campos: { ...cinco.campos, atendente: false } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Limites de alerta" }));
    expect(screen.getByLabelText("Amarelo a partir de")).toHaveValue(1);
    fireEvent.change(screen.getByLabelText("Vermelho a partir de"), { target: { value: "8" } });
    expect(gravar).toHaveBeenLastCalledWith({
      chave: "visualizacao",
      valor: { ...cinco, limites: { ...cinco.limites, vermelho: { valor: 8, unidade: "horas" } } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    expect(gravar).toHaveBeenLastCalledWith({ chave: "visualizacao", valor: VISUALIZACAO_PADRAO });
  });
});
