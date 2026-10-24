import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const mutateAsync = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useDetalheDaCampanha", () => ({
  useDestinatariosDaCampanha: vi.fn(),
  useMassaDaCampanha: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/components/escale/contatos/massa/PainelDeTag", () => ({
  PainelDeTag: ({
    aoAplicar,
  }: {
    aoAplicar: (a: "incluir_tag", tag: string) => Promise<boolean>;
  }) => (
    <button type="button" onClick={() => void aoAplicar("incluir_tag", "vip")}>
      Adicionar tag
    </button>
  ),
}));
vi.mock("@/components/escale/contatos/massa/JanelaCriarNegocios", () => ({
  JanelaCriarNegocios: () => null,
}));

import { DetalhesDaCampanha } from "@/components/escale/campanhas/detalhe/DetalhesDaCampanha";
import { useDestinatariosDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import type {
  InfoDaCampanha,
  LinhaDeDestinatario,
  SumarioDaCampanha,
} from "@/lib/escale/campanhas/detalhe/tipos";
import { rotaDoRascunho } from "@/lib/escale/campanhas/rotas";

const R1 = "e5ca1e00-8c00-4000-8000-0000000000d1";
const LINHA: LinhaDeDestinatario = {
  id: R1,
  contatoId: "k1",
  telefone: "+5553984555965",
  nome: "Elza Maria",
  email: null,
  situacao: "lida",
  motivo: null,
  enviadoEm: "2026-09-10T15:40:00Z",
};
const CAMPANHA = {
  id: "c1",
  nome: "10.09",
  status: "completed",
  numeroId: "n1",
  numerosExtras: [],
  mensagem: null,
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
  iniciadaEm: null,
  agendadaPara: null,
  criadaEm: "2026-09-10T12:00:00Z",
} as InfoDaCampanha;
const SUMARIO = { enviados: 26 } as SumarioDaCampanha;

function montar(
  extra: { status?: InfoDaCampanha["status"]; enviados?: number; filtros?: object } = {},
) {
  const aoMudarFiltros = vi.fn();
  render(
    <DetalhesDaCampanha
      campanha={{ ...CAMPANHA, status: extra.status ?? "completed" }}
      sumario={{ ...SUMARIO, enviados: extra.enviados ?? 26 }}
      motivos={[{ codigo: "131049", quantidade: 2 }]}
      filtros={extra.filtros ?? {}}
      aoMudarFiltros={aoMudarFiltros}
      origens={[]}
      fuso="America/Sao_Paulo"
    />,
  );
  return { aoMudarFiltros };
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  window.localStorage.clear();
  vi.mocked(useDestinatariosDaCampanha).mockReturnValue({
    data: { linhas: [LINHA], total: 30, pagina: 1, porPagina: 20 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
});

describe("a tabela (012)", () => {
  it("barra, colunas visíveis, a linha e o rodapé", () => {
    montar();
    expect(screen.getByPlaceholderText("Buscar contato")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Filtros/ })).toBeInTheDocument();
    expect(screen.getByText("30 contatos")).toBeInTheDocument();
    for (const c of ["Telefone", "Nome", "Email", "Status"]) {
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    }
    expect(screen.queryByRole("columnheader", { name: "Motivo" })).toBeNull();
    const linha = screen.getByRole("row", { name: /Elza Maria/ });
    expect(within(linha).getByText("(53) 98455-5965")).toBeInTheDocument();
    expect(within(linha).getByText("-")).toBeInTheDocument();
    expect(within(linha).getByText("Lido")).toBeInTheDocument();
    expect(screen.getByText("1 a 20 de 30 contatos")).toBeInTheDocument();
  });

  it("a busca espera a pessoa parar de digitar", async () => {
    const { aoMudarFiltros } = montar();
    await userEvent.type(screen.getByPlaceholderText("Buscar contato"), "Elza");
    await waitFor(() => expect(aoMudarFiltros).toHaveBeenCalledWith({ busca: "Elza" }), {
      timeout: 1500,
    });
  });

  it("personalizar colunas mostra 'Motivo' e o contador cai", async () => {
    montar();
    const botao = screen.getByRole("button", { name: "Personalizar colunas" });
    expect(within(botao).getByText("2")).toBeInTheDocument();
    await userEvent.click(botao);
    await userEvent.click(screen.getByRole("checkbox", { name: "Motivo" }));
    expect(screen.getByRole("columnheader", { name: "Motivo" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: "Personalizar colunas" })).getByText("1"),
    ).toBeInTheDocument();
  });
});

