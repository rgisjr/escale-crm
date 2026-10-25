import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistenteDeProspeccao } from "@/components/escale/prospeccao/assistente/AssistenteDeProspeccao";
import {
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { detalhe, ID, OPCOES } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));

/** FORK ESCALE · Q0c (B9-2): o detalhe interno (passos 3 e 4) que falha sem dado mostra erro, não "Carregando" eterno. */
const refetch = vi.fn();

beforeEach(() => {
  refetch.mockReset();
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES, isError: false } as never);
});

/** A 1ª chamada é a da casca de fora (com dado); as seguintes são a do detalhe interno. */
function detalheInternoFalha() {
  vi.mocked(useDetalheDaProspeccao)
    .mockReturnValueOnce({ data: detalhe({ status: "draft" }), isError: false } as never)
    .mockReturnValue({ data: undefined, isError: true, refetch } as never);
}

describe("AssistenteDeProspeccao com o detalhe interno falhando (Q0c, B9-2)", () => {
  it("sem dado, mostra a falha com Tentar novamente no lugar do Carregando", async () => {
    detalheInternoFalha();
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);

    expect(screen.queryByText("Carregando prospecção")).toBeNull();
    expect(screen.getByText("Não foi possível carregar a prospecção.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("sem erro e sem dado, continua Carregando", () => {
    vi.mocked(useDetalheDaProspeccao)
      .mockReturnValueOnce({ data: detalhe({ status: "draft" }), isError: false } as never)
      .mockReturnValue({ data: undefined, isError: false, refetch } as never);
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    expect(screen.getByText("Carregando prospecção")).toBeInTheDocument();
  });
});
