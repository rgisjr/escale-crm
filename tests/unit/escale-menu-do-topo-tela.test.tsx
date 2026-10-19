import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/pipelines/p-1" }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { is_platform_admin: false, support: null },
    activeOrg: {
      role: "admin",
      interface_settings: undefined,
      modulos_ligados: ["crm_b2b"],
      capacidades_ligadas: [],
    },
  }),
}));
vi.mock("@/hooks/escale/useAvisosDaOrigem", () => ({ useAvisosDaOrigem: () => undefined }));
vi.mock("@/components/shell/AvisoDePropostaEmDestaque", () => ({ AvisoDePropostaEmDestaque: () => null }));
vi.mock("@/components/escale/menu/ContadorDaFilaDaCasca", () => ({ ContadorDaFilaDaCasca: () => null }));
vi.mock("@/components/escale/menu/MarcaNoTopo", () => ({ MarcaNoTopo: () => null }));
vi.mock("@/components/escale/menu/BotaoDaIa", () => ({
  BotaoDaIa: ({ destino }: { destino: string | null }) => <span data-testid="ia-do-topo" data-destino={destino ?? ""} />,
}));
vi.mock("@/components/escale/menu/AjudaDoTopo", () => ({ AjudaDoTopo: () => <span data-testid="ajuda-do-topo" /> }));
vi.mock("@/components/escale/menu/NovoDoTopo", () => ({
  NovoDoTopo: ({ acoes }: { acoes: readonly { id: string }[] }) => (
    <span data-testid="novo-do-topo" data-acoes={acoes.map((a) => a.id).join(",")} />
  ),
}));
vi.mock("@/components/escale/menu/MenuDaConta", () => ({
  MenuDaConta: ({ veAvisos }: { veAvisos: boolean }) => <span data-testid="menu-da-conta" data-avisos={String(veAvisos)} />,
}));

import { MenuDoTopo } from "@/components/escale/menu/MenuDoTopo";

describe("<MenuDoTopo> (igual ao da Clint, variante superior)", () => {
  it("barra de 44px com borda de baixo, os 7 itens na ordem, Negócios ativo num funil", () => {
    render(<MenuDoTopo />);
    expect(screen.getByTestId("menu-do-topo")).toHaveClass("h-11", "border-b", "border-casca-borda", "bg-surface");
    const nav = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Negócios",
      "Contatos",
      "Atividades",
      "Atendimento",
      "Automações",
      "Campanhas",
      "Indicadores",
    ]);
    const negocios = within(nav).getByRole("link", { name: "Negócios" });
    expect(negocios).toHaveAttribute("aria-current", "page");
    expect(negocios).toHaveClass("bg-casca-marca-suave", "font-semibold");
    expect(within(nav).getByRole("link", { name: "Atendimento" })).toHaveAttribute("href", "/app/inbox");
    expect(within(nav).getByRole("link", { name: "Campanhas" })).toHaveAttribute("href", "/app/campaigns");
  });

  it("Mais abre o painel: Empresas, Agenda e Agentes estão lá, o topo não se repete, e Esc fecha", async () => {
    const user = userEvent.setup();
    render(<MenuDoTopo />);
    await user.click(screen.getByRole("button", { name: "Mais" }));
    const painel = screen.getByRole("dialog", { name: "Todas as telas" });
    expect(within(painel).getByText("Mais")).toBeInTheDocument();
    expect(within(painel).getByRole("link", { name: "Webhooks" })).toHaveAttribute("href", "/app/webhooks");
    expect(within(painel).getByRole("link", { name: "Empresas" })).toHaveAttribute("href", "/app/companies");
    expect(within(painel).getByRole("link", { name: "Agenda" })).toHaveAttribute("href", "/app/agenda");
    expect(within(painel).getByRole("link", { name: "Agentes" })).toHaveAttribute("href", "/app/ai/agents");
    expect(within(painel).queryByRole("link", { name: "Contatos" })).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Todas as telas" })).toBeNull();
  });

  it("o caminho de volta ao menu lateral leva a tela atual", async () => {
    const user = userEvent.setup();
    render(<MenuDoTopo />);
    await user.click(screen.getByRole("button", { name: "Mais" }));
    expect(screen.getByRole("link", { name: "Voltar ao menu lateral" })).toHaveAttribute(
      "href",
      "/app/escale/menu?usar=lateral&voltar=%2Fapp%2Fpipelines%2Fp-1",
    );
  });

  it("à direita: ✦, ?, Novo + e o avatar, nessa ordem; busca, sino, idioma e organização não ficam soltos", () => {
    render(<MenuDoTopo />);
    const ordem = ["ia-do-topo", "ajuda-do-topo", "novo-do-topo", "menu-da-conta"].map((id) => screen.getByTestId(id));
    for (let i = 1; i < ordem.length; i++) {
      expect(ordem[i - 1]!.compareDocumentPosition(ordem[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByTestId("ia-do-topo")).toHaveAttribute("data-destino", "/app/ai");
    expect(screen.getByTestId("novo-do-topo")).toHaveAttribute("data-acoes", "contato,empresa,campanha");
    expect(screen.getByTestId("menu-da-conta")).toHaveAttribute("data-avisos", "true");
    expect(screen.queryByRole("button", { name: /Buscar/ })).toBeNull();
    for (const id of ["tenant-switcher", "alerts-bell", "seletor-de-idioma"]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });
});
