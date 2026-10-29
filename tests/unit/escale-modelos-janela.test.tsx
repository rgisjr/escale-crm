import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaNovoDashboard } from "@/components/escale/indicadores/lista/JanelaNovoDashboard";
import { ApiError } from "@/lib/api/types";
import type { ModeloNaLista } from "@/lib/escale/indicadores/modelos/tipos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "o1" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: ["vip", "quente"] }) }));
vi.mock("@/hooks/escale/useOpcoesDaDimensao", () => ({
  useOpcoesDaDimensao: (dimensao: string | null) => ({
    data: dimensao === "negocio.dono" ? [{ valor: "u1", rotulo: "Ana" }, { valor: "u2", rotulo: "Bia" }] : [],
  }),
}));

const estado = vi.hoisted(() => ({
  modelos: { isLoading: false, isError: false, data: [] as unknown[], refetch: () => undefined },
}));
const usar = vi.fn();
const excluirTemplate = vi.fn();
const parada = { mutate: vi.fn(), isPending: false };
const usarEstado = vi.hoisted(() => ({ isPending: false }));
vi.mock("@/hooks/escale/useModelosDeIndicadores", () => ({
  useModelos: () => estado.modelos,
  useAcoesDosModelos: () => ({
    usar: { mutate: usar, get isPending() { return usarEstado.isPending; } },
    tornarTemplate: parada,
    excluirTemplate: { mutate: excluirTemplate, isPending: false },
  }),
}));
vi.mock("@/hooks/escale/usePaineisDaCasca", () => ({
  useAcoesDosPaineis: () => ({ criar: parada, editar: parada, duplicar: parada, excluir: parada }),
}));

import { toast } from "sonner";
import { showApiError } from "@/components/feedback/ApiErrorToast";

const sistema = (id: string, nome: string): ModeloNaLista =>
  ({ origem: "sistema", id, nome, cor: "marca", icone: "user", graficos: 9 }) as ModeloNaLista;
const template: ModeloNaLista = { origem: "organizacao", id: "t1", nome: "Beta", cor: "#263AF1", icone: "star", graficos: 3, criadoEm: "2026-10-28" };
const QUATRO = [
  sistema("conversao-de-vendas", "Conversão de vendas"),
  sistema("atendimentos", "Atendimentos"),
  sistema("produtividade-por-usuario", "Produtividade por usuário"),
  sistema("campanhas-de-whatsapp", "Campanhas de WhatsApp"),
];

function comModelos(data: ModeloNaLista[], extra: Partial<typeof estado.modelos> = {}) {
  estado.modelos = { isLoading: false, isError: false, data, refetch: () => undefined, ...extra };
}
const abrir = () => render(<JanelaNovoDashboard aberta aoFechar={() => undefined} />);

beforeEach(() => {
  vi.clearAllMocks();
  usarEstado.isPending = false;
  comModelos([...QUATRO, template]);
});

