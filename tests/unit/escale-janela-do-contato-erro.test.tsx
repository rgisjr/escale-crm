import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const estado = vi.hoisted(() => ({
  refetch: vi.fn(),
  erro: null as unknown,
}));
vi.mock("@/hooks/contacts/useContact", () => ({
  useContact: () => ({
    data: undefined,
    isLoading: false,
    isError: estado.erro !== null,
    error: estado.erro,
    refetch: estado.refetch,
  }),
}));
vi.mock("@/hooks/escale/useFichaDeNegociosDoContato", () => ({
  useFichaDeNegociosDoContato: () => ({ data: undefined }),
}));
vi.mock("@/hooks/escale/useEmpresaDoContato", () => ({ useEmpresaDoContato: () => ({ data: null }) }));
vi.mock("@/hooks/escale/useConversasDoContato", () => ({ useConversasDoContato: () => ({ data: [] }) }));
vi.mock("@/hooks/escale/useSugestoesDeMescla", () => ({ useSugestaoDoContato: () => null }));

import { JanelaDoContato } from "@/components/escale/contatos/ficha/JanelaDoContato";
import { ApiError } from "@/lib/api/types";

/** FORK ESCALE · Q0b (B3-2): erro que não é 404 não pode deixar o esqueleto para sempre. */
const props = {
  contatoId: "c1",
  aba: "contato" as const,
  aoMudarAba: vi.fn(),
  aoTrocarContato: vi.fn(),
  aoFechar: vi.fn(),
  podeCriarNegocio: true,
  podeMesclar: false,
  aoAdicionarNegocio: vi.fn(),
  aoRevisarDuplicado: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  estado.erro = null;
});

describe("JanelaDoContato com erro ao carregar (Q0b, B3-2)", () => {
  it("erro 500 mostra o aviso e 'Tentar de novo' refaz a consulta", () => {
    estado.erro = new ApiError(500, "internal", undefined, "r1", "falhou");
    render(<JanelaDoContato {...props} />);
    expect(screen.getByText("Não foi possível carregar o contato.")).toBeInTheDocument();
    expect(document.querySelector("[aria-busy]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(estado.refetch).toHaveBeenCalledTimes(1);
    expect(props.aoFechar).not.toHaveBeenCalled();
  });

  it("erro de rede (não ApiError) também mostra o aviso", () => {
    estado.erro = new Error("Failed to fetch");
    render(<JanelaDoContato {...props} />);
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("404 continua fechando a janela, sem o aviso", () => {
    estado.erro = new ApiError(404, "not_found", undefined, "r2", "não existe");
    render(<JanelaDoContato {...props} />);
    expect(props.aoFechar).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
  });
});
