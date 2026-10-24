import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistenteDeProspeccao } from "@/components/escale/prospeccao/assistente/AssistenteDeProspeccao";
import {
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { OPCOES } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));

/** FORK ESCALE · Q0b (B9-1): reconsulta que falha com dado em cache não desmonta o assistente. */
beforeEach(() => {
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: undefined, isError: false } as never);
});

describe("AssistenteDeProspeccao com a reconsulta falhando (Q0b, B9-1)", () => {
  it("com as opções em cache, o erro da reconsulta não apaga o rascunho digitado", async () => {
    vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES, isError: false } as never);
    const { rerender } = render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    const nome = screen.getByPlaceholderText("Ex: Clínicas de estética em Campinas");
    await userEvent.type(nome, "Clínicas Campinas");

    vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES, isError: true } as never);
    rerender(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);

    expect(screen.queryByText("Não foi possível carregar a prospecção.")).toBeNull();
    expect(screen.getByPlaceholderText("Ex: Clínicas de estética em Campinas")).toHaveValue(
      "Clínicas Campinas",
    );
  });

  it("sem nenhum dado, o erro continua aparecendo", () => {
    vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: undefined, isError: true } as never);
    render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    expect(screen.getByText("Não foi possível carregar a prospecção.")).toBeInTheDocument();
  });
});
