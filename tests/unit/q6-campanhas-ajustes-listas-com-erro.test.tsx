import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * B6-10: "Textos salvos" e "Lista de exclusão" não podem mostrar o vazio quando
 * a consulta falha.
 */
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const estado = vi.hoisted(() => ({ refetchTextos: vi.fn(), refetchExclusoes: vi.fn() }));
const mut = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
vi.mock("@/hooks/campanhas/useConfiguracao", () => ({
  useConfiguracaoDeCampanhas: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  }),
  useSalvarConfiguracao: () => mut,
  useApagarTexto: () => mut,
  useSalvarTexto: () => mut,
  useExcluirNumero: () => mut,
  useTirarDaExclusao: () => mut,
  useTextosSalvos: () => ({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch: estado.refetchTextos,
  }),
  useExclusoes: () => ({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch: estado.refetchExclusoes,
  }),
}));

import { ConfiguracaoDeCampanhas } from "@/app/app/campaigns/settings/_client";

afterEach(cleanup);

describe("ajustes de campanha com listas em erro", () => {
  it("mostra o erro de cada lista, com 'Tentar de novo', e não o vazio", () => {
    render(<ConfiguracaoDeCampanhas />);
    expect(screen.getByText("Não foi possível carregar os textos salvos.")).toBeInTheDocument();
    expect(screen.getByText("Não foi possível carregar a lista de exclusão.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum texto salvo ainda.")).toBeNull();
    expect(screen.queryByText("Nenhum número excluído.")).toBeNull();
    const botoes = screen.getAllByRole("button", { name: "Tentar de novo" });
    fireEvent.click(botoes[0]!);
    fireEvent.click(botoes[1]!);
    expect(estado.refetchTextos).toHaveBeenCalledTimes(1);
    expect(estado.refetchExclusoes).toHaveBeenCalledTimes(1);
  });
});
