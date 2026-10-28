import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const U1 = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  salvos: { valor: [] as unknown[] },
  aplicarMudanca: vi.fn(),
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "11111111-1111-4111-8111-111111111111", full_name: "Rafa", role: "agent" }] }),
}));
vi.mock("@/hooks/escale/useGruposDasOrigens", () => ({ useGruposDasOrigens: () => ({ data: [{ id: "g1", nome: "Grupo A" }] }) }));
vi.mock("@/hooks/escale/useFiltrosDaLista", () => ({
  useFiltrosDaLista: () => ({ data: mocks.salvos.valor }),
  useCriarFiltroDaLista: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: "novo" }) }),
  useMudarFiltroDaLista: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useExcluirFiltroDaLista: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "o1" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: [] }) }));
vi.mock("@/components/escale/indicadores/lista/JanelaInformacoesDoPainel", () => ({
  JanelaInformacoesDoPainel: () => <div>Informações do Dashboard</div>,
}));

import { BarraDeFiltrosDoPainel } from "@/components/escale/indicadores/painel/BarraDeFiltrosDoPainel";
import { CabecalhoDoPainel } from "@/components/escale/indicadores/painel/CabecalhoDoPainel";
import { usePreferenciasDoPainel } from "@/hooks/escale/usePreferenciasDoPainel";
import type { Role } from "@/lib/auth/types";
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
const OPCOES: OpcoesDoFiltro = {
  origens: [{ id: "o9", nome: "Leads INSS", etapas: [] }],
  motivos: [],
  camposDoNegocio: [],
  camposDoContato: [],
  camposDaEmpresa: [],
};
const comQuery = (ui: ReactNode) => <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;

function cabecalho(papel: Role, total = 3, extra: Partial<Parameters<typeof CabecalhoDoPainel>[0]> = {}) {
  const aoAtualizar = vi.fn();
  const aoMudarIntervalo = vi.fn();
  render(
    comQuery(
      <CabecalhoDoPainel
        painel={PAINEL}
        papel={papel}
        total={total}
        intervalo={null}
        aoAtualizar={aoAtualizar}
        aoMudarIntervalo={aoMudarIntervalo}
        {...extra}
      />,
    ),
  );
  return { aoAtualizar, aoMudarIntervalo };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mocks.salvos.valor = [];
});

describe("CabecalhoDoPainel", () => {
  it("gerente vê o lápis, que abre as informações, e o Novo Chart com o endereço do editor", async () => {
    cabecalho("manager");
    expect(screen.getByText("Vendas")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Editar dashboard" }));
    expect(screen.getByText("Informações do Dashboard")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Novo Chart/ }).getAttribute("href")).toBe("/app/metrics/explorar?painel=p1");
  });
  it("agente não vê lápis nem Novo Chart", () => {
    cabecalho("agent");
    expect(screen.queryByRole("button", { name: "Editar dashboard" })).toBeNull();
    expect(screen.queryByText(/Novo Chart/)).toBeNull();
  });
  it("com 30 gráficos o Novo Chart não é link", () => {
    cabecalho("manager", 30);
    expect(screen.queryByRole("link", { name: /Novo Chart/ })).toBeNull();
    expect(screen.getByText(/Novo Chart/).closest("[aria-disabled='true']")).toBeTruthy();
  });
  it("Atualizar chama a ação; o ⋮ lista as 6 opções com check em Desativado e muda para 15 minutos", async () => {
    const { aoAtualizar, aoMudarIntervalo } = cabecalho("manager");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(aoAtualizar).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Opções" }));
    expect(screen.getByText("Atualizar a cada:")).toBeTruthy();
    const itens = screen.getAllByRole("menuitemradio");
    expect(itens.map((i) => i.textContent)).toEqual(["Desativado", "15 minutos", "30 minutos", "1 hora", "2 horas", "1 dia"]);
    expect(itens[0]?.getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByRole("menuitemradio", { name: "15 minutos" }));
    expect(aoMudarIntervalo).toHaveBeenCalledWith(15);
  });
});

function Harness() {
  const prefs = usePreferenciasDoPainel("p1");
  return <BarraDeFiltrosDoPainel prefs={prefs} opcoes={OPCOES} />;
}
const barra = () => render(comQuery(<Harness />));

describe("BarraDeFiltrosDoPainel", () => {
  it("padrão: seletor Este mês e Filtros com 1", () => {
    barra();
    expect(screen.getByRole("button", { name: /Este mês/ })).toBeTruthy();
    const filtros = screen.getByRole("button", { name: /Filtros/ });
    expect(within(filtros).getByText("1")).toBeTruthy();
  });

  it("o seletor mostra PADRÃO, Este mês, MEUS FILTROS e Criar filtro; aplicar um salvo muda o botão", async () => {
    mocks.salvos.valor = [
      { id: "s1", nome: "Time SDR", compartilhado: false, meu: true, criterios: { usuarios: [U1] } },
    ];
    barra();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Este mês/ }));
    expect(screen.getByText("Padrão")).toBeTruthy();
    expect(screen.getByText("Meus filtros")).toBeTruthy();
    expect(screen.getByText("Criar filtro")).toBeTruthy();
    await user.click(screen.getByText("Time SDR"));
    expect(screen.getByRole("button", { name: /Time SDR/ })).toBeTruthy();
  });

  it("Expandir filtros abre a faixa com o chip do período; × tira o chip e mostra Resetar; ^ recolhe", async () => {
    barra();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Expandir filtros" }));
    expect(screen.getByText("Esse mês")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Filtros/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Remover filtro Período" }));
    expect(screen.queryByText("Esse mês")).toBeNull();
    expect(screen.getByText("Resetar")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Recolher filtros" }));
    expect(screen.queryByText("Resetar")).toBeNull();
  });

  it("+ Filtro abre a Segmentação com o selo 1; escolher usuário aplica; Tags e Campos oferecem condições", async () => {
    barra();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Filtros/ }));
    expect(screen.getByText("Segmentação")).toBeTruthy();
    expect(screen.getByText("Selecione usuários")).toBeTruthy();
    expect(screen.getByText("Selecione grupos de origem")).toBeTruthy();
    expect(screen.getByText("Selecione origens")).toBeTruthy();
    await user.click(screen.getByText("Selecione usuários"));
    await user.click(screen.getByText("Rafa"));
    expect(JSON.parse(window.localStorage.getItem("escale:indicadores:filtro:p1") ?? "{}").filtro.usuarios).toEqual([U1]);
    await user.click(screen.getByRole("button", { name: "Tags" }));
    expect(screen.getByText("Adicionar condição")).toBeTruthy();
  });

  it("o chip do período abre só a Segmentação com Todos os filtros", async () => {
    barra();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Expandir filtros" }));
    await user.click(screen.getByRole("button", { name: "Período Esse mês" }));
    expect(screen.getByText("Todos os filtros")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tags" })).toBeNull();
  });
});
