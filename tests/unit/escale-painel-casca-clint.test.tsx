import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let caminho = "/app/pipelines/f-leads";
vi.mock("next/navigation", () => ({
  usePathname: () => caminho,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/app/actions/escale/origens", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import type { Origens } from "@/lib/escale/origens/regras";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { PainelOrigens } from "@/components/escale/origens/PainelOrigens";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras", color: "#0091ff", icon: "iniciais", is_archived: false },
    { id: "g-cred", name: "Credenciados", color: null, icon: "pessoas", is_archived: false },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras", is_archived: false, is_default: false },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred", is_archived: false, is_default: false },
  ],
};
const VISUALIZACOES: Visualizacao[] = [
  { id: "v-time", name: "Time comercial", acesso: "todos", origens: ["f-nayara", "f-leads"], pessoas: [] },
];
const ABERTO: PreferenciasDoPainel = { painelAberto: true, listaAberta: true, visualizacoesAbertas: true, ocultos: [] };

function renderizar(preferencias: PreferenciasDoPainel = ABERTO, podeGerenciar = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <PainelOrigens
        origens={ORIGENS}
        visualizacoes={VISUALIZACOES}
        podeGerenciar={podeGerenciar}
        preferencias={preferencias}
      />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

beforeEach(() => {
  caminho = "/app/pipelines/f-leads";
});

describe("casca V3 — linhas de grupo e de origem (01-010, 01-032, 01-033, 01-034)", () => {
  it("a linha do grupo tem 34px; o nome fica em peso normal e só o grupo da origem aberta fica em 600", () => {
    renderizar();
    const credenciados = screen.getByText("Credenciados");
    expect(credenciados.parentElement).toHaveClass("h-[34px]", "pl-4");
    expect(credenciados).not.toHaveClass("font-semibold");
    expect(screen.getByText("INSS de obras")).toHaveClass("font-semibold");
  });

  it("o grupo fechado esconde a seta, o + e o ⋮; o grupo aberto fica cinza e mostra os três", () => {
    renderizar();
    expect(screen.getByRole("button", { name: "Abrir Credenciados" })).toHaveClass("opacity-0");
    expect(screen.getByRole("button", { name: "Nova origem em Credenciados" }).closest("span")).toHaveClass(
      "opacity-0",
    );
    const fechar = screen.getByRole("button", { name: "Fechar INSS de obras" });
    expect(fechar).toHaveClass("opacity-100");
    expect(fechar.parentElement).toHaveClass("bg-(--escale-painel-hover)");
    expect(screen.getByRole("button", { name: "Nova origem em INSS de obras" }).closest("span")).toHaveClass(
      "opacity-100",
    );
  });

  it("a origem aberta tem o fundo #EFF3FF e a barra de 3px da marca; o texto começa a 43px", () => {
    renderizar();
    const link = screen.getByRole("link", { name: "Leads INSS WhatsApp" });
    expect(link).toHaveClass("pl-[43px]");
    expect(link.closest("li")).toHaveClass("h-[34px]", "bg-casca-raia", "before:w-[3px]", "before:bg-casca-marca");
  });

  it("o ícone do grupo usa a cor da Clint que corresponde ao tom gravado", () => {
    renderizar();
    const linha = screen.getByText("INSS de obras").parentElement!;
    expect(linha.querySelector("[data-icone-do-grupo]")).toHaveStyle({ backgroundColor: "#83B4FF" });
  });

  it("o ⋮ do grupo abre o menu da Clint: ícone em cada item, divisória e Excluir em vermelho", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de INSS de obras" }));
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("rounded-[8px]", "shadow-casca-painel");
    const itens = within(menu).getAllByRole("menuitem");
    expect(itens.map((i) => i.textContent)).toEqual([
      "Configurações",
      "Selecionar origens",
      "Customizar",
      "Ocultar da minha barra lateral",
      "Arquivar",
      "Excluir",
    ]);
    for (const item of itens) expect(item.querySelector("svg")).not.toBeNull();
    expect(itens[5]).toHaveClass("text-casca-alerta");
    expect(within(menu).getByRole("separator")).toBeInTheDocument();
  });

  it("o ⋮ da origem abre Configurações, Selecionar origem, Arquivar e Excluir, com ícones (01-033)", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de Leads INSS WhatsApp" }));
    const menu = await screen.findByRole("menu");
    const itens = within(menu).getAllByRole("menuitem");
    expect(itens.map((i) => i.textContent)).toEqual(["Configurações", "Selecionar origem", "Arquivar", "Excluir"]);
    for (const item of itens) expect(item.querySelector("svg")).not.toBeNull();
  });

  it("o + do grupo mostra a dica escura «Nova origem» (01-034)", async () => {
    const user = renderizar();
    await user.hover(screen.getByRole("button", { name: "Nova origem em Credenciados" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Nova origem");
  });

  it("no modo seleção as caixinhas são as da casca, sem checkbox nativo", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de Credenciados" }));
    await user.click(await screen.findByRole("menuitem", { name: "Selecionar origens" }));
    expect(screen.getByRole("checkbox", { name: "Funil Nayara" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Selecionar Credenciados" })).toBeChecked();
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("a criação inline usa o campo de busca da casca (#F6F8FF, sem borda)", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Nova origem em Credenciados" }));
    expect(screen.getByRole("textbox", { name: "Nome da nova origem" })).toHaveClass(
      "bg-casca-busca",
      "rounded-casca-gatilho",
    );
  });
});
