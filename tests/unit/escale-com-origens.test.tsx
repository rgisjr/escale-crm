import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

let cookies: Record<string, string> = {};
let papel = "manager";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nome: string) => (nome in cookies ? { value: cookies[nome] } : undefined) }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: papel })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/escale/origens/ler-origens", () => ({ lerOrigens: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: {} }));
vi.mock("@/app/actions/escale/origens", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));

import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { ComOrigens } from "@/components/escale/origens/ComOrigens";

const G = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

function mostrar(elemento: ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{elemento}</QueryClientProvider>);
}

beforeEach(() => {
  cookies = { escale_menu: "topo" };
  papel = "manager";
  vi.mocked(lerOrigens).mockReset();
  vi.mocked(lerOrigens).mockResolvedValue({
    grupos: [{ id: G, name: "INSS de obras", color: null, icon: "iniciais", is_archived: false }],
    funis: [{ id: "f-leads", name: "Leads INSS WhatsApp", group_id: G, is_archived: false, is_default: true }],
  });
});

describe("<ComOrigens>", () => {
  it("com a casca nova, o painel Origens fica ao lado do quadro", async () => {
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.getByText("o quadro")).toBeInTheDocument();
    expect(lerOrigens).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("com a lateral (ou sem a chave), é a tela de sempre e o banco nem é lido", async () => {
    for (const menu of ["lateral", undefined]) {
      cookies = menu ? { escale_menu: menu } : {};
      vi.mocked(lerOrigens).mockClear();
      const { unmount } = mostrar(await ComOrigens({ children: <p>o quadro</p> }));
      expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
      expect(lerOrigens).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("o painel recolhido no cookie já chega recolhido", async () => {
    cookies = { escale_menu: "topo", escale_origens_painel: "fechado" };
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir o painel de origens" })).toBeInTheDocument();
  });

  it("o grupo oculto no cookie já chega oculto", async () => {
    cookies = { escale_menu: "topo", escale_origens_ocultos: G };
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("button", { name: /INSS de obras$/ })).toBeNull();
    expect(screen.getByText("1 grupo oculto")).toBeInTheDocument();
  });

  it("banco sem a migration (ou fora do ar): o quadro abre sem o painel", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lerOrigens).mockRejectedValue(new Error('column "is_archived" does not exist'));
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(screen.getByText("o quadro")).toBeInTheDocument();
  });

  it("quem não é gerente vê o painel, mas não o + de Origens", async () => {
    papel = "agent";
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar" })).toBeNull();
  });
});
