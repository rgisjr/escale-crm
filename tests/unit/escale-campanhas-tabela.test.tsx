import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaAlterarHorario } from "@/components/escale/campanhas/JanelaAlterarHorario";
import { TabelaDeCampanhas } from "@/components/escale/campanhas/TabelaDeCampanhas";
import { VazioSemCampanhas } from "@/components/escale/campanhas/VaziosDasCampanhas";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", async (orig) => ({
  ...(await orig<object>()),
  useTagDeIdioma: () => "pt-BR",
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const mutate = vi.fn();
vi.mock("@/hooks/escale/useCampanhasDaCasca", () => ({
  useAcoesDaCampanha: () => ({ mutate, isPending: false }),
}));

const SP = "America/Sao_Paulo";
const AGORA = new Date("2026-10-17T12:00:00Z");
const linha = (extra: Partial<LinhaDeCampanha> = {}): LinhaDeCampanha => ({
  id: "c1",
  nome: "10.09",
  status: "completed",
  numeroId: "s1",
  solicitados: 30,
  agendadaPara: null,
  iniciadaEm: "2026-09-10T15:39:00Z",
  criadaEm: "2026-09-10T12:00:00Z",
  adicionados: 30,
  enviados: 26,
  entregues: 24,
  lidos: 16,
  erros: 3,
  ...extra,
});
const props = {
  carregando: false,
  erro: false,
  filtrando: false,
  fuso: SP,
  agora: AGORA,
  nomeDoNumero: () => "Comercial",
  aoLimparFiltros: vi.fn(),
  aoTentarDeNovo: vi.fn(),
};
const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  push.mockReset();
  mutate.mockReset();
});

describe("TabelaDeCampanhas (002)", () => {
  it("as colunas e a linha: ícone, nome, '30 Solicitados há um mês', data BR, número, barra, selo", () => {
    envolver(<TabelaDeCampanhas {...props} linhas={[linha()]} />);
    for (const c of ["Campanha", "Data agendamento", "Número", "Resultado", "Status", "Ações"]) {
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    }
    const tr = screen.getByText("10.09").closest("tr")!;
    expect(within(tr).getByText("30 Solicitados há um mês")).toBeInTheDocument();
    expect(within(tr).getByText("10/09/2026 12:39")).toBeInTheDocument();
    expect(within(tr).getByText("Comercial")).toBeInTheDocument();
    expect(within(tr).getByText("Completo")).toBeInTheDocument();
    expect(within(tr).getByRole("img")).toHaveAccessibleName(/16 lidos - 53%/);
  });

  it("clicar abre: rascunho no rascunho, as outras no detalhe", () => {
    const { unmount } = envolver(
      <TabelaDeCampanhas {...props} linhas={[linha({ status: "draft" })]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "10.09" }));
    expect(push).toHaveBeenLastCalledWith("/app/campaigns/c1/edit");
    unmount();
    envolver(<TabelaDeCampanhas {...props} linhas={[linha()]} />);
    fireEvent.click(screen.getByText("Comercial"));
    expect(push).toHaveBeenLastCalledWith("/app/campaigns?campanha=c1");
  });

  it("o ⋮ do rascunho: Editar, Excluir (vermelho, com a confirmação da Clint) e Duplicar", async () => {
    const user = userEvent.setup();
    envolver(
      <TabelaDeCampanhas
        {...props}
        linhas={[linha({ status: "draft", solicitados: 0, adicionados: 0 })]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Mais opções" }));
    const itens = screen.getAllByRole("menuitem").map((i) => i.textContent);
    expect(itens).toEqual(["Editar rascunho", "Excluir rascunho", "Duplicar campanha"]);
    await user.click(screen.getByRole("menuitem", { name: "Excluir rascunho" }));
    expect(
      await screen.findByText(
        "Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir rascunho" }));
    expect(mutate).toHaveBeenCalledWith({ id: "c1", acao: "excluir" }, expect.anything());
  });

  it("agendada: Alterar horário abre a janela; Cancelar volta a rascunho", async () => {
    const user = userEvent.setup();
    envolver(
      <TabelaDeCampanhas
        {...props}
        linhas={[linha({ status: "scheduled", agendadaPara: "2099-01-01T12:00:00Z", enviados: 0 })]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Mais opções" }));
    await user.click(screen.getByRole("menuitem", { name: "Cancelar campanha" }));
    expect(
      await screen.findByText(
        "A campanha será movida para Rascunho e você poderá editá-la e reagendar. Deseja continuar?",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar campanha" }));
    expect(mutate).toHaveBeenCalledWith({ id: "c1", acao: "rascunho" }, expect.anything());
  });

  it("em andamento: Pausar na linha; pausada: Retomar", () => {
    const { unmount } = envolver(
      <TabelaDeCampanhas {...props} linhas={[linha({ status: "running" })]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pausar campanha" }));
    expect(mutate).toHaveBeenCalledWith({ id: "c1", acao: "pausar" }, expect.anything());
    expect(push).not.toHaveBeenCalled();
    unmount();
    envolver(<TabelaDeCampanhas {...props} linhas={[linha({ status: "paused" })]} />);
    fireEvent.click(screen.getByRole("button", { name: "Retomar campanha" }));
    expect(mutate).toHaveBeenLastCalledWith({ id: "c1", acao: "retomar" }, expect.anything());
  });

  it("carregando: 10 linhas-esqueleto; erro com 'Tentar novamente'; vazio por filtro com 'Limpar filtros'", () => {
    const { container, rerender } = envolver(
      <TabelaDeCampanhas {...props} carregando linhas={[]} />,
    );
    expect(container.querySelectorAll("tr[data-esqueleto]")).toHaveLength(10);
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TabelaDeCampanhas {...props} erro linhas={[]} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Não foi possível carregar as campanhas.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(props.aoTentarDeNovo).toHaveBeenCalled();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TabelaDeCampanhas {...props} filtrando linhas={[]} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Nenhuma campanha encontrada")).toBeInTheDocument();
    expect(screen.getByText("Tente ajustar a busca ou os filtros aplicados.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(props.aoLimparFiltros).toHaveBeenCalled();
  });
});

describe("JanelaAlterarHorario", () => {
  it("salva o horário agendado; no passado, o erro da Clint e nada vai ao servidor", async () => {
    const user = userEvent.setup();
    const { unmount } = envolver(
      <JanelaAlterarHorario
        linha={linha({ status: "scheduled", agendadaPara: "2099-01-01T12:00:00Z" })}
        aoFechar={vi.fn()}
      />,
    );
    expect(screen.getByText("Alterar horário do disparo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar novo horário" }));
    expect(mutate).toHaveBeenCalledWith(
      { id: "c1", acao: "reagendar", quando: "2099-01-01T12:00:00.000Z" },
      expect.anything(),
    );
    unmount();
    mutate.mockReset();
    envolver(
      <JanelaAlterarHorario
        linha={linha({ status: "scheduled", agendadaPara: "2020-01-01T12:00:00Z" })}
        aoFechar={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Salvar novo horário" }));
    expect(screen.getByRole("alert")).toHaveTextContent("O novo horário precisa ser no futuro.");
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe("VazioSemCampanhas (014)", () => {
  it("o título, o texto e o botão contornado da Clint", () => {
    render(<VazioSemCampanhas />);
    expect(screen.getByRole("heading", { name: "Crie sua primeira campanha" })).toBeInTheDocument();
    expect(
      screen.getByText("Envie WhatsApp em massa para sua audiência de forma rápida e organizada."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar WhatsApp" })).toHaveAttribute(
      "href",
      "/app/campaigns/new",
    );
  });
});
