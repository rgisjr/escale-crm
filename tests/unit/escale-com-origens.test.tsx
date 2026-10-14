import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

let menu: string | undefined = "topo";
let papel = "manager";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) => (nome === "escale_menu" && menu ? { value: menu } : undefined),
  }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: papel })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/escale/origens/ler-origens", () => ({ lerOrigens: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: {} }));

import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { ComOrigens } from "@/components/escale/origens/ComOrigens";

function mostrar(elemento: ReactElement) {
  render(<QueryClientProvider client={new QueryClient()}>{elemento}</QueryClientProvider>);
}

beforeEach(() => {
  menu = "topo";
  papel = "manager";
  vi.mocked(lerOrigens).mockReset();
  vi.mocked(lerOrigens).mockResolvedValue({
    grupos: [{ id: "g-obras", name: "INSS de obras" }],
    funis: [{ id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras" }],
  });
});

describe("<ComOrigens>", () => {
  it("com a casca nova, o painel Origens fica ao lado do quadro", async () => {
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "INSS de obras" })).toBeInTheDocument();
    expect(screen.getByText("o quadro")).toBeInTheDocument();
    expect(lerOrigens).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("com a lateral (ou sem a chave), é a tela de sempre e o banco nem é lido", async () => {
    for (const valor of ["lateral", undefined]) {
      menu = valor;
      vi.mocked(lerOrigens).mockClear();
      const { unmount } = render(await ComOrigens({ children: <p>o quadro</p> }));
      expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
      expect(screen.getByText("o quadro")).toBeInTheDocument();
      expect(lerOrigens).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("banco sem a migration 9001 (ou fora do ar): o quadro abre sem o painel", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lerOrigens).mockRejectedValue(new Error('relation "public.crm_pipeline_groups" does not exist'));
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(screen.getByText("o quadro")).toBeInTheDocument();
  });

  it("quem não é gerente vê o painel, mas não Organizar origens", async () => {
    papel = "agent";
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Organizar origens" })).toBeNull();
  });
});
