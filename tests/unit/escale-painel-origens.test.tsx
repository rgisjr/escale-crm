import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn(), push }),
}));
vi.mock("@/app/actions/escale/origens", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { guardarPreferenciaDeOrigens } from "@/app/actions/escale/origens";
import { apiClient } from "@/lib/api/client";
import type { Origens } from "@/lib/escale/origens/regras";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { PainelOrigens } from "@/components/escale/origens/PainelOrigens";

const G_OBRAS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const ORIGENS: Origens = {
  grupos: [
    { id: G_OBRAS, name: "INSS de obras", color: null, icon: "iniciais", is_archived: false },
    { id: "g-cred", name: "Credenciados", color: null, icon: "iniciais", is_archived: false },
    { id: "g-velho", name: "Antigo", color: null, icon: "iniciais", is_archived: true },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: G_OBRAS, is_archived: false, is_default: false },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred", is_archived: false, is_default: false },
    { id: "f-turma", name: "Turma 12", group_id: "g-cred", is_archived: false, is_default: false },
    { id: "f-pos", name: "Pós-venda", group_id: "g-velho", is_archived: false, is_default: false },
    { id: "f-morto", name: "Funil morto", group_id: "g-cred", is_archived: true, is_default: false },
  ],
};
const ABERTO: PreferenciasDoPainel = { painelAberto: true, listaAberta: true, ocultos: [] };

function renderizar(podeGerenciar = true, preferencias: PreferenciasDoPainel = ABERTO) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <PainelOrigens origens={ORIGENS} podeGerenciar={podeGerenciar} preferencias={preferencias} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

const lista = () => screen.getByRole("navigation", { name: "Funis por grupo" });
const setasDosGrupos = () =>
  within(lista())
    .getAllByRole("button", { name: /^(Abrir|Fechar) / })
    .map((b) => b.getAttribute("aria-label"));

beforeEach(() => {
  push.mockClear();
  vi.mocked(guardarPreferenciaDeOrigens).mockClear();
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("<PainelOrigens> — lista e navegação", () => {
  it("grupos ativos por nome, o grupo do funil aberto já aberto, e o último funil é lembrado", () => {
    renderizar();
    expect(setasDosGrupos()).toEqual(["Abrir Credenciados", "Fechar INSS de obras"]);
    expect(screen.getByRole("link", { name: "Leads INSS WhatsApp" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Funil Nayara" })).toBeNull();
    expect(screen.queryByText("Sem grupo")).toBeNull();
    expect(guardarPreferenciaDeOrigens).toHaveBeenCalledWith({ nome: "ultimo_funil", valor: "f-leads" });
  });

  it("a seta do grupo abre e fecha as origens dele", async () => {
    const user = renderizar();
    await user.click(within(lista()).getByRole("button", { name: "Abrir Credenciados" }));
    expect(screen.getByRole("link", { name: "Funil Nayara" })).toBeInTheDocument();
    await user.click(within(lista()).getByRole("button", { name: "Fechar Credenciados" }));
    expect(screen.queryByRole("link", { name: "Funil Nayara" })).toBeNull();
  });

  it("a lupa filtra sem acento", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar grupo ou funil" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar grupo ou funil" }), "nayara");
    expect(screen.getByRole("link", { name: "Funil Nayara" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Turma 12" })).toBeNull();
  });
});

describe("<PainelOrigens> — recolher", () => {
  it("< recolhe o painel inteiro e guarda a escolha", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Recolher o painel de origens" }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(guardarPreferenciaDeOrigens).toHaveBeenCalledWith({ nome: "painel", valor: "fechado" });
    await user.click(screen.getByRole("button", { name: "Abrir o painel de origens" }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
  });

  it("^ recolhe só a lista e guarda a escolha", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Recolher a lista de origens" }));
    expect(screen.queryByRole("navigation", { name: "Funis por grupo" })).toBeNull();
    expect(guardarPreferenciaDeOrigens).toHaveBeenCalledWith({ nome: "lista", valor: "fechada" });
  });

  it("respeita as preferências que vieram do servidor", () => {
    renderizar(true, { painelAberto: false, listaAberta: true, ocultos: [] });
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir o painel de origens" })).toBeInTheDocument();
  });
});

describe("<PainelOrigens> — + e ⋮ (gerente)", () => {
  it("o + de Origens oferece adicionar origem e grupo", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await user.click(await screen.findByRole("menuitem", { name: "Adicionar grupo de origens" }));
    expect(await screen.findByRole("dialog", { name: "Adicionar grupo de origens" })).toBeInTheDocument();
  });

  it("o + do grupo cria a origem ali mesmo e abre o quadro dela", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { pipelines: [{ id: "f-nova", name: "Leads Insta" }], arquivados: [] } });
    vi.mocked(apiClient.put).mockResolvedValue({ data: ORIGENS });
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Nova origem em INSS de obras" }));
    await user.type(screen.getByRole("textbox", { name: "Nome da nova origem" }), "Leads Insta{Enter}");
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipelines", { name: "Leads Insta" });
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/app/pipelines/f-nova"));
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-nova/grupo", { group_id: G_OBRAS });
  });

  it("⋮ do grupo tem os itens da Clint, com Selecionar origens desligado", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de INSS de obras" }));
    const itens = (await screen.findAllByRole("menuitem")).map((i) => i.textContent);
    expect(itens).toEqual([
      "Configurações",
      "Selecionar origensEm breve",
      "Customizar",
      "Ocultar da minha barra lateral",
      "Arquivar",
      "Excluir",
    ]);
    expect(screen.getByRole("menuitem", { name: /Selecionar origens/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("Ocultar esconde o grupo só para quem clicou, e dá para mostrar de novo", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de INSS de obras" }));
    await user.click(await screen.findByRole("menuitem", { name: "Ocultar da minha barra lateral" }));
    expect(setasDosGrupos()).toEqual(["Abrir Credenciados"]);
    expect(guardarPreferenciaDeOrigens).toHaveBeenLastCalledWith({ nome: "ocultos", valor: [G_OBRAS] });
    await user.click(screen.getByRole("button", { name: "Mostrar" }));
    expect(setasDosGrupos()).toHaveLength(2);
  });

  it("⋮ da origem abre Configurações da origem", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de Leads INSS WhatsApp" }));
    const itens = (await screen.findAllByRole("menuitem")).map((i) => i.textContent);
    expect(itens).toEqual(["Configurações", "Selecionar origemEm breve", "Arquivar", "Excluir"]);
    await user.click(screen.getByRole("menuitem", { name: "Configurações" }));
    expect(await screen.findByRole("dialog", { name: "Configurações da origem" })).toBeInTheDocument();
  });

  it("Arquivados lista o grupo arquivado e a origem arquivada, com Desarquivar", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: ORIGENS });
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: /Arquivados \(2\)/ }));
    expect(screen.getByText(/Antigo/)).toBeInTheDocument();
    expect(screen.getByText("Funil morto")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Desarquivar Antigo" }));
    expect(apiClient.patch).toHaveBeenCalledWith(`/api/v1/pipeline-groups/g-velho`, { is_archived: false });
  });
});

describe("<PainelOrigens> — sem gerente", () => {
  it("vê grupos e origens, mas nada de +, ⋮ ou Arquivados", () => {
    renderizar(false);
    expect(setasDosGrupos()).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Adicionar" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Mais ações de/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Nova origem em/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Arquivados/ })).toBeNull();
  });
});
