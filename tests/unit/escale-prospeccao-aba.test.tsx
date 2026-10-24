import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcoesDaProspeccao } from "@/components/escale/prospeccao/AcoesDaProspeccao";
import { ListaDeProspeccoes } from "@/components/escale/prospeccao/ListaDeProspeccoes";
import {
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useListaDeProspeccoes,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { detalhe, ID, linha, OPCOES } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useListaDeProspeccoes: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));

const mutateAsync = vi.fn();
const pagina = (linhas = [linha()], total = linhas.length) => ({
  data: { linhas, total, pagina: 1, porPagina: 10 },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset().mockResolvedValue({});
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({
    mutateAsync,
    isPending: false,
    variables: undefined,
  } as never);
  vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES } as never);
  vi.mocked(useListaDeProspeccoes).mockReturnValue(pagina() as never);
  vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: detalhe(), isError: false } as never);
});

describe("ListaDeProspeccoes (D6–D8, D11)", () => {
  it("sem chave: só o vazio da chave", () => {
    vi.mocked(useOpcoesDaProspeccao).mockReturnValue({
      data: { ...OPCOES, configurada: false },
    } as never);
    render(<ListaDeProspeccoes />);
    expect(screen.getByText("Configure a chave de busca")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("sem nenhuma prospecção: o vazio com Nova prospecção", () => {
    vi.mocked(useListaDeProspeccoes).mockReturnValue(pagina([]) as never);
    render(<ListaDeProspeccoes />);
    expect(screen.getByText("Crie sua primeira prospecção")).toBeInTheDocument();
  });

  it("linha em progresso abre a janela de detalhe; o nome do número vem das opções", async () => {
    render(<ListaDeProspeccoes />);
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Clínicas Campinas"));
    expect(await screen.findByText("INFORMAÇÕES DA PROSPECÇÃO")).toBeInTheDocument();
  });

  it("rascunho reabre o assistente; duplicar abre a cópia", async () => {
    vi.mocked(useListaDeProspeccoes).mockReturnValue(
      pagina([linha({ situacao: "rascunho" })]) as never,
    );
    render(<ListaDeProspeccoes />);
    await userEvent.click(screen.getByText("Clínicas Campinas"));
    expect(push).toHaveBeenCalledWith(`/app/campaigns/prospeccao/nova?id=${ID}`);
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Duplicar prospecção" }));
    expect(push).toHaveBeenCalledWith(`/app/campaigns/prospeccao/nova?copiar=${ID}`);
  });

  it("Pausar na linha usa o pause do original", async () => {
    render(<ListaDeProspeccoes />);
    await userEvent.click(screen.getByRole("button", { name: "Pausar prospecção" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "pause", id: ID });
  });

  it("rodapé só acima de 10", () => {
    vi.mocked(useListaDeProspeccoes).mockReturnValue(pagina([linha()], 11) as never);
    render(<ListaDeProspeccoes />);
    expect(screen.getByText("10 por página")).toBeInTheDocument();
  });
});

describe("AcoesDaProspeccao (D11, D12)", () => {
  it("engrenagem e Nova prospecção", () => {
    render(<AcoesDaProspeccao />);
    expect(screen.getByRole("button", { name: "Configuração da prospecção" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nova prospecção" })).toHaveAttribute(
      "href",
      "/app/campaigns/prospeccao/nova",
    );
  });
});
