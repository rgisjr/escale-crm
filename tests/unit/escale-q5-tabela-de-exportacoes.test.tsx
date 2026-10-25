import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  consulta: {} as Record<string, unknown>,
  intervalo: undefined as unknown,
}));
vi.mock("@/hooks/escale/useAcoesEmMassa", () => ({
  useAcoesEmMassa: (_ativo: boolean, intervalo: unknown) => {
    estado.intervalo = intervalo;
    return estado.consulta;
  },
}));
vi.mock("@/lib/i18n/IdiomaProvider", () => ({ useIdioma: () => "pt-BR" }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (x: string) => x }));

import { TabelaDeExportacoes } from "@/components/escale/importacao/TabelaDeExportacoes";

const exportacao = (status: string) => ({
  id: "a1",
  acao: "exportar",
  status,
  created_at: "2026-10-20T12:00:00Z",
  tem_arquivo: false,
});

beforeEach(() => {
  estado.consulta = { data: { minhas: [] }, isLoading: false, isError: false, refetch: vi.fn() };
});

describe("TabelaDeExportacoes (Q5, G5-3/B5-11)", () => {
  it("carregando não diz 'Nenhuma exportação ainda'", () => {
    estado.consulta = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() };
    render(<TabelaDeExportacoes />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma exportação ainda")).not.toBeInTheDocument();
  });

  it("erro mostra a falha e 'Tentar de novo'", () => {
    const refetch = vi.fn();
    estado.consulta = { data: undefined, isLoading: false, isError: true, refetch };
    render(<TabelaDeExportacoes />);
    expect(screen.queryByText("Nenhuma exportação ainda")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("só repete a consulta (5 s) com exportação sendo gerada", () => {
    render(<TabelaDeExportacoes />);
    const intervalo = estado.intervalo as (d: unknown) => number | false;
    expect(intervalo({ minhas: [] })).toBe(false);
    expect(intervalo({ minhas: [exportacao("concluida")] })).toBe(false);
    expect(intervalo({ minhas: [exportacao("aguardando_aprovacao")] })).toBe(false);
    for (const s of ["preparando", "na_fila", "processando"])
      expect(intervalo({ minhas: [exportacao(s)] })).toBe(5000);
  });
});
