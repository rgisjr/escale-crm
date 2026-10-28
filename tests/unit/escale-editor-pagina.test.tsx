import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const org = { papel: "manager" as string };
  return {
    cookie: { valor: undefined as string | undefined },
    org,
    redirect: (url: string): never => {
      throw new Error(`REDIRECT ${url}`);
    },
    resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: org.papel, name: "Org", timezone: "America/Recife" })),
    lerPainel: vi.fn(),
    lerGrafico: vi.fn(),
    resultado: vi.fn(),
    salvar: vi.fn(),
  };
});
const { cookie, org, lerPainel, lerGrafico } = h;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (h.cookie.valor ? { value: h.cookie.valor } : undefined) }),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => h.redirect(u), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth/server", () => ({ requireAuth: async () => ({ id: "u1" }), resolveActiveOrg: h.resolveActiveOrg }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/escale/indicadores/paineis/banco", () => ({ lerPainel: h.lerPainel }));
vi.mock("@/lib/escale/indicadores/graficos/banco", () => ({ lerGrafico: h.lerGrafico }));
vi.mock("@/hooks/escale/useCatalogoDeIndicadores", async () => {
  const { CATALOGO_FALSO } = await import("@/tests/helpers/catalogo-da-tela");
  return { useCatalogoDeIndicadores: () => ({ data: CATALOGO_FALSO, isError: false, refetch: vi.fn() }) };
});
vi.mock("@/hooks/escale/useOpcoesDaDimensao", () => ({
  useOpcoesDaDimensao: () => ({ isLoading: false, data: [{ valor: "e1", rotulo: "Novo" }] }),
}));
vi.mock("@/hooks/escale/useResultadoDoGrafico", () => ({
  useResultadoDoGrafico: (a: unknown) => {
    h.resultado(a);
    return { data: undefined, isFetching: false, error: null };
  },
}));
vi.mock("@/components/escale/indicadores/editor/JanelaSalvarChart", () => ({
  JanelaSalvarChart: ({ conteudo }: { conteudo: () => unknown }) => {
    h.salvar(conteudo());
    return <div role="dialog">Salvar chart</div>;
  },
}));

import NovoChartPage from "@/app/app/metrics/explorar/page";
import EditarChartPage from "@/app/app/metrics/explorar/[id]/page";
import { EditorDeGrafico } from "@/components/escale/indicadores/editor/EditorDeGrafico";

const P1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const G1 = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const PAINEL = { id: P1, nome: "Gerência", cor: "marca", icone: "briefcase", criadoEm: "x", padrao: false, permissoesUsuarios: [], permissoesPapeis: [] };
const novo = (painel?: string) => NovoChartPage({ searchParams: Promise.resolve(painel ? { painel } : {}) }) as Promise<ReactElement<Record<string, unknown>>>;
const editar = (id: string) => EditarChartPage({ params: Promise.resolve({ id }) }) as Promise<ReactElement<Record<string, unknown>>>;

beforeEach(() => {
  vi.clearAllMocks();
  cookie.valor = undefined;
  org.papel = "manager";
  lerPainel.mockResolvedValue(PAINEL);
});

describe("páginas do editor", () => {
  it("sem a casca volta para a lista; agente também", async () => {
    cookie.valor = "lateral";
    await expect(novo()).rejects.toThrow("REDIRECT /app/metrics");
    cookie.valor = undefined;
    org.papel = "agent";
    await expect(novo()).rejects.toThrow("REDIRECT /app/metrics");
    await expect(editar(G1)).rejects.toThrow("REDIRECT /app/metrics");
  });

  it("gerente abre o editor novo; ?painel= válido passa o painel; lixo abre sem painel", async () => {
    const el = await novo(P1);
    expect(el.type).toBe(EditorDeGrafico);
    expect(el.props).toMatchObject({ modo: "novo", grafico: null, painelDeOrigem: PAINEL });
    expect((await novo("lixo")).props).toMatchObject({ painelDeOrigem: null });
  });

  it("editar: id inválido ou gráfico inexistente redirecionam; gráfico lido abre com o painel dele", async () => {
    await expect(editar("lixo")).rejects.toThrow("REDIRECT /app/metrics");
    lerGrafico.mockResolvedValue(null);
    await expect(editar(G1)).rejects.toThrow("REDIRECT /app/metrics");
    const grafico = { id: G1, painelId: P1, nome: "Meu", descricao: null, tipo: "barra", layout: { x: 0, y: 0, w: 12, h: 8 }, pergunta: {}, opcoes: {} };
    lerGrafico.mockResolvedValue(grafico);
    const el = await editar(G1);
    expect(el.props).toMatchObject({ modo: "editar", grafico, painelDeOrigem: PAINEL });
  });
});

