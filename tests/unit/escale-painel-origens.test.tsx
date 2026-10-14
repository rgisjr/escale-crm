import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({ apiClient: {} }));

import type { Origens } from "@/lib/escale/origens/regras";
import { PainelOrigens } from "@/components/escale/origens/PainelOrigens";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras" },
    { id: "g-cred", name: "Credenciados" },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras" },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred" },
    { id: "f-turma", name: "Turma 12", group_id: "g-cred" },
    { id: "f-solto", name: "Pós-venda", group_id: null },
  ],
};

function renderizar(podeGerenciar = true) {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <PainelOrigens origens={ORIGENS} podeGerenciar={podeGerenciar} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

const menu = () => screen.getByRole("navigation", { name: "Funis por grupo" });

describe("<PainelOrigens>", () => {
  it("lista os grupos por nome, com as iniciais, e abre o grupo do funil aberto", () => {
    renderizar();
    expect(within(menu()).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "CRCredenciados",
      "IOINSS de obras",
    ]);
    expect(within(menu()).getByRole("button", { name: "INSS de obras" })).toHaveAttribute("aria-expanded", "true");
    expect(within(menu()).getByRole("button", { name: "Credenciados" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Leads INSS WhatsApp" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Leads INSS WhatsApp" })).toHaveAttribute("href", "/app/pipelines/f-leads");
    expect(screen.queryByRole("link", { name: "Funil Nayara" })).toBeNull();
  });

  it("clicar no grupo abre e fecha os funis dele", async () => {
    const user = renderizar();
    await user.click(within(menu()).getByRole("button", { name: "Credenciados" }));
    expect(screen.getByRole("link", { name: "Funil Nayara" })).toBeInTheDocument();
    await user.click(within(menu()).getByRole("button", { name: "Credenciados" }));
    expect(screen.queryByRole("link", { name: "Funil Nayara" })).toBeNull();
  });

  it("funil sem grupo aparece em Sem grupo", () => {
    renderizar();
    expect(screen.getByText("Sem grupo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pós-venda" })).toBeInTheDocument();
  });

  it("a lupa filtra por grupo ou funil, sem acento, e diz quando não acha nada", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar grupo ou funil" }));
    const busca = screen.getByRole("textbox", { name: "Buscar grupo ou funil" });
    await user.type(busca, "nayara");
    expect(screen.getByRole("link", { name: "Funil Nayara" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Turma 12" })).toBeNull();
    expect(within(menu()).queryByRole("button", { name: "INSS de obras" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Pós-venda" })).toBeNull();
    await user.clear(busca);
    await user.type(busca, "zzz");
    expect(screen.getByText("Nada encontrado.")).toBeInTheDocument();
  });

  it("gerente abre Organizar origens; quem não é gerente não vê o botão", async () => {
    const user = renderizar(true);
    await user.click(screen.getByRole("button", { name: "Organizar origens" }));
    expect(await screen.findByRole("dialog", { name: "Organizar origens" })).toBeInTheDocument();
  });

  it("sem permissão de gerente, nada de Organizar origens", () => {
    renderizar(false);
    expect(screen.queryByRole("button", { name: "Organizar origens" })).toBeNull();
  });
});
