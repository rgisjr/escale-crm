import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/escale/useCatalogoDeCampos", () => ({
  useCatalogoDeCampos: () => ({ catalogo: { grupos: [], campos: [] } }),
}));

const estado = vi.hoisted(() => ({
  importacao: {} as Record<string, unknown>,
  linhas: {} as Record<string, unknown>,
}));
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useImportacao: () => estado.importacao,
  useLinhasDaImportacao: () => estado.linhas,
  useResolverLinha: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useResolverEmLote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDestinosDaImportacao: () => ({ data: [] }),
}));

import { RelatorioDaImportacao } from "@/components/escale/importacao/RelatorioDaImportacao";
import { RevisarPendencias } from "@/components/escale/importacao/RevisarPendencias";
import { ApiError } from "@/lib/api/types";

const imp = {
  id: "i",
  tipo: "contato",
  status: "aguardando_revisao",
  total: 3,
  importadas: 1,
  revisar: 0,
  puladas: 0,
  erros: 0,
  avisos: 0,
  linhas_apagadas_em: null,
};
const pendente = {
  id: "l-1",
  numero: 5,
  status: "revisar",
  motivo: "MATCH_PHONE_DIFFERS",
  normalizado: { nome: "Ana" },
  detalhe: {
    casouPor: "email",
    telefoneAtual: "+5564999446816",
    telefoneDoArquivo: "+5511988887777",
    contato: {
      id: "c",
      nome: "Ana",
      email: "a@x.com",
      telefone: null,
      casouPor: "email",
      whatsapp: false,
    },
    avisos: {},
  },
  resolucoes: {},
  mensagem: null,
  com_aviso: false,
};

beforeEach(() => {
  estado.importacao = { data: imp, isLoading: false, isError: false, refetch: vi.fn() };
  estado.linhas = {
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
});

describe("Revisar pendências quando a consulta falha (Q5, B5-6/B5-8)", () => {
  it("B5-6: erro ao ler as linhas mostra a falha e 'Tentar de novo', não 'Tudo revisado!'", () => {
    const refetch = vi.fn();
    estado.linhas = {
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    };
    render(<RevisarPendencias id="i" />);
    expect(screen.queryByText("Tudo revisado!")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as pendências.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("B5-8: lista local vazia mas a importação ainda tem pendências: busca de novo e espera, sem dizer 'Tudo revisado!'", () => {
    const refetch = vi.fn(() => new Promise(() => undefined));
    estado.importacao = {
      data: { ...imp, revisar: 40 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    estado.linhas = { data: [], isLoading: false, isError: false, isFetching: false, refetch };
    const { rerender } = render(<RevisarPendencias id="i" />);
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Tudo revisado!")).not.toBeInTheDocument();
    // enquanto a busca roda, segue "Carregando"; a busca devolveu vazio de novo: não repete.
    estado.linhas = { data: [], isLoading: false, isError: false, isFetching: true, refetch };
    rerender(<RevisarPendencias id="i" />);
    expect(screen.queryByText("Tudo revisado!")).not.toBeInTheDocument();
    estado.linhas = { data: [], isLoading: false, isError: false, isFetching: false, refetch };
    rerender(<RevisarPendencias id="i" />);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("sem pendências na importação, esvaziar a lista é 'Tudo revisado!'", () => {
    estado.linhas = {
      data: [],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    };
    render(<RevisarPendencias id="i" />);
    expect(screen.getByText("Tudo revisado!")).toBeInTheDocument();
  });

  it("com linhas carregadas não faz busca extra", () => {
    const refetch = vi.fn();
    estado.importacao = {
      data: { ...imp, revisar: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    estado.linhas = {
      data: [pendente],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch,
    };
    render(<RevisarPendencias id="i" />);
    expect(refetch).not.toHaveBeenCalled();
  });
});

describe("Relatório da importação quando a consulta falha (Q5, B5-7)", () => {
  it("erro ao ler as linhas não diz 'sem ressalvas'", () => {
    estado.linhas = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    render(<RelatorioDaImportacao id="i" />);
    expect(screen.queryByText(/sem ressalvas/)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as linhas da importação.",
    );
  });

  it("erro de rede ao ler a importação não vira 'não encontrada'", () => {
    estado.importacao = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("rede"),
      refetch: vi.fn(),
    };
    render(<RelatorioDaImportacao id="i" />);
    expect(screen.queryByText("Importação não encontrada.")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a importação.");
  });

  it("404 de verdade continua 'não encontrada'", () => {
    estado.importacao = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError(404, "not_found", undefined, "r"),
      refetch: vi.fn(),
    };
    render(<RelatorioDaImportacao id="i" />);
    expect(screen.getByText("Importação não encontrada.")).toBeInTheDocument();
  });
});
