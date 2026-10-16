/**
 * SEM A CASCA, NADA MUDA (fork Escale, casca igual à Clint — V2).
 *
 * A V2 reescreve o topo da casca nova: itens, lado direito, menu da conta, Mais
 * e botão de conversas. Quem não ligou a casca (cookie `escale_menu` ≠ `topo`)
 * continua com a barra lateral e a `TopBar` do original, com as mesmas peças, na
 * mesma ordem. E as peças compartilhadas (organização, busca, sino, conta) não
 * podem conhecer o fork: a casca nova usa as suas próprias, em
 * `components/escale/menu/`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/components/shell/Sidebar", () => ({ Sidebar: () => <nav data-testid="sidebar-original" /> }));
vi.mock("@/components/shell/MobileSidebar", () => ({ MobileSidebar: () => <span data-testid="peca-MobileSidebar" /> }));
vi.mock("@/components/shell/TenantSwitcher", () => ({ TenantSwitcher: () => <span data-testid="peca-TenantSwitcher" /> }));
vi.mock("@/components/shell/SearchTrigger", () => ({ SearchTrigger: () => <span data-testid="peca-SearchTrigger" /> }));
vi.mock("@/components/shell/AlertsBell", () => ({ AlertsBell: () => <span data-testid="peca-AlertsBell" /> }));
vi.mock("@/components/shell/AvisoDePropostaEmDestaque", () => ({
  AvisoDePropostaEmDestaque: () => <span data-testid="peca-AvisoDePropostaEmDestaque" />,
}));
vi.mock("@/components/shell/UserMenu", () => ({ UserMenu: () => <span data-testid="peca-UserMenu" /> }));
vi.mock("@/components/escale/menu/MenuDoTopo", () => ({ MenuDoTopo: () => <header data-testid="menu-do-topo" /> }));
vi.mock("@/components/escale/ConversasFlutuante", () => ({
  ConversasFlutuante: () => <span data-testid="conversas-flutuante" />,
}));
vi.mock("@/components/shell/BarraDeProgressoNavegacao", () => ({ BarraDeProgressoNavegacao: () => null }));
vi.mock("@/components/shell/BarraInferior", () => ({ BarraInferior: () => null }));
vi.mock("@/hooks/atendimento/useSinalDePresenca", () => ({ useSinalDePresenca: () => {} }));
vi.mock("@/hooks/notifications/useInboundMessageAlerts", () => ({ useInboundMessageAlerts: () => {} }));
vi.mock("@/hooks/notifications/useCrmAlerts", () => ({ useCrmAlerts: () => {} }));
vi.mock("@/hooks/calls/useInboundCallAlerts", () => ({ useInboundCallAlerts: () => {} }));
vi.mock("@/lib/notifications/notify_open", () => ({ useNotifyOpenFromServiceWorker: () => {} }));

import { AppShell } from "@/app/app/_components/AppShell";
import { ProvedorDaOcupacaoDoRodape } from "@/lib/ui/rodape-ocupado";

const RAIZ = join(__dirname, "..", "..");
const PECAS_DA_TOPBAR = [
  "MobileSidebar",
  "TenantSwitcher",
  "SearchTrigger",
  "AlertsBell",
  "AvisoDePropostaEmDestaque",
  "UserMenu",
];
const PECAS_COMPARTILHADAS = [
  "components/shell/TopBar.tsx",
  "components/shell/Sidebar.tsx",
  "components/shell/TenantSwitcher.tsx",
  "components/shell/SearchTrigger.tsx",
  "components/shell/AlertsBell.tsx",
  "components/shell/UserMenu.tsx",
  "components/shell/SeletorDeIdioma.tsx",
  "components/shell/ContadorDaFila.tsx",
  "components/shell/CommandPalette.tsx",
  "components/theme/theme-toggle.tsx",
];

function montar(menu: "lateral" | "topo") {
  return render(
    <ProvedorDaOcupacaoDoRodape>
      <AppShell sidebarCollapsed={false} podeAtender={false} menu={menu}>
        <p>tela</p>
      </AppShell>
    </ProvedorDaOcupacaoDoRodape>,
  );
}

const matchMediaOriginal = window.matchMedia;
afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

describe("sem a casca, o topo e a lateral do original ficam como estão", () => {
  it("menu lateral: Sidebar + TopBar com as 6 peças de sempre, na ordem, e nada da casca", () => {
    const { container } = montar("lateral");
    expect(screen.getByTestId("sidebar-original")).toBeInTheDocument();
    const pecas = PECAS_DA_TOPBAR.map((p) => screen.getByTestId(`peca-${p}`));
    for (let i = 1; i < pecas.length; i++) {
      expect(pecas[i - 1]!.compareDocumentPosition(pecas[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.queryByTestId("menu-do-topo")).toBeNull();
    expect(screen.queryByTestId("conversas-flutuante")).toBeNull();
    expect(container.querySelector("[data-escale-casca]")).toBeNull();
  });

  it("casca em tela grande: o topo novo entra no lugar da TopBar, e a lateral sai", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    const { container } = montar("topo");
    expect(screen.getByTestId("menu-do-topo")).toBeInTheDocument();
    expect(screen.getByTestId("conversas-flutuante")).toBeInTheDocument();
    expect(screen.queryByTestId("peca-TenantSwitcher")).toBeNull();
    expect(screen.queryByTestId("sidebar-original")).toBeNull();
    expect(container.querySelector("[data-escale-casca]")).not.toBeNull();
  });

  it.each(PECAS_COMPARTILHADAS)("%s não importa nada do fork", (arquivo) => {
    const fonte = readFileSync(join(RAIZ, arquivo), "utf8");
    expect(fonte).not.toMatch(/from\s+["']@\/(?:components|lib|hooks)\/escale\//);
  });
});