describe("grade de modelos (10-005, 10-017, 10-018)", () => {
  it("carregando mostra 5 esqueletos", () => {
    comModelos([], { isLoading: true });
    abrir();
    expect(screen.getAllByTestId("esqueleto-do-modelo")).toHaveLength(5);
  });

  it("'Todos os modelos' lista os 4 do sistema + o template em ordem alfabética, sem Meta", () => {
    abrir();
    const nomes = screen.getAllByRole("listitem").map((li) => li.textContent).filter((x) => /Atendimentos|Beta|Campanhas|Conversão|Produtividade/.test(x ?? ""));
    expect(nomes.map((n) => n?.replace(/Usar modelo/, "").trim())).toEqual([
      "Atendimentos",
      "Beta",
      "Campanhas de WhatsApp",
      "Conversão de vendas",
      "Produtividade por usuário",
    ]);
    expect(screen.queryByText("Meta")).toBeNull();
  });

  it("cada card tem o botão 'Usar modelo {nome}'; só o template tem ⋮ com Excluir", async () => {
    const user = userEvent.setup();
    abrir();
    expect(screen.getAllByRole("button", { name: /^Usar modelo / })).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "Opções do template" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Opções do template" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(screen.getByText("Tem certeza que deseja excluir o template selecionado?")).toBeTruthy();
  });

  it("Excluir → confirmação → excluirTemplate.mutate(id) → toast de sucesso", async () => {
    const user = userEvent.setup();
    excluirTemplate.mockImplementation((_id: string, o: { onSuccess: () => void }) => o.onSuccess());
    abrir();
    await user.click(screen.getByRole("button", { name: "Opções do template" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    const dialogo = screen.getByRole("dialog", { name: "Excluir template" });
    await user.click(within(dialogo).getByRole("button", { name: "Excluir" }));
    expect(excluirTemplate).toHaveBeenCalledWith("t1", expect.anything());
    expect(toast.success).toHaveBeenCalledWith("Template excluído com sucesso!");
  });

  it("'Meus templates' traz só o template; sem template mostra o vazio", async () => {
    const user = userEvent.setup();
    abrir();
    await user.click(screen.getByRole("button", { name: "Meus templates" }));
    expect(screen.getAllByRole("button", { name: /^Usar modelo / })).toHaveLength(1);
    comModelos(QUATRO);
    const { unmount } = abrir();
    unmount();
    abrir();
    await user.click(screen.getAllByRole("button", { name: "Meus templates" }).at(-1)!);
    expect(screen.getByText("Nenhum template encontrado")).toBeTruthy();
  });

  it("a busca 'WHATS' deixa só Campanhas de WhatsApp; sem resultado mostra o vazio", async () => {
    const user = userEvent.setup();
    abrir();
    await user.type(screen.getByPlaceholderText("Buscar"), "WHATS");
    expect(screen.getAllByRole("button", { name: /^Usar modelo / })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Usar modelo Campanhas de WhatsApp" })).toBeTruthy();
    await user.clear(screen.getByPlaceholderText("Buscar"));
    await user.type(screen.getByPlaceholderText("Buscar"), "zzz");
    expect(screen.getByText("Nenhum template encontrado")).toBeTruthy();
  });

  it("erro mostra 'Tentar de novo'; o '+ Novo dashboard em branco' continua", () => {
    comModelos([], { isError: true });
    abrir();
    expect(screen.getByRole("button", { name: /Tentar de novo/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Novo dashboard em branco" })).toBeTruthy();
  });
});

describe("passo 'Configure filtros' (10-020)", () => {
  async function irParaOPasso() {
    const user = userEvent.setup();
    abrir();
    await user.click(screen.getByRole("button", { name: "Usar modelo Atendimentos" }));
    return user;
  }

  it("mostra o título, o texto da Clint, os rótulos e troca o rodapé por 'Criar dashboard'", async () => {
    await irParaOPasso();
    expect(screen.getByText("Configure filtros")).toBeTruthy();
    expect(screen.getByText(/Defina quais filtros serão aplicados/)).toBeTruthy();
    for (const r of ["Grupo de origem:", "Origem:", "Usuário:", "Tags"]) expect(screen.getByText(r)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adicionar tag" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Criar dashboard" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "+ Novo dashboard em branco" })).toBeNull();
  });

  it("escolher um usuário e uma tag e criar chama usar.mutate com os filtros; sucesso fecha e navega", async () => {
    usar.mockImplementation((_p: unknown, o: { onSuccess: (r: { id: string }) => void }) => o.onSuccess({ id: "novo" }));
    const aoFechar = vi.fn();
    const user = userEvent.setup();
    render(<JanelaNovoDashboard aberta aoFechar={aoFechar} />);
    await user.click(screen.getByRole("button", { name: "Usar modelo Atendimentos" }));
    await user.click(screen.getByRole("combobox", { name: "Usuário:" }));
    await user.click(await screen.findByRole("checkbox", { name: "Ana" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await user.click(await screen.findByRole("option", { name: "vip" }));
    await user.click(screen.getByRole("button", { name: "Criar dashboard" }));
    expect(usar).toHaveBeenCalledWith(
      { modelo: { origem: "sistema", id: "atendimentos" }, filtros: { usuarios: ["u1"], tags: ["vip"], origens: [], gruposDeOrigem: [] } },
      expect.anything(),
    );
    expect(aoFechar).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/app/metrics/novo");
  });

  it("409 mostra o erro da API; outro erro, o texto da Clint; clicar numa categoria volta à grade", async () => {
    const user = await irParaOPasso();
    usar.mockImplementationOnce((_p: unknown, o: { onError: (e: unknown) => void }) => o.onError(new ApiError(409, "state_conflict", undefined, "r1", "limite")));
    await user.click(screen.getByRole("button", { name: "Criar dashboard" }));
    expect(showApiError).toHaveBeenCalled();
    usar.mockImplementationOnce((_p: unknown, o: { onError: (e: unknown) => void }) => o.onError(new Error("x")));
    await user.click(screen.getByRole("button", { name: "Criar dashboard" }));
    expect(toast.error).toHaveBeenCalledWith("Falha ao criar dashboard a partir do template.");
    await user.click(screen.getByRole("button", { name: "Todos os modelos" }));
    expect(screen.getByText("Selecione um modelo", { selector: "p" })).toBeTruthy();
  });

  it("o botão fica desabilitado enquanto usar.isPending", async () => {
    usarEstado.isPending = true;
    await irParaOPasso();
    expect(screen.getByRole("button", { name: "Criar dashboard" })).toHaveProperty("disabled", true);
  });
});
