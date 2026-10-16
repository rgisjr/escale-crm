import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORGS = [
  { organization_id: "org-1", organization_name: "Escale IA" },
  { organization_id: "org-2", organization_name: "Loja do Centro" },
];
const sessao = vi.hoisted(() => ({
  user: {
    full_name: "Régis Silva",
    email: "regis@escale.ia",
    avatar_url: null as string | null,
    is_platform_admin: false,
    support: null as unknown,
    organizations: [] as { organization_id: string; organization_name: string }[],
  },
  signOut: vi.fn(async () => {}),
}));
const tema = vi.hoisted(() => ({ theme: "light" as "light" | "dark" | "system", setTheme: vi.fn() }));
const trocas = vi.hoisted(() => ({ trocar: vi.fn(async () => {}), escolher: vi.fn() }));
const central = vi.hoisted(() => ({
  useAgentInbox: vi.fn(() => ({ data: { items: [], open_count: 3 } })),
  useSonsDaCentral: vi.fn(),
}));

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: sessao.user,
    activeOrg: { orgId: "org-1", name: "Escale IA", role: "admin" },
    signOut: sessao.signOut,
  }),
}));
vi.mock("@/lib/theme", () => ({ useTheme: () => tema }));
vi.mock("@/hooks/escale/useTrocarDeOrganizacao", () => ({
  useTrocarDeOrganizacao: () => ({ trocando: false, trocar: trocas.trocar }),
}));
vi.mock("@/hooks/escale/useTrocarDeIdioma", () => ({
  useTrocarDeIdioma: () => ({ idioma: "pt-BR", salvando: false, escolher: trocas.escolher }),
}));
vi.mock("@/hooks/ai/useAgentInbox", () => ({ useAgentInbox: central.useAgentInbox }));
vi.mock("@/hooks/notifications/useSonsDaCentral", () => ({ useSonsDaCentral: central.useSonsDaCentral }));
vi.mock("@/components/shell/CommandPalette", () => ({
  CommandPalette: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Paleta de navegação" /> : null),
}));

import { MenuDaConta } from "@/components/escale/menu/MenuDaConta";

const u = () => userEvent.setup({ pointerEventsCheck: 0 });
const abrir = (ator: ReturnType<typeof userEvent.setup>) =>
  ator.click(screen.getByRole("button", { name: "Menu do usuário" }));

beforeEach(() => {
  sessao.user.organizations = [...ORGS];
  sessao.user.is_platform_admin = false;
  sessao.signOut.mockClear();
  tema.theme = "light";
  tema.setTheme.mockReset();
  trocas.trocar.mockClear();
  trocas.escolher.mockReset();
  central.useAgentInbox.mockClear();
  central.useSonsDaCentral.mockClear();
});

describe("<MenuDaConta> (avatar quadrado ▾ da Clint)", () => {
  it("o avatar mostra a inicial, o selo dos avisos abertos, e o som da central continua tocando", () => {
    render(<MenuDaConta veAvisos />);
    expect(screen.getByRole("button", { name: "Menu do usuário" })).toHaveTextContent("R");
    expect(screen.getByLabelText("Central de avisos — 3 em aberto")).toHaveTextContent("3");
    expect(central.useSonsDaCentral).toHaveBeenCalledWith([]);
  });

  it("o menu tem organização, busca, avisos, idioma, tema e sair", async () => {
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    expect(screen.getByRole("menuitem", { name: "Escale IA" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Loja do Centro" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^Buscar/ })).toHaveTextContent("⌘K");
    expect(screen.getByRole("menuitem", { name: "Central de avisos — 3 em aberto" })).toHaveAttribute(
      "href",
      "/app/ai/inbox",
    );
    expect(screen.getByRole("menuitem", { name: "Español" })).toBeInTheDocument();
    for (const nome of ["Claro", "Escuro", "Sistema", "Sair"]) {
      expect(screen.getByRole("menuitem", { name: nome })).toBeInTheDocument();
    }
  });

  it("escolher outra organização usa a troca de sempre", async () => {
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    await ator.click(screen.getByRole("menuitem", { name: "Loja do Centro" }));
    expect(trocas.trocar).toHaveBeenCalledWith("org-2");
  });

  it("Buscar abre a paleta; Ctrl+K abre a paleta com o menu fechado", async () => {
    const ator = u();
    const { unmount } = render(<MenuDaConta veAvisos />);
    await abrir(ator);
    await ator.click(screen.getByRole("menuitem", { name: /^Buscar/ }));
    expect(screen.getByRole("dialog", { name: "Paleta de navegação" })).toBeInTheDocument();
    unmount();

    render(<MenuDaConta veAvisos />);
    expect(screen.queryByRole("dialog", { name: "Paleta de navegação" })).toBeNull();
    await ator.keyboard("{Control>}k{/Control}");
    expect(screen.getByRole("dialog", { name: "Paleta de navegação" })).toBeInTheDocument();
  });

  it("tema e idioma pelo menu; Ctrl+Shift+L continua ciclando o tema", async () => {
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    await ator.click(screen.getByRole("menuitem", { name: "Escuro" }));
    expect(tema.setTheme).toHaveBeenCalledWith("dark");
    await abrir(ator);
    await ator.click(screen.getByRole("menuitem", { name: "Español" }));
    expect(trocas.escolher).toHaveBeenCalledWith("es");
    tema.setTheme.mockReset();
    await ator.keyboard("{Control>}{Shift>}L{/Shift}{/Control}");
    expect(tema.setTheme).toHaveBeenCalledWith("dark");
  });

  it("sem a central de avisos: nem selo, nem item, nem som", async () => {
    const ator = u();
    render(<MenuDaConta veAvisos={false} />);
    expect(central.useAgentInbox).not.toHaveBeenCalled();
    expect(central.useSonsDaCentral).not.toHaveBeenCalled();
    await abrir(ator);
    expect(screen.queryByRole("menuitem", { name: /Central de avisos/ })).toBeNull();
  });

  it("com uma organização só (e sem ser dono da plataforma), a seção de organização some", async () => {
    sessao.user.organizations = [ORGS[0]!];
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    expect(screen.queryByText("Organização")).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Escale IA" })).toBeNull();
  });

  it("dono da plataforma vê o modo administrador e gerenciar organizações; Sair chama o signOut", async () => {
    sessao.user.is_platform_admin = true;
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    expect(screen.getByRole("menuitem", { name: /Modo administrador/ })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("menuitem", { name: "Gerenciar organizações" })).toHaveAttribute("href", "/admin/tenants");
    await ator.click(screen.getByRole("menuitem", { name: "Sair" }));
    expect(sessao.signOut).toHaveBeenCalled();
  });
});
