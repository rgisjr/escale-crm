import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/hooks/escale/useListaDeContatos", () => ({ useListaDeContatos: vi.fn() }));
vi.mock("@/hooks/escale/useFiltrosDaLista", () => ({
  useFiltrosDaLista: () => ({ data: [] }),
  useMudarFiltroDaLista: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useExcluirFiltroDaLista: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/escale/useAssistenteDeCampanha", () => ({
  usePaginaDoPublico: vi.fn(),
  useAcompanharImportacao: () => ({ data: undefined }),
  contatosDaImportacao: vi.fn(),
}));
vi.mock("@/components/escale/importacao/JanelaDeImportacao", () => ({
  JanelaDeImportacao: () => null,
}));
vi.mock("@/components/escale/contatos/JanelaNovoContato", () => ({
  JanelaNovoContato: ({
    aberta,
    aoCriar,
  }: {
    aberta: boolean;
    aoCriar?: (c: { id: string; nome: string }) => void;
  }) =>
    aberta ? (
      <button type="button" onClick={() => aoCriar?.({ id: "novo", nome: "Novo" })}>
        criar
      </button>
    ) : null,
}));

import { JanelaSelecionarContatos } from "@/components/escale/campanhas/assistente/JanelaSelecionarContatos";
import { PassoContatos } from "@/components/escale/campanhas/assistente/PassoContatos";
import { usePaginaDoPublico } from "@/hooks/escale/useAssistenteDeCampanha";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { ASSISTENTE_VAZIO, estadoInicial } from "@/lib/escale/campanhas/estado-do-assistente";
import { OPCOES_VAZIAS } from "@/lib/escale/contatos/opcoes-do-filtro";

const comConsulta = (ui: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
);

const linhaDeContato = (id: string, nome: string, telefone: string | null) => ({
  id,
  nome,
  display_name: null,
  telefone,
  email: null,
  instagram: null,
  tags: ["calculadora"],
  tem_foto: false,
  conversa_id: null,
  negocios: 0,
  negocio_unico: null,
  status: null,
  ultima_atividade: null,
  criado_em: "2026-10-01T00:00:00Z",
  origem: null,
  nascimento: null,
  links: {},
  empresa: null,
  campos: {},
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useListaDeContatos).mockReturnValue({
    data: {
      linhas: [
        linhaDeContato("c1", "Anderson Flavio", "+5581997893443"),
        linhaDeContato("c2", "Sem Fone", null),
      ],
      total: 44520,
      pagina: 1,
      porPagina: 10,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
  vi.mocked(usePaginaDoPublico).mockReturnValue({
    data: {
      linhas: [
        {
          id: "c1",
          nome: "Fernanda Koinwascki",
          telefone: "+5549984086513",
          email: "fernanda@x.com",
          tags: ["calculadora"],
        },
      ],
      total: 1,
    },
    isLoading: false,
    isError: false,
  } as never);
});

describe("PassoContatos", () => {
  it("vazio: os três cartões; Adicionar contato põe o novo nos avulsos", async () => {
    const despachar = vi.fn();
    render(
      comConsulta(
        <PassoContatos
          estado={{ ...estadoInicial(), passo: 1 }}
          despachar={despachar}
          numeroOficial
          origens={[]}
          opcoesDoFiltro={OPCOES_VAZIAS}
        />,
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Mensagem de WhatsApp Oficial" }),
    ).toBeInTheDocument();
    for (const nome of ["Adicionar contato", "Selecionar contatos", "Importar telefones .csv"]) {
      expect(screen.getByRole("button", { name: new RegExp(nome) })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: /Adicionar contato/ }));
    await userEvent.click(screen.getByRole("button", { name: "criar" }));
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudarPublico",
      publico: { selecao: null, avulsos: ["novo"], removidos: [] },
    });
  });

  it("com destinatários: a contagem, a linha e 'Remover da lista'", async () => {
    const despachar = vi.fn();
    const publico = { selecao: { tipo: "ids" as const, ids: ["c1"] }, avulsos: [], removidos: [] };
    render(
      comConsulta(
        <PassoContatos
          estado={{ ...estadoInicial(), passo: 1, dados: { ...ASSISTENTE_VAZIO, publico } }}
          despachar={despachar}
          numeroOficial
          origens={[]}
          opcoesDoFiltro={OPCOES_VAZIAS}
        />,
      ),
    );
    expect(screen.getByText("Destinatários")).toBeInTheDocument();
    expect(screen.getByText("(49) 98408-6513")).toBeInTheDocument();
    expect(screen.getByText("fernanda@x.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Remover da lista" }));
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudarPublico",
      publico: { ...publico, removidos: ["c1"] },
    });
  });

  it("com 'tentou' e sem ninguém, o aviso da Clint", () => {
    render(
      comConsulta(
        <PassoContatos
          estado={{ ...estadoInicial(), passo: 1, tentou: true }}
          despachar={vi.fn()}
          numeroOficial={false}
          origens={[]}
          opcoesDoFiltro={OPCOES_VAZIAS}
        />,
      ),
    );
    expect(screen.getByText("Você deve selecionar pelo menos um contato.")).toBeInTheDocument();
  });

  it("público do formulário antigo avisa", () => {
    render(
      comConsulta(
        <PassoContatos
          estado={{ ...estadoInicial(), passo: 1, publicoAntigo: true }}
          despachar={vi.fn()}
          numeroOficial={false}
          origens={[]}
          opcoesDoFiltro={OPCOES_VAZIAS}
        />,
      ),
    );
    expect(
      screen.getByText(
        "Esta campanha usava o público por filtro da tela antiga; escolha os destinatários de novo.",
      ),
    ).toBeInTheDocument();
  });
});

describe("JanelaSelecionarContatos", () => {
  it("marcar um a um grava os ids; contato sem telefone não marca", async () => {
    const aoAdicionar = vi.fn();
    render(
      comConsulta(
        <JanelaSelecionarContatos
          aberta
          aoFechar={vi.fn()}
          inicial={null}
          opcoesDoFiltro={OPCOES_VAZIAS}
          aoAdicionar={aoAdicionar}
        />,
      ),
    );
    expect(screen.getByText("Nenhum contato selecionado")).toBeInTheDocument();
    expect(
      screen.getByText("Contatos duplicados não poderão ser selecionados"),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Sem Fone" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "Anderson Flavio" }));
    expect(screen.getByText("1 selecionado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(aoAdicionar).toHaveBeenCalledWith({ tipo: "ids", ids: ["c1"] });
  });

  it("'Selecionar todos' grava O FILTRO, não a lista", async () => {
    const aoAdicionar = vi.fn();
    render(
      comConsulta(
        <JanelaSelecionarContatos
          aberta
          aoFechar={vi.fn()}
          inicial={null}
          opcoesDoFiltro={OPCOES_VAZIAS}
          aoAdicionar={aoAdicionar}
        />,
      ),
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar todos" }));
    expect(screen.getByText("44.520 selecionados")).toBeInTheDocument();
    expect(
      screen.getByText("A quantidade de contatos pode variar até o momento do envio."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(aoAdicionar).toHaveBeenCalledWith({
      tipo: "filtro",
      v: "todos",
      quantidade: null,
      excluidos: [],
    });
  });
});
