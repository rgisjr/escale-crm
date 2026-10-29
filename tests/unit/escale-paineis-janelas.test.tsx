import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaInformacoesDoPainel } from "@/components/escale/indicadores/lista/JanelaInformacoesDoPainel";
import { JanelaNovoDashboard } from "@/components/escale/indicadores/lista/JanelaNovoDashboard";
import { ApiError } from "@/lib/api/types";
import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const U1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
vi.mock("@/hooks/team/useTeamMembers", () => ({
  useTeamMembers: () => ({
    data: {
      data: [{ user_id: U1, full_name: "Ana", email: "a@x.com", accepted_at: "2026-01-01", revoked_at: null }],
    },
  }),
}));
const estado = vi.hoisted(() => ({ criarPendente: false }));
const criar = vi.fn();
const editar = vi.fn();
vi.mock("@/hooks/escale/useModelosDeIndicadores", () => ({
  useModelos: () => ({ isLoading: false, isError: false, data: [], refetch: () => undefined }),
  useAcoesDosModelos: () => ({
    tornarTemplate: { mutate: vi.fn(), isPending: false },
    usar: { mutate: vi.fn(), isPending: false },
    excluirTemplate: { mutate: vi.fn(), isPending: false },
  }),
}));
vi.mock("@/hooks/escale/useOpcoesDaDimensao", () => ({ useOpcoesDaDimensao: () => ({ data: [] }) }));
vi.mock("@/hooks/escale/usePaineisDaCasca", () => ({
  useAcoesDosPaineis: () => ({
    criar: { mutate: criar, isPending: estado.criarPendente },
    editar: { mutate: editar, isPending: false },
  }),
}));

import { toast } from "sonner";

const painel: PainelDaLista = {
  id: "p1",
  nome: "Vendas",
  cor: "marca",
  icone: "briefcase",
  criadoEm: "2026-07-07T02:00:00Z",
  padrao: false,
  permissoesUsuarios: [],
  permissoesPapeis: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  estado.criarPendente = false;
});

describe("Novo dashboard (10-005)", () => {
  it("mostra as categorias, a busca e o vazio, sem Meta", () => {
    render(<JanelaNovoDashboard aberta aoFechar={() => undefined} />);
    expect(screen.getByRole("button", { name: "Todos os modelos" }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("button", { name: "Meus templates" })).toBeTruthy();
    expect(screen.getByText("Selecione um modelo")).toBeTruthy();
    expect(screen.getByPlaceholderText("Buscar")).toBeTruthy();
    expect(screen.getByText("Nenhum template encontrado")).toBeTruthy();
    expect(screen.queryByText("Meta")).toBeNull();
  });

  it("em branco cria e abre o painel", async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    criar.mockImplementation((_v: unknown, o: { onSuccess: (r: { id: string }) => void }) => o.onSuccess({ id: "p1" }));
    render(<JanelaNovoDashboard aberta aoFechar={aoFechar} />);
    await user.click(screen.getByRole("button", { name: "+ Novo dashboard em branco" }));
    expect(criar).toHaveBeenCalled();
    expect(aoFechar).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/app/metrics/p1");
  });

  it("o botão fica desabilitado enquanto grava", () => {
    estado.criarPendente = true;
    render(<JanelaNovoDashboard aberta aoFechar={() => undefined} />);
    expect(screen.getByRole("button", { name: "+ Novo dashboard em branco" })).toHaveProperty("disabled", true);
  });
});

