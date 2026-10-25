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
vi.mock("@/lib/escale/visualizacoes/ler-visualizacoes", () => ({ lerVisualizacoes: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: {} }));
vi.mock("@/lib/escale/origens/guardar-preferencia", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));

import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { lerVisualizacoes } from "@/lib/escale/visualizacoes/ler-visualizacoes";
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
  vi.mocked(lerVisualizacoes).mockReset();
  vi.mocked(lerVisualizacoes).mockResolvedValue([
    { id: "v-1", name: "Time comercial", acesso: "todos", origens: ["f-leads"], pessoas: [] },
  ]);
});

describe("<ComOrigens>", () => {
  it("com a casca nova, o painel Origens fica ao lado do quadro", async () => {
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.getByText("o quadro")).toBeInTheDocument();
    expect(lerOrigens).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("G4-3: lê origens e visualizações em paralelo (a segunda começa antes de a primeira acabar)", async () => {
    let liberar: () => void = () => undefined;
    vi.mocked(lerOrigens).mockImplementationOnce(
      () => new Promise((resolve) => (liberar = () => resolve({ grupos: [], funis: [] }))),
    );
    vi.mocked(lerVisualizacoes).mockClear();
    const pronto = ComOrigens({ children: <p>o quadro</p> });
    await vi.waitFor(() => expect(lerVisualizacoes).toHaveBeenCalled());
    liberar();
    await pronto;
  });

  it("com a lateral, é a tela de sempre e o banco nem é lido", async () => {
    cookies = { escale_menu: "lateral" };
    vi.mocked(lerOrigens).mockClear();
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(lerOrigens).not.toHaveBeenCalled();
  });

  it("sem a chave, vale o padrão: a casca, com o painel Origens", async () => {
    cookies = {};
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
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

  it("as visualizações chegam na seção do painel, lidas da organização ativa", async () => {
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("link", { name: /Time comercial/ })).toHaveAttribute(
      "href",
      "/app/pipelines/visualizacoes/v-1",
    );
    expect(lerVisualizacoes).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("banco sem a migration 9003 (ou fora do ar): o painel abre com a seção vazia", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lerVisualizacoes).mockRejectedValue(new Error('relation "crm_pipeline_views" does not exist'));
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.getByText("Nenhuma visualização ainda.")).toBeInTheDocument();
  });

  it("casca V3: o painel fica colado no topo, na esquerda e no fundo, e o conteúdo começa 20px depois dele", async () => {
    const { container } = mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    const envoltorio = container.firstElementChild!;
    expect(envoltorio).toHaveClass("md:-mt-6", "md:-ml-6");
    expect(envoltorio.className).toContain("var(--rodape-ocupado,0px)");
    expect(screen.getByText("o quadro").parentElement).toHaveClass("md:pl-5", "md:pt-6");
  });

  it("casca V3: sem a casca nova, o quadro do original chega sem embrulho nenhum", async () => {
    cookies = { escale_menu: "lateral" };
    const { container } = mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(container.innerHTML).toBe("<p>o quadro</p>");
  });
});
