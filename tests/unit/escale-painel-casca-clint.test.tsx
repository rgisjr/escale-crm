import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let caminho = "/app/pipelines/f-leads";
vi.mock("next/navigation", () => ({
  usePathname: () => caminho,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/escale/origens/guardar-preferencia", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));
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
const ABERTO: PreferenciasDoPainel = { painelAberto: true, listaAberta: true, visualizacoesAbertas: true, recentesAbertos: false, ocultos: [] };

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

describe("casca V3 — a coluna do painel (01-010)", () => {
  it("é a coluna de 250px, branca, com a borda direita #E8E4F5 e a altura da tela abaixo do topo — não um cartão", () => {
    renderizar();
    const painel = screen.getByRole("complementary", { name: "Origens" });
    expect(painel).toHaveClass(
      "w-[250px]",
      "border-r",
      "border-casca-borda",
      "bg-surface",
      "h-[calc(100dvh-2.75rem)]",
      "sticky",
      "top-0",
    );
    expect(painel).not.toHaveClass("rounded-lg");
    expect(painel.querySelector("[data-rolagem-do-painel]")).toHaveClass("pt-[78px]");
  });

  it("o < é a bolinha de 20px centrada na borda direita, 16px abaixo do topo", () => {
    renderizar();
    expect(screen.getByRole("button", { name: "Recolher o painel de origens" })).toHaveClass(
      "size-5",
      "rounded-full",
      "-right-[10px]",
      "top-4",
      "border-casca-borda",
    );
  });

  it("recolhido, o > é a mesma bolinha, no topo da borda esquerda", () => {
    renderizar({ ...ABERTO, painelAberto: false });
    expect(screen.getByRole("button", { name: "Abrir o painel de origens" })).toHaveClass(
      "size-5",
      "rounded-full",
      "top-4",
    );
  });

  it("ORIGENS: lupa e ^ à vista; o + (nosso, sem print) só aparece no hover do cabeçalho", () => {
    renderizar();
    const cabecalho = screen.getByRole("heading", { name: "Origens" }).parentElement!;
    expect(cabecalho).toHaveClass("h-12", "border-b", "group/cabecalho");
    expect(screen.getByRole("button", { name: "Adicionar" }).closest("span")).toHaveClass(
      "opacity-0",
      "group-hover/cabecalho:opacity-100",
    );
    expect(screen.getByRole("button", { name: "Buscar grupo ou funil" })).not.toHaveClass("opacity-0");
    expect(screen.getByRole("button", { name: "Recolher a lista de origens" })).toHaveClass("text-casca-meta");
  });

  it("o + de ORIGENS abre o menu da casca com Adicionar origem e Adicionar grupo de origens", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("rounded-[8px]");
    expect(within(menu).getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Adicionar origem",
      "Adicionar grupo de origens",
    ]);
  });

  it("a lupa abre o campo #F6F8FF sem borda, com o texto de busca da Clint", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar grupo ou funil" }));
    const campo = screen.getByRole("textbox", { name: "Buscar grupo ou funil" });
    expect(campo).toHaveClass("bg-casca-busca", "rounded-casca-gatilho");
    expect(campo).toHaveAttribute("placeholder", "Buscar origens, grupos, visualizações…");
  });
});

describe("casca V3 — VISUALIZAÇÕES e o rodapé da seleção", () => {
  it("o cabeçalho tem o ícone de quadro tracejado e o ^ cinza; o + só aparece no hover", () => {
    renderizar();
    const secao = screen.getByRole("region", { name: "Visualizações" });
    const cabecalho = within(secao).getByRole("heading", { name: "Visualizações" }).parentElement!;
    expect(cabecalho).toHaveClass("h-12", "border-b");
    expect(cabecalho.querySelector("svg")).not.toBeNull();
    expect(within(secao).getByRole("button", { name: "Recolher as visualizações" })).toHaveClass("text-casca-meta");
    expect(within(secao).getByRole("button", { name: "Criar visualização" }).closest("span")).toHaveClass("opacity-0");
  });

  it("a linha da visualização tem 34px, o quadrado #4A4A4A com as iniciais e a contagem à direita", () => {
    renderizar();
    const link = screen.getByRole("link", { name: /Time comercial/ });
    expect(link.closest("li")).toHaveClass("h-[34px]");
    const icone = link.querySelector("[data-icone-da-visualizacao]");
    expect(icone).toHaveStyle({ backgroundColor: "#4A4A4A" });
    expect(icone).toHaveTextContent("TC");
    expect(within(link).getByText("2 origens")).toHaveClass("text-[11px]", "text-casca-suave");
  });

  it("a visualização aberta ganha o fundo #EFF3FF e a barra da marca", () => {
    caminho = "/app/pipelines/visualizacoes/v-time";
    renderizar();
    expect(screen.getByRole("link", { name: /Time comercial/ }).closest("li")).toHaveClass(
      "bg-casca-raia",
      "before:bg-casca-marca",
    );
  });

  it("o rodapé da seleção fala na cor da marca, com o marcador, e o Salvar leva o disquete (01-026)", async () => {
    const user = renderizar();
    await user.click(
      within(screen.getByRole("region", { name: "Visualizações" })).getByRole("button", { name: "Criar visualização" }),
    );
    const texto = screen.getByText("0 origens selecionadas · Rascunho");
    expect(texto).toHaveClass("text-casca-marca", "font-semibold");
    expect(texto.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Salvar como visualização" }).querySelector("svg")).not.toBeNull();
  });
});
