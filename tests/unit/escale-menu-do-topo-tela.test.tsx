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
vi.mock("@/components/shell/AlertsBell", () => ({ AlertsBell: () => null }));
vi.mock("@/components/shell/AvisoDePropostaEmDestaque", () => ({ AvisoDePropostaEmDestaque: () => null }));
vi.mock("@/components/shell/ContadorDaFila", () => ({ ContadorDaFila: () => null }));
vi.mock("@/components/shell/SearchTrigger", () => ({ SearchTrigger: () => null }));
vi.mock("@/components/shell/TenantSwitcher", () => ({ TenantSwitcher: () => null }));
vi.mock("@/components/shell/UserMenu", () => ({ UserMenu: () => null }));
vi.mock("@/components/escale/menu/MarcaNoTopo", () => ({ MarcaNoTopo: () => null }));

import { MenuDoTopo } from "@/components/escale/menu/MenuDoTopo";

describe("<MenuDoTopo>", () => {
  it("mostra os 7 itens da Clint na ordem e marca Negócios dentro de um funil", () => {
    render(<MenuDoTopo />);
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
    expect(within(nav).getByRole("link", { name: "Negócios" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Atendimento" })).not.toHaveAttribute("aria-current");
  });

  it("Mais abre as outras telas, sem repetir as do topo, e Esc fecha", async () => {
    const user = userEvent.setup();
    render(<MenuDoTopo />);
    await user.click(screen.getByRole("button", { name: "Mais" }));
    const painel = screen.getByRole("dialog", { name: "Todas as telas" });
    expect(within(painel).getByRole("link", { name: "Webhooks" })).toHaveAttribute("href", "/app/webhooks");
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
});