describe("Informações do Dashboard (10-003, 10-004)", () => {
  const salvar = () => screen.getByRole("button", { name: "Salvar" });

  it("abre na aba Geral; Salvar segue o nome", async () => {
    const user = userEvent.setup();
    render(<JanelaInformacoesDoPainel painel={painel} aoFechar={() => undefined} />);
    const nome = screen.getByRole("textbox", { name: "Nome" });
    expect((nome as HTMLInputElement).value).toBe("Vendas");
    expect(salvar()).toHaveProperty("disabled", true);
    await user.type(nome, "!");
    expect(salvar()).toHaveProperty("disabled", false);
    await user.clear(nome);
    expect(salvar()).toHaveProperty("disabled", true);
  });

  it("tem 22 cores e 43 ícones; cor e sem ícone mudam a prévia", async () => {
    const user = userEvent.setup();
    render(<JanelaInformacoesDoPainel painel={painel} aoFechar={() => undefined} />);
    const cores = screen.getAllByRole("button", { name: /^Cor / });
    expect(cores).toHaveLength(22);
    expect(screen.getAllByRole("button", { pressed: false }).length + screen.getAllByRole("button", { pressed: true }).length).toBe(65);
    await user.click(screen.getByRole("button", { name: "Cor 10" }));
    expect(screen.getByTestId("quadrado-do-painel").getAttribute("style")).toContain("rgb(255, 64, 98)");
    await user.click(screen.getByRole("button", { name: "Sem ícone" }));
    expect(screen.getByTestId("quadrado-do-painel").textContent).toBe("V");
  });

  it("Salvar manda só o nome e avisa com o texto da Clint", async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    editar.mockImplementation((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    render(<JanelaInformacoesDoPainel painel={painel} aoFechar={aoFechar} />);
    await user.type(screen.getByRole("textbox", { name: "Nome" }), " 2");
    await user.click(salvar());
    expect(editar).toHaveBeenCalledWith({ id: "p1", edicao: { nome: "Vendas 2" } }, expect.anything());
    expect(toast.success).toHaveBeenCalledWith("Dashboard editado com sucesso!");
    expect(aoFechar).toHaveBeenCalled();
  });

  it("Permissões: usuários e papéis, contagem, chip e toast de permissão", async () => {
    const user = userEvent.setup();
    editar.mockImplementation((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    render(<JanelaInformacoesDoPainel painel={painel} aoFechar={() => undefined} />);
    await user.click(screen.getByRole("tab", { name: "Permissões" }));
    expect(screen.getByText("Usuários")).toBeTruthy();
    expect(screen.getByText("Papéis")).toBeTruthy();
    expect(screen.getByText("Selecione os usuários que poderão visualizar o dashboard")).toBeTruthy();
    expect(screen.getByText("Selecione os papéis que poderão visualizar o dashboard")).toBeTruthy();

    await user.click(screen.getByRole("combobox", { name: "Papéis" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    for (const papel of ["Atendente", "Gerente", "Administrador"]) {
      expect(screen.getByRole("checkbox", { name: papel })).toBeTruthy();
    }
    expect(screen.queryByRole("checkbox", { name: "Somente leitura" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Assistente com autonomia de operação" })).toBeNull();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("combobox", { name: "Usuários" }));
    await user.click(screen.getByRole("checkbox", { name: "Ana" }));
    await user.keyboard("{Escape}");
    expect(screen.getByText("1 usuário selecionado")).toBeTruthy();
    expect(screen.getByTestId("chip-da-marca").textContent).toBe("Ana");

    await user.click(salvar());
    expect(editar).toHaveBeenCalledWith({ id: "p1", edicao: { permissoesUsuarios: [U1] } }, expect.anything());
    expect(toast.success).toHaveBeenCalledWith("As configurações de permissão foram salvas com sucesso!");
  });

  it("422 mostra a mensagem da rota", async () => {
    const user = userEvent.setup();
    editar.mockImplementation((_v: unknown, o: { onError: (e: unknown) => void }) =>
      o.onError(new ApiError(422, "validation_failed", undefined, "r", "Inclua você ou o seu papel para continuar vendo este dashboard.")),
    );
    render(<JanelaInformacoesDoPainel painel={painel} aoFechar={() => undefined} />);
    await user.type(screen.getByRole("textbox", { name: "Nome" }), "x");
    await user.click(salvar());
    expect(toast.error).toHaveBeenCalledWith("Inclua você ou o seu papel para continuar vendo este dashboard.");
  });

  it("Cancelar fecha sem gravar", async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    render(<JanelaInformacoesDoPainel painel={painel} aoFechar={aoFechar} />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(aoFechar).toHaveBeenCalled();
    expect(editar).not.toHaveBeenCalled();
  });
});
