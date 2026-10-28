import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IndicadoresDaCasca } from "@/components/escale/indicadores/lista/IndicadoresDaCasca";
import { ApiError } from "@/lib/api/types";
import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/team/useTeamMembers", () => ({ useTeamMembers: () => ({ data: { data: [] } }) }));

const estado = vi.hoisted(() => ({
  lista: { isPending: false, isError: false, data: [] as unknown[], refetch: () => undefined },
}));
const duplicar = vi.fn();
const excluir = vi.fn();
const parada = { mutate: vi.fn(), isPending: false };
vi.mock("@/hooks/escale/usePaineisDaCasca", () => ({
  usePaineis: () => estado.lista,
  useAcoesDosPaineis: () => ({
    criar: parada,
    editar: parada,
    duplicar: { mutate: duplicar, isPending: false },
    excluir: { mutate: excluir, isPending: false },
  }),
}));

import { toast } from "sonner";

const SP = "America/Sao_Paulo";
const painel = (extra: Partial<PainelDaLista> = {}): PainelDaLista => ({
  id: "p1",
  nome: "Vendas",
  cor: "marca",
  icone: "briefcase",
  criadoEm: "2026-07-07T02:00:00Z",
  padrao: false,
  permissoesUsuarios: [],
  permissoesPapeis: [],
  ...extra,
});

function comLista(paineis: PainelDaLista[], extra: Partial<typeof estado.lista> = {}) {
  estado.lista = { isPending: false, isError: false, data: paineis, refetch: () => undefined, ...extra };
}

beforeEach(() => {
  vi.clearAllMocks();
  comLista([]);
});

describe("lista de painéis (10-001)", () => {
  it("carregando mostra 6 esqueletos", () => {
    comLista([], { isPending: true, data: undefined as never });
    render(<IndicadoresDaCasca papel="agent" fuso={SP} />);
    expect(screen.getAllByTestId("esqueleto-do-painel")).toHaveLength(6);
  });

  it("vazio mostra os dois textos", () => {
    render(<IndicadoresDaCasca papel="agent" fuso={SP} />);
    expect(screen.getByText("Você ainda não criou um Dashboard.")).toBeTruthy();
    expect(screen.getByText("Crie seu primeiro dashboard e acompanhe os seus indicadores com números e gráficos.")).toBeTruthy();
  });

  it("ordena os cards e mostra a data no fuso da organização", () => {
    comLista([painel({ id: "z", nome: "Zeta" }), painel({ id: "a", nome: "Ágil" }), painel({ id: "g", nome: "Gerência" })]);
    render(<IndicadoresDaCasca papel="agent" fuso={SP} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent?.split("Criado")[0])).toEqual(["Ágil", "Gerência", "Zeta"]);
    expect(links[0]?.getAttribute("href")).toBe("/app/metrics/a");
    expect(screen.getAllByText("Criado em 06/07/2026")).toHaveLength(3);
  });

  it("busca sem acento filtra, e sem resultado avisa", async () => {
    const user = userEvent.setup();
    comLista([painel({ id: "g", nome: "Gerência" }), painel({ id: "v", nome: "Vendas" })]);
    render(<IndicadoresDaCasca papel="agent" fuso={SP} />);
    await user.type(screen.getByPlaceholderText("Buscar dashboard"), "GER");
    expect(screen.getAllByRole("link").map((l) => l.textContent?.split("Criado")[0])).toEqual(["Gerência"]);
    await user.type(screen.getByPlaceholderText("Buscar dashboard"), "xyz");
    expect(screen.getByText("Nenhum dashboard encontrado.")).toBeTruthy();
  });

  it("quadrado com sem ícone mostra as iniciais; a marca usa a cor da organização", () => {
    comLista([painel({ icone: "nenhum", nome: "Visão geral" })]);
    render(<IndicadoresDaCasca papel="agent" fuso={SP} />);
    const quadrado = screen.getByTestId("quadrado-do-painel");
    expect(quadrado.textContent).toBe("VG");
    expect(quadrado.getAttribute("style")).toContain("var(--color-casca-marca)");
  });

  it("agente não vê os botões nem o ⋮", () => {
    comLista([painel()]);
    render(<IndicadoresDaCasca papel="agent" fuso={SP} />);
    expect(screen.queryByText("Novo chart")).toBeNull();
    expect(screen.queryByRole("button", { name: "Novo dashboard" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Opções do dashboard" })).toBeNull();
  });

  it("gerente vê os botões; Novo chart leva ao editor", () => {
    comLista([painel()]);
    render(<IndicadoresDaCasca papel="manager" fuso={SP} />);
    expect(screen.getByRole("link", { name: "Novo chart" }).getAttribute("href")).toBe("/app/metrics/explorar");
    expect(screen.getByRole("button", { name: "Novo dashboard" })).toBeTruthy();
  });
});

describe("menu ⋮ (10-002)", () => {
  it("tem Duplicar, Editar e Excluir, nessa ordem, sem Tornar template", async () => {
    const user = userEvent.setup();
    comLista([painel()]);
    render(<IndicadoresDaCasca papel="manager" fuso={SP} />);
    await user.click(screen.getByRole("button", { name: "Opções do dashboard" }));
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Duplicar", "Editar", "Excluir"]);
    await user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
    expect(duplicar).toHaveBeenCalledWith("p1", expect.anything());
    expect(push).not.toHaveBeenCalled();
  });

  it("painel padrão não tem Excluir", async () => {
    const user = userEvent.setup();
    comLista([painel({ padrao: true })]);
    render(<IndicadoresDaCasca papel="manager" fuso={SP} />);
    await user.click(screen.getByRole("button", { name: "Opções do dashboard" }));
    expect(screen.queryByRole("menuitem", { name: "Excluir" })).toBeNull();
  });

  it("Excluir pede confirmação e mostra o texto da Clint no 409", async () => {
    const user = userEvent.setup();
    excluir.mockImplementation((_id: string, o: { onError: (e: unknown) => void }) =>
      o.onError(new ApiError(409, "conflict", undefined, "r1", "x")),
    );
    comLista([painel()]);
    render(<IndicadoresDaCasca papel="manager" fuso={SP} />);
    await user.click(screen.getByRole("button", { name: "Opções do dashboard" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    const janela = await screen.findByRole("dialog");
    expect(within(janela).getByText("Excluir Dashboard")).toBeTruthy();
    expect(within(janela).getByText("Tem certeza que deseja excluir o dashboard selecionado?")).toBeTruthy();
    await user.click(within(janela).getByRole("button", { name: "Excluir" }));
    expect(excluir).toHaveBeenCalledWith("p1", expect.anything());
    expect(toast.error).toHaveBeenCalledWith("Não é possível excluir um dashboard padrão ou template.");
  });

  it("Editar abre Informações do Dashboard", async () => {
    const user = userEvent.setup();
    comLista([painel()]);
    render(<IndicadoresDaCasca papel="manager" fuso={SP} />);
    await user.click(screen.getByRole("button", { name: "Opções do dashboard" }));
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(await screen.findByText("Informações do Dashboard")).toBeTruthy();
  });
});
