import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
const acao = vi.fn();
const massa = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useCampanhasDaCasca", () => ({
  useAcoesDaCampanha: () => ({ mutateAsync: acao, isPending: false }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [{ id: "n1", display_name: "Naiara" }] }),
  channelLabel: (s: { display_name: string }) => s.display_name,
}));
vi.mock("@/hooks/escale/useDetalheDaCampanha", () => ({
  useDetalheDaCampanha: vi.fn(),
  useMassaDaCampanha: () => ({ mutateAsync: massa, isPending: false }),
  useDestinatariosDaCampanha: vi.fn(() => ({
    data: { linhas: [], total: 0, pagina: 1, porPagina: 20 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useNegociosDaCampanha: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRitmoDaCampanha: () => ({ mutateAsync: vi.fn(), isPending: false }),
  baixarCsvDaCampanha: vi.fn(async () => undefined),
}));
vi.mock("@/components/escale/campanhas/ListaDeCampanhasDaCasca", () => ({
  ListaDeCampanhasDaCasca: () => <p>lista</p>,
}));
vi.mock("@/app/app/prospecting/_client", () => ({ ProspectingClient: () => null }));
// As duas da 2B usam hooks com React Query (membros, vocabulário de tags); aqui não importam.
vi.mock("@/components/escale/contatos/massa/JanelaCriarNegocios", () => ({
  JanelaCriarNegocios: () => null,
}));
vi.mock("@/components/escale/contatos/massa/PainelDeTag", () => ({ PainelDeTag: () => null }));

import { CampanhasDaCasca } from "@/components/escale/campanhas/CampanhasDaCasca";
import { DetalheDaCampanhaDaCasca } from "@/components/escale/campanhas/detalhe/DetalheDaCampanhaDaCasca";
import {
  baixarCsvDaCampanha,
  useDestinatariosDaCampanha,
  useDetalheDaCampanha,
} from "@/hooks/escale/useDetalheDaCampanha";
import { ApiError } from "@/lib/api/types";
import type { DadosDoDetalhe } from "@/lib/escale/campanhas/detalhe/tipos";

const DADOS = (status: DadosDoDetalhe["campanha"]["status"]): DadosDoDetalhe => ({
  campanha: {
    id: "c1",
    nome: "10.09",
    status,
    numeroId: "n1",
    numerosExtras: [],
    mensagem: "Oi!",
    modelo: null,
    baseLegal: "consent",
    liaRef: null,
    ritmo: {
      intervaloSegundos: null,
      tetoDiario: null,
      tetoHorario: null,
      janelaInicioHora: null,
      janelaFimHora: null,
    },
    iniciadaEm: "2026-09-10T15:39:00Z",
    agendadaPara: null,
    criadaEm: "2026-09-10T12:00:00Z",
  },
  sumario: {
    adicionados: 30,
    enviados: 26,
    entregues: 23,
    lidas: 16,
    respondidas: 10,
    leuSemResposta: 6,
    erros: 0,
    naoEnviados: 0,
    aguardando: 4,
    foraDaLista: 0,
  },
  ritmo: [],
  motivos: [],
  resultado: {
    negocios: 0,
    valorAbertoCentavos: 0,
    valorGanhoCentavos: 0,
    medianaSegundos: null,
    benchmark: null,
    taxaDaCampanha: null,
  },
  fuso: "America/Sao_Paulo",
});

const comDados = (status: DadosDoDetalhe["campanha"]["status"]) =>
  vi.mocked(useDetalheDaCampanha).mockReturnValue({
    data: DADOS(status),
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as never);

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  acao.mockReset();
});

describe("a janela do detalhe (009; C1, C14)", () => {
  it("carregando: o título provisório e os esqueletos", () => {
    vi.mocked(useDetalheDaCampanha).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Carregando campanha" })).toBeInTheDocument();
    expect(
      screen.getByLabelText("Carregando campanha", { selector: "[aria-busy]" }),
    ).toBeInTheDocument();
  });

  it("em andamento: rótulo, nome, abas, Pausar com o diálogo da Clint e Baixar .CSV", async () => {
    comDados("running");
    acao.mockResolvedValue({});
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    const janela = screen.getByRole("dialog", { name: "10.09" });
    expect(within(janela).getByText("Informações da campanha")).toBeInTheDocument();
    expect(within(janela).getByRole("tab", { name: "Sumário" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.click(within(janela).getByRole("button", { name: "Pausar" }));
    const pausa = screen.getByRole("dialog", { name: "Pausar campanha" });
    expect(within(pausa).getByText("Contatos já alcançados")).toBeInTheDocument();
    expect(within(pausa).getByText("Mensagens em trânsito")).toBeInTheDocument();
    await userEvent.click(within(pausa).getByRole("button", { name: "Pausar campanha" }));
    expect(acao).toHaveBeenCalledWith({ id: "c1", acao: "pausar" });
    await userEvent.click(within(janela).getByRole("button", { name: "Baixar .CSV" }));
    expect(baixarCsvDaCampanha).toHaveBeenCalledWith("c1", "10.09", "America/Sao_Paulo");
  });

  it("pausada: Retomar sem diálogo", async () => {
    comDados("paused");
    acao.mockResolvedValue({});
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Retomar" }));
    expect(acao).toHaveBeenCalledWith({ id: "c1", acao: "retomar" });
  });

  it("concluída: sem Pausar nem Retomar", () => {
    comDados("completed");
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Retomar" })).toBeNull();
  });

  it("'Ver contatos' do Sumário leva aos Detalhes filtrados", async () => {
    comDados("completed");
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    const bloco = screen.getByRole("region", { name: "Leu e não respondeu" });
    await userEvent.click(within(bloco).getByRole("button", { name: "Ver contatos" }));
    expect(screen.getByRole("tab", { name: "Detalhes" })).toHaveAttribute("aria-selected", "true");
    expect(vi.mocked(useDestinatariosDaCampanha)).toHaveBeenLastCalledWith(
      "c1",
      { situacoes: ["lida"] },
      1,
      20,
      true,
      false,
    );
  });

  it("campanha que não existe; fechar", async () => {
    vi.mocked(useDetalheDaCampanha).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError(
        404,
        "campanha_nao_encontrada",
        undefined,
        "r1",
        "Campanha não encontrada.",
      ),
      refetch: vi.fn(),
    } as never);
    const aoFechar = vi.fn();
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={aoFechar} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Campanha não encontrada.");
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(aoFechar).toHaveBeenCalled();
  });
});

describe("CampanhasDaCasca com ?campanha= (N2)", () => {
  it("abre a janela sobre a lista e fechar volta para /app/campaigns sem rolar", async () => {
    comDados("completed");
    render(
      <CampanhasDaCasca
        papel="manager"
        organizacaoId="org-1"
        aba="whatsapp"
        campanhaAberta="c1"
        origens={[]}
      />,
    );
    expect(screen.getByText("lista")).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "10.09" })).getByRole("button", { name: "Fechar" }),
    );
    expect(replace).toHaveBeenCalledWith("/app/campaigns", { scroll: false });
  });

  it("sem ?campanha=, nada de janela", () => {
    render(<CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
