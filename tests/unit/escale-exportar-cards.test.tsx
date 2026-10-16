import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
const baixar = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: { post } }));
vi.mock("@/lib/escale/exportar/baixar", () => ({ baixarCsv: baixar }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
const membros = vi.hoisted(() => ({
  estado: { data: [{ user_id: "u-1", full_name: "Bruno" }] as unknown, isError: false },
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => membros.estado,
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { ExportarCards } from "@/components/escale/filtros/ExportarCards";
import type { Stage } from "@/lib/kanban/types";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

const ETAPAS = [{ id: "e-entrada", name: "Entrada" }] as unknown as Stage[];
const LEADS = [
  negocio("l-1", { title: "Proposta ACME", owner_user_id: "u-1", owner_kind: "user" }),
  negocio("l-2"),
];

function exportar(leads = LEADS) {
  render(
    <ExportarCards
      origem={{ id: "p-1", nome: "Vendas" }}
      leads={leads}
      stages={ETAPAS}
      settings={{}}
    />,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

beforeEach(() => {
  post.mockReset();
  baixar.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  membros.estado = { data: [{ user_id: "u-1", full_name: "Bruno" }], isError: false };
});

describe("<ExportarCards> (ícone da linha de contagem)", () => {
  it("a dica diz quantos; Confirmar registra antes e baixa o CSV do que a tela mostra", async () => {
    post.mockResolvedValue({ data: { registrado: true } });
    const user = exportar();
    const botao = screen.getByRole("button", { name: "Exportar" });
    expect(botao).toHaveAttribute("title", "Exportar 2 Negócios");
    await user.click(botao);
    expect(
      screen.getByText("Tem certeza que deseja exportar os negócios dessa origem?"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(baixar).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith("/api/v1/exportacoes-do-quadro", {
      origem: "p-1",
      quantidade: 2,
    });
    const [nome, csv] = baixar.mock.calls[0] as [string, string];
    expect(nome).toMatch(/^negocios-vendas-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain("Proposta ACME,Entrada,Aberto,,,Bruno");
    expect(toast.success).toHaveBeenCalledWith("Os negócios foram exportados com sucesso.");
  });

  it("com um card só, a dica vai no singular", () => {
    exportar([LEADS[0]!]);
    expect(screen.getByRole("button", { name: "Exportar" })).toHaveAttribute(
      "title",
      "Exportar 1 Negócio",
    );
  });

  it("Cancelar fecha sem exportar", async () => {
    const user = exportar();
    await user.click(screen.getByRole("button", { name: "Exportar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(post).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Tem certeza que deseja exportar os negócios dessa origem?"),
    ).toBeNull();
  });

  it("a rota recusa: toast de falha e nada baixado", async () => {
    post.mockRejectedValue(new Error("403"));
    const user = exportar();
    await user.click(screen.getByRole("button", { name: "Exportar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Falha ao exportar os negócios, tente novamente ou chame o suporte.",
      ),
    );
    expect(baixar).not.toHaveBeenCalled();
  });

  it("a lista de donos falhou: toast de erro, nada registrado e nada baixado (sem coluna de dono em branco)", async () => {
    membros.estado = { data: undefined, isError: true };
    const user = exportar();
    await user.click(screen.getByRole("button", { name: "Exportar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não consegui completar essa ação. Tente de novo."),
    );
    expect(post).not.toHaveBeenCalled();
    expect(baixar).not.toHaveBeenCalled();
  });

  it("sem cards, desligado com a dica da Clint", () => {
    exportar([]);
    const botao = screen.getByRole("button", { name: "Exportar" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Nenhum negócio para exportar.");
  });
});
