import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const estado = vi.hoisted(() => ({
  refetchCampanha: vi.fn(),
  refetchConfig: vi.fn(),
}));
const parado = { data: undefined, isLoading: false, isError: false };
vi.mock("@/hooks/campanhas/useCampanhas", () => ({
  useCampanha: () => ({ data: undefined, isLoading: false, isError: true, refetch: estado.refetchCampanha }),
  useEditarCampanha: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePreviaDaAudiencia: () => ({ mutateAsync: vi.fn(), isPending: false, data: undefined }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => parado,
  channelLabel: () => "",
}));
vi.mock("@/hooks/campanhas/useDestinoDaCampanha", () => ({
  useFunis: () => parado,
  useEtapas: () => parado,
  useAgentesPublicados: () => parado,
}));
vi.mock("@/hooks/campanhas/useConfiguracao", () => ({
  useConfiguracaoDeCampanhas: () => ({ data: undefined, isLoading: false, isError: true, refetch: estado.refetchConfig }),
  useSalvarConfiguracao: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useApagarTexto: () => ({ mutate: vi.fn() }),
  useExclusoes: () => parado,
  useExcluirNumero: () => ({ mutate: vi.fn() }),
  useSalvarTexto: () => ({ mutate: vi.fn() }),
  useTextosSalvos: () => parado,
  useTirarDaExclusao: () => ({ mutate: vi.fn() }),
}));

import { EditarCampanha } from "@/app/app/campaigns/[id]/edit/_client";
import { ConfiguracaoDeCampanhas } from "@/app/app/campaigns/settings/_client";

/** FORK ESCALE · Q0b (B6-1, B6-2): consulta com erro não pode ficar em esqueleto para sempre. */
beforeEach(() => vi.clearAllMocks());

describe("telas de campanha com erro ao carregar (Q0b)", () => {
  it("B6-1: editar campanha mostra o erro e 'Tentar de novo' refaz a consulta", () => {
    render(<EditarCampanha id="c1" />);
    expect(screen.getByText("Não foi possível carregar a campanha.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(estado.refetchCampanha).toHaveBeenCalledTimes(1);
  });

  it("B6-2: configuração de campanhas mostra o erro dos padrões e 'Tentar de novo' refaz a consulta", () => {
    render(<ConfiguracaoDeCampanhas />);
    expect(screen.getByText("Não foi possível carregar os padrões.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(estado.refetchConfig).toHaveBeenCalledTimes(1);
  });
});
