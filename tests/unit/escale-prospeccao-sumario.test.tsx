import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DetalheDaProspeccao } from "@/components/escale/prospeccao/detalhe/DetalheDaProspeccao";
import { RitmoDaProspeccao } from "@/components/escale/prospeccao/detalhe/RitmoDaProspeccao";
import { SumarioDaProspeccao } from "@/components/escale/prospeccao/detalhe/SumarioDaProspeccao";
import {
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { detalhe, ID, linha, OPCOES } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));

const mutateAsync = vi.fn();
beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({});
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
  vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES } as never);
  vi.mocked(useDetalheDaProspeccao).mockReturnValue({
    data: detalhe(),
    isError: false,
    refetch: vi.fn(),
  } as never);
});

describe("DetalheDaProspeccao (009; D10)", () => {
  it("rótulo, nome, abas e Pausar em progresso", async () => {
    render(<DetalheDaProspeccao id={ID} aoFechar={vi.fn()} />);
    expect(screen.getByText("INFORMAÇÕES DA PROSPECÇÃO")).toBeInTheDocument();
    expect(screen.getByText("Clínicas Campinas")).toBeInTheDocument();
    expect(screen.getByText("Sumário")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Pausar prospecção" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "pause", id: ID });
  });

  it("pausada mostra Retomar", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({
      data: detalhe({ status: "paused", linha: linha({ situacao: "pausada" }) }),
      isError: false,
    } as never);
    render(<DetalheDaProspeccao id={ID} aoFechar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Retomar prospecção" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "resume", id: ID });
  });
});

describe("SumarioDaProspeccao", () => {
  it("cartões, funil, busca com custo em US$ e a abordagem com nomes", () => {
    render(<SumarioDaProspeccao detalhe={detalhe()} opcoes={OPCOES} />);
    expect(screen.getAllByText("Encontradas")).toHaveLength(2);
    expect(screen.getByText("% sobre encontradas")).toBeInTheDocument();
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
    expect(screen.getByText("US$ 0,45")).toBeInTheDocument();
    expect(
      screen.getByText("3 resultados repetidos ou indisponíveis foram desconsiderados."),
    ).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    expect(screen.getByText("Sofia")).toBeInTheDocument();
    expect(screen.getByText("Prospecção ativa · Abordado → Qualificado")).toBeInTheDocument();
    expect(screen.getByText("LIA 2026/01")).toBeInTheDocument();
  });

  it("sem configuração, avisa", () => {
    render(
      <SumarioDaProspeccao detalhe={detalhe({ status: "draft", config: null })} opcoes={OPCOES} />,
    );
    expect(screen.getByText("A abordagem ainda não foi configurada.")).toBeInTheDocument();
  });
});

describe("RitmoDaProspeccao", () => {
  it("rodando: só o texto, sem editar", () => {
    render(<RitmoDaProspeccao detalhe={detalhe()} />);
    expect(
      screen.getByText("10 abordagens em 24 horas, com pelo menos 15 minutos entre elas."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar ritmo" })).not.toBeInTheDocument();
  });

  it("pausada: edita e salva pelo adjust_pace", async () => {
    render(<RitmoDaProspeccao detalhe={detalhe({ status: "paused" })} />);
    await userEvent.click(screen.getByRole("button", { name: "Editar ritmo" }));
    const diario = screen.getByLabelText("Máximo em 24 horas");
    await userEvent.clear(diario);
    await userEvent.type(diario, "20");
    await userEvent.click(screen.getByRole("button", { name: "Salvar ritmo" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      action: "adjust_pace",
      id: ID,
      daily_limit: 20,
      interval_minutes: 15,
    });
  });
});