describe("editor montado", () => {
  it("fluxo: indicador, variável, filtro, Barra, Executar com a pergunta completa e filtro do painel vazio", async () => {
    const user = userEvent.setup();
    render(<EditorDeGrafico modo="novo" grafico={null} painelDeOrigem={PAINEL} papel="manager" />);
    // indicador
    await user.click(screen.getAllByRole("button", { name: "Adicionar indicador" })[0]!);
    await user.click(screen.getByRole("button", { name: /^Negócio ·/ }));
    await user.click(screen.getByRole("button", { name: /^Quantidade/ }));
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await user.keyboard("{Escape}");
    expect(screen.getByText("Negócio Quantidade")).toBeInTheDocument();
    expect(screen.getByText("Negócio Data de criação")).toBeInTheDocument();
    // variável
    await user.click(screen.getByRole("button", { name: "Adicionar variável" }));
    await user.click(screen.getByRole("button", { name: /^Negócio ·/ }));
    await user.click(screen.getByRole("button", { name: /^Origem/ }));
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await user.keyboard("{Escape}");
    // tipo
    await user.click(screen.getByRole("combobox", { name: "Tipo" }));
    await user.click(within_option("Barra"));
    // Executar
    expect(h.resultado.mock.calls.at(-1)?.[0]).toMatchObject({ pergunta: null, ligado: false });
    await user.click(screen.getByRole("button", { name: "Executar" }));
    const chamada = h.resultado.mock.calls.at(-1)?.[0];
    expect(chamada).toMatchObject({ filtro: {}, ligado: true, rodada: 0 });
    expect(chamada.pergunta).toMatchObject({ indicadores: ["negocio.quantidade"], variaveis: ["negocio.origem"] });
    // salvar
    await user.click(screen.getByRole("button", { name: "Adicionar ao dashboard" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(h.salvar.mock.calls.at(-1)?.[0]).toMatchObject({ tipo: "barra" });
  });

  it("Adicionar ao dashboard sem indicador não abre o modal e marca a seção", async () => {
    const user = userEvent.setup();
    render(<EditorDeGrafico modo="novo" grafico={null} painelDeOrigem={null} papel="manager" />);
    await user.click(screen.getByRole("button", { name: "Adicionar ao dashboard" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("campo obrigatório")).toBeInTheDocument();
  });

  it("editar reabre os chips, o tipo e a prévia roda uma vez", () => {
    const grafico = {
      id: G1,
      painelId: P1,
      nome: "Meu chart",
      descricao: null,
      tipo: "barra",
      layout: { x: 0, y: 0, w: 12, h: 8 },
      pergunta: { indicadores: ["negocio.quantidade"], variaveis: ["negocio.origem"] },
      opcoes: {},
    };
    render(<EditorDeGrafico modo="editar" grafico={grafico} painelDeOrigem={PAINEL} papel="manager" />);
    expect(screen.getByRole("heading", { name: "Meu chart" })).toBeInTheDocument();
    expect(screen.getByText("Negócio Quantidade")).toBeInTheDocument();
    expect(screen.getByText("Negócio Origem")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Tipo" })).toHaveTextContent("Barra");
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeInTheDocument();
    expect(h.resultado.mock.calls.at(-1)?.[0]).toMatchObject({ graficoId: G1, ligado: true });
  });
});

function within_option(nome: string): HTMLElement {
  const opcao = screen.getByRole("option", { name: nome });
  return opcao.querySelector("button") as HTMLElement;
}
