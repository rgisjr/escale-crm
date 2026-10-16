import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({ data: [] }),
}));
vi.mock("@/hooks/escale/usePrefsDoCard", () => ({
  usePrefsDoCard: () => ({ data: null }),
  useSalvarPrefsDoCard: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/components/escale/filtros/MenuDeFiltrosSalvos", () => ({
  MenuDeFiltrosSalvos: () => <p>filtros salvos</p>,
}));

import { BarraDoQuadro, type BarraDoQuadroProps } from "@/components/escale/filtros/BarraDoQuadro";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const CAMPOS = camposFiltraveis([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);
const ORDEM = [{ campo: "negocio.valor", direcao: "desc" as const }];

function barra(filtros: FiltrosDoQuadro = { status: ["open"] }) {
  const props: BarraDoQuadroProps = {
    alvo: { tipo: "origem", id: "p-1" },
    filtros,
    filtroSalvoId: "s-1",
    onMudar: vi.fn(),
    leads: [negocio("l1", { tags: ["vip"] })],
    campos: CAMPOS,
    contagem: 21,
    onAtualizar: vi.fn(),
  };
  render(<BarraDoQuadro {...props} />);
  return { ...props, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

describe("linha de contagem da Fase 1E (Task 7B, E15)", () => {
  it("a engrenagem fica para a 1F: desligada, com a dica 'Em breve'", () => {
    barra();
    const engrenagem = screen.getByRole("button", { name: "Configurações da origem" });
    expect(engrenagem).toBeDisabled();
    expect(engrenagem).toHaveAttribute("title", "Em breve");
    expect(screen.queryByRole("button", { name: "Configurações do quadro" })).toBeNull();
  });

  it("o botão Ordenar abre a ordenação da 1D e aplica", async () => {
    const { onMudar, u } = barra();
    await u.click(screen.getByRole("button", { name: "Ordenar" }));
    expect(screen.getByText("Nenhum critério de ordenação")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Adicionar critério" }));
    await u.click(screen.getByRole("combobox", { name: "Campo 1" }));
    await u.click(screen.getByRole("option", { name: "Valor do negócio" }));
    await u.click(screen.getByRole("combobox", { name: "Direção 1" }));
    await u.click(screen.getByRole("option", { name: "Decrescente" }));
    await u.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open"], ordem: ORDEM }, "s-1");
    // aplicar fecha o painel
    expect(screen.queryByText("Nenhum critério de ordenação")).toBeNull();
  });

  it("Ordenar abre o painel já com a ordenação ativa e Cancelar fecha sem aplicar", async () => {
    const { onMudar, u } = barra({ status: ["open"], ordem: ORDEM });
    await u.click(screen.getByRole("button", { name: "Ordenar" }));
    expect(screen.getByRole("combobox", { name: "Campo 1" })).toHaveTextContent("Valor do negócio");
    await u.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onMudar).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox", { name: "Campo 1" })).toBeNull();
  });

  it("'Mais filtros' traz Filtros salvos e Limpar filtros no rodapé; Limpar fica desligado sem critério", async () => {
    const { u } = barra();
    await u.click(screen.getByRole("button", { name: /^Mais filtros/ }));
    expect(screen.getByText("filtros salvos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Limpar filtros/ })).toBeDisabled();
  });

  it("Limpar filtros limpa os critérios e solta o filtro salvo", async () => {
    const { onMudar, u } = barra({ status: ["open", "won"], tags: ["vip"], ordem: ORDEM });
    await u.click(screen.getByRole("button", { name: /^Mais filtros/ }));
    await u.click(screen.getByRole("button", { name: /Limpar filtros/ }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open", "won"], ordem: ORDEM }, null);
  });

  it("a ordem dos botões da linha: Ordenar, Atualizar, Personalizar cards, Exportar, engrenagem, Ajuda", () => {
    barra();
    const linha = screen.getByTestId("contagem-do-quadro").parentElement!.parentElement!;
    const nomes = within(linha)
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label"));
    expect(nomes).toEqual([
      "Ordenar",
      "Atualizar",
      "Personalizar cards",
      "Exportar",
      "Configurações da origem",
      "Ajuda",
    ]);
  });
});