describe("os filtros (013)", () => {
  it("motivo do erro com a contagem; Aplicar devolve o filtro", async () => {
    const { aoMudarFiltros } = montar();
    await userEvent.click(screen.getByRole("button", { name: /Filtros/ }));
    expect(screen.getByText("Filtros da campanha")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Meta optou por não entregar/ }));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(aoMudarFiltros).toHaveBeenCalledWith({ motivos: ["131049"] });
  });

  it("os aplicados viram chips removíveis", async () => {
    const { aoMudarFiltros } = montar({ filtros: { situacoes: ["lida"] } });
    await userEvent.click(screen.getByRole("button", { name: "Remover filtro Lida" }));
    expect(aoMudarFiltros).toHaveBeenCalledWith({});
  });
});

describe("seleção e ações em massa (C12)", () => {
  it("marcar a linha e 'Criar campanha' abre o rascunho novo", async () => {
    mutateAsync.mockResolvedValue({ tipo: "campanha", id: "novo" });
    montar();
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar Elza Maria" }));
    const barra = screen.getByRole("toolbar", { name: "Ações em massa" });
    await userEvent.click(within(barra).getByRole("button", { name: "Criar campanha" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      acao: "nova_campanha",
      alvo: { tipo: "ids", ids: [R1] },
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith(rotaDoRascunho("novo")));
  });

  it("a página toda, depois 'todos os filtrados', e a tag vai pelo filtro", async () => {
    mutateAsync.mockResolvedValue({
      tipo: "acao_em_massa",
      id: "a1",
      total: 30,
      status: "na_fila",
    });
    montar();
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar a página" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Selecionar todos os 30 contatos filtrados" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      acao: "incluir_tag",
      alvo: { tipo: "filtro", excluidos: [] },
      parametros: { tag: "vip" },
    });
  });

  it("'Excluir selecionados' só antes do envio, com confirmação", async () => {
    montar();
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar Elza Maria" }));
    expect(screen.queryByRole("button", { name: "Excluir selecionados" })).toBeNull();
  });

  it("antes do envio: confirma e tira da lista", async () => {
    mutateAsync.mockResolvedValue({ tipo: "lista", tirados: 1 });
    montar({ status: "ready", enviados: 0 });
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar Elza Maria" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
    await userEvent.click(screen.getByRole("button", { name: "Tirar da lista" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      acao: "tirar_da_lista",
      alvo: { tipo: "ids", ids: [R1] },
    });
  });
});

describe("estados", () => {
  it("vazio com filtro e erro", () => {
    vi.mocked(useDestinatariosDaCampanha).mockReturnValue({
      data: { linhas: [], total: 0, pagina: 1, porPagina: 20 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    const { unmount } = render(
      <DetalhesDaCampanha
        campanha={CAMPANHA}
        sumario={SUMARIO}
        motivos={[]}
        filtros={{ situacoes: ["erro"] }}
        aoMudarFiltros={vi.fn()}
        origens={[]}
      />,
    );
    expect(screen.getByText("Nenhum contato com esses filtros")).toBeInTheDocument();
    unmount();
    vi.mocked(useDestinatariosDaCampanha).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as never);
    montar();
    expect(screen.getByText("Não foi possível carregar os contatos.")).toBeInTheDocument();
  });
});
