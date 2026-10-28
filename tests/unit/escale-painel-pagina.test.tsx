import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  graficos: { valor: { isPending: false, isError: false, data: [] as unknown[], refetch: vi.fn() } },
  paineis: { valor: { data: undefined as unknown } },
  grade: vi.fn(),
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/escale/useGraficosDoPainel", () => ({ useGraficosDoPainel: () => mocks.graficos.valor }));
vi.mock("@/hooks/escale/usePaineisDaCasca", () => ({ usePaineis: () => mocks.paineis.valor }));
vi.mock("@/hooks/escale/usePreferenciasDoPainel", () => ({
  usePreferenciasDoPainel: () => ({
    pronto: true,
    filtro: { periodo: { atalho: "este_mes" } },
    filtroSalvoId: null,
    faixaAberta: false,
    intervalo: null,
    mudarFiltro: vi.fn(),
    aplicarSalvo: vi.fn(),
    aplicarPadrao: vi.fn(),
    alternarFaixa: vi.fn(),
    mudarIntervalo: vi.fn(),
  }),
}));
vi.mock("@/components/escale/indicadores/painel/BarraDeFiltrosDoPainel", () => ({
  BarraDeFiltrosDoPainel: () => <div data-testid="barra" />,
}));
vi.mock("@/components/escale/indicadores/painel/CabecalhoDoPainel", () => ({
  CabecalhoDoPainel: ({ painel, aoAtualizar }: { painel: { nome: string }; aoAtualizar: () => void }) => (
    <header>
      <h1>{painel.nome}</h1>
      <button type="button" onClick={aoAtualizar}>
        atualizar
      </button>
    </header>
  ),
}));
vi.mock("@/components/escale/indicadores/painel/GradeDoPainel", () => ({
  GradeDoPainel: (p: { graficos: unknown[]; rodada: number; filtro: unknown }) => {
    mocks.grade(p);
    return <div data-testid="grade">{p.graficos.length} cards</div>;
  },
}));

import { PainelDaCasca } from "@/components/escale/indicadores/painel/PainelDaCasca";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";

const PAINEL: PainelDaLista = {
  id: "p1",
  nome: "Vendas",
  cor: "marca",
  icone: "briefcase",
  criadoEm: "2026-07-07",
  padrao: false,
  permissoesUsuarios: [],
  permissoesPapeis: [],
};
const OPCOES = { origens: [] } as unknown as OpcoesDoFiltro;
const montar = () => render(<PainelDaCasca painel={PAINEL} papel="manager" fuso="America/Sao_Paulo" userId="u1" opcoesDoFiltro={OPCOES} />);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.graficos.valor = { isPending: false, isError: false, data: [], refetch: vi.fn() };
  mocks.paineis.valor = { data: undefined };
});

describe("PainelDaCasca", () => {
  it("carregando: 5 esqueletos", () => {
    mocks.graficos.valor = { ...mocks.graficos.valor, isPending: true };
    montar();
    expect(screen.getAllByTestId("esqueleto")).toHaveLength(5);
  });
  it("sem gráficos: cabeçalho, barra e área vazia, sem grade", () => {
    montar();
    expect(screen.getByText("Vendas")).toBeTruthy();
    expect(screen.getByTestId("barra")).toBeTruthy();
    expect(screen.queryByTestId("grade")).toBeNull();
  });
  it("com 3 gráficos: a grade com os 3", () => {
    mocks.graficos.valor = { ...mocks.graficos.valor, data: [{}, {}, {}] };
    montar();
    expect(screen.getByText("3 cards")).toBeTruthy();
  });
  it("erro ao ler os gráficos: Tentar de novo", async () => {
    mocks.graficos.valor = { ...mocks.graficos.valor, isError: true };
    montar();
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(mocks.graficos.valor.refetch).toHaveBeenCalled();
  });
  it("Atualizar soma a rodada que chega à grade", async () => {
    mocks.graficos.valor = { ...mocks.graficos.valor, data: [{}] };
    montar();
    expect(mocks.grade.mock.calls.at(-1)?.[0].rodada).toBe(0);
    await userEvent.setup().click(screen.getByRole("button", { name: "atualizar" }));
    expect(mocks.grade.mock.calls.at(-1)?.[0].rodada).toBe(1);
  });
  it("o nome vem da lista de painéis quando editado", () => {
    mocks.paineis.valor = { data: [{ ...PAINEL, nome: "Vendas 2026" }] };
    montar();
    expect(screen.getByText("Vendas 2026")).toBeTruthy();
  });
});
