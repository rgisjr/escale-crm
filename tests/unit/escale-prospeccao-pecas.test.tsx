import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BarraDaProspeccao } from "@/components/escale/prospeccao/BarraDaProspeccao";
import { BarraDeFiltrosDaProspeccao } from "@/components/escale/prospeccao/BarraDeFiltrosDaProspeccao";
import { BotaoDaChave } from "@/components/escale/prospeccao/BotaoDaChave";
import { SeloDaSituacao } from "@/components/escale/prospeccao/SeloDaProspeccao";
import { TabelaDeProspeccoes } from "@/components/escale/prospeccao/TabelaDeProspeccoes";
import { VazioSemProspeccoes } from "@/components/escale/prospeccao/VaziosDaProspeccao";
import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { contagem, linha } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({ useAcaoDaProspeccao: vi.fn() }));

const mutateAsync = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockReset().mockResolvedValue({ configured: true });
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
});
afterEach(() => vi.useRealTimers());

const props = {
  carregando: false,
  erro: false,
  filtrando: false,
  fuso: "America/Sao_Paulo",
  ocupadoId: null,
  nomeDoNumero: () => "Comercial",
  aoAbrir: vi.fn(),
  aoPausar: vi.fn(),
  aoRetomar: vi.fn(),
  aoDuplicar: vi.fn(),
  aoLimparFiltros: vi.fn(),
  aoTentarDeNovo: vi.fn(),
};

describe("selo e barra (D3, D5)", () => {
  it("o selo mostra o rótulo e pulsa em progresso", () => {
    render(<SeloDaSituacao situacao="em_progresso" />);
    const selo = screen.getByText("Em progresso");
    expect(selo.className).toContain("animate-pulse");
  });

  it("a barra descreve os segmentos; sem encontradas, o traço", () => {
    const { rerender } = render(<BarraDaProspeccao linha={linha()} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "2 com falha - 10%, 10 abordadas - 50%, 4 responderam - 20%, 1 qualificadas - 5%",
    );
    rerender(<BarraDaProspeccao linha={linha({ ...contagem() })} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("TabelaDeProspeccoes (002, D6, D8)", () => {
  it("linha: nome, subtítulo, data de início, número; clicar abre", async () => {
    render(<TabelaDeProspeccoes {...props} linhas={[linha()]} />);
    expect(screen.getByText("Clínicas Campinas")).toBeInTheDocument();
    expect(screen.getByText("20 empresas encontradas")).toBeInTheDocument();
    expect(screen.getByText("10/10/2026 12:39")).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Clínicas Campinas"));
    expect(props.aoAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: linha().id }));
  });

  it("Pausar em progresso, Retomar na pausada, sem abrir a linha", async () => {
    const { rerender } = render(<TabelaDeProspeccoes {...props} linhas={[linha()]} />);
    await userEvent.click(screen.getByRole("button", { name: "Pausar prospecção" }));
    expect(props.aoPausar).toHaveBeenCalled();
    expect(props.aoAbrir).not.toHaveBeenCalled();
    rerender(<TabelaDeProspeccoes {...props} linhas={[linha({ situacao: "pausada" })]} />);
    await userEvent.click(screen.getByRole("button", { name: "Retomar prospecção" }));
    expect(props.aoRetomar).toHaveBeenCalled();
  });

  it("⋮ do rascunho: Continuar rascunho e Duplicar", async () => {
    render(<TabelaDeProspeccoes {...props} linhas={[linha({ situacao: "rascunho" })]} />);
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(await screen.findByRole("menuitem", { name: "Continuar rascunho" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicar prospecção" }));
    expect(props.aoDuplicar).toHaveBeenCalled();
  });

  it("carregando, vazio por filtro e erro", async () => {
    const { rerender } = render(<TabelaDeProspeccoes {...props} linhas={[]} carregando />);
    expect(screen.getByRole("status", { name: "Carregando prospecções" })).toBeInTheDocument();
    rerender(<TabelaDeProspeccoes {...props} linhas={[]} filtrando />);
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(props.aoLimparFiltros).toHaveBeenCalled();
    rerender(<TabelaDeProspeccoes {...props} linhas={[]} erro />);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(props.aoTentarDeNovo).toHaveBeenCalled();
  });
});

describe("filtros (D7)", () => {
  it("a busca espera 500 ms", () => {
    vi.useFakeTimers();
    const aoMudar = vi.fn();
    render(<BarraDeFiltrosDaProspeccao filtros={{}} aoMudar={aoMudar} />);
    fireEvent.change(screen.getByPlaceholderText("Buscar prospecção"), {
      target: { value: "clin" },
    });
    expect(aoMudar).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(500));
    expect(aoMudar).toHaveBeenCalledWith({ busca: "clin" });
  });

  it("Limpar filtros esvazia o campo e não reaplica a busca (B9-3)", () => {
    vi.useFakeTimers();
    const aoMudar = vi.fn();
    const { rerender } = render(
      <BarraDeFiltrosDaProspeccao filtros={{ busca: "clin" }} aoMudar={aoMudar} />,
    );
    rerender(<BarraDeFiltrosDaProspeccao filtros={{}} aoMudar={aoMudar} />);
    expect(screen.getByPlaceholderText("Buscar prospecção")).toHaveValue("");
    act(() => vi.advanceTimersByTime(1500));
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("busca só com espaços não chama aoMudar (B9-4)", () => {
    vi.useFakeTimers();
    const aoMudar = vi.fn();
    render(<BarraDeFiltrosDaProspeccao filtros={{}} aoMudar={aoMudar} />);
    fireEvent.change(screen.getByPlaceholderText("Buscar prospecção"), {
      target: { value: "   " },
    });
    act(() => vi.advanceTimersByTime(1500));
    expect(aoMudar).not.toHaveBeenCalled();
  });
});

describe("chave e vazio (D11)", () => {
  it("salva a chave pelo configure do original", async () => {
    render(<BotaoDaChave forma="icone" />);
    await userEvent.click(screen.getByRole("button", { name: "Configuração da prospecção" }));
    await userEvent.type(screen.getByLabelText("Chave da Apify"), "apify_api_1234567890");
    await userEvent.click(screen.getByRole("button", { name: "Salvar chave" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      action: "configure",
      api_key: "apify_api_1234567890",
    });
  });

  it("o vazio leva à nova prospecção", () => {
    render(<VazioSemProspeccoes />);
    expect(screen.getByRole("link", { name: "Nova prospecção" })).toHaveAttribute(
      "href",
      "/app/campaigns/prospeccao/nova",
    );
  });
});
