import { existsSync } from "node:fs";

import { render, screen, waitFor, within } from "@testing-library/react";
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

function barra(
  filtros: FiltrosDoQuadro = { status: ["open"] },
  extra: Partial<BarraDoQuadroProps> = {},
) {
  const props: BarraDoQuadroProps = {
    alvo: { tipo: "origem", id: "p-1" },
    filtros,
    filtroSalvoId: "s-1",
    onMudar: vi.fn(),
    leads: [negocio("l1", { tags: ["vip"] })],
    campos: CAMPOS,
    contagem: 21,
    onAtualizar: vi.fn(),
    ...extra,
  };
  const { rerender } = render(<BarraDoQuadro {...props} />);
  return { ...props, props, rerender, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

describe("<BarraDoQuadro> da casca (Casca V4)", () => {
  it("a busca e os seis gatilhos, na ordem da Clint", () => {
    barra();
    expect(screen.getByRole("searchbox", { name: "Pesquisar nessa origem…" })).toBeInTheDocument();
    const grupo = screen.getByRole("group", { name: "Filtros" });
    expect(
      within(grupo)
        .getAllByRole("button")
        .map((b) => b.textContent?.replace(/\d+/g, "").trim()),
    ).toEqual(["Data", "Campos", "Tags", "Dono do negócio", "Status", "Mais filtros"]);
  });

  it("na visualização, a busca diz 'nessa visualização'", () => {
    barra({ status: ["open"] }, { alvo: { tipo: "visualizacao", id: "v-1" } });
    expect(
      screen.getByRole("searchbox", { name: "Pesquisar nessa visualização…" }),
    ).toBeInTheDocument();
  });

  it("a contagem usa o número real e o plural", () => {
    const { props, rerender } = barra();
    expect(screen.getByTestId("contagem-do-quadro")).toHaveTextContent(
      "21 oportunidades de Negócio",
    );
    rerender(<BarraDoQuadro {...props} contagem={1} />);
    expect(screen.getByTestId("contagem-do-quadro")).toHaveTextContent("1 oportunidade de Negócio");
    rerender(<BarraDoQuadro {...props} contagem={0} />);
    expect(screen.getByTestId("contagem-do-quadro")).toHaveTextContent(
      "0 oportunidades de Negócio",
    );
  });

  it("a busca espera a pessoa parar de digitar e mantém o filtro salvo aplicado", async () => {
    const { onMudar, u } = barra();
    await u.type(screen.getByRole("searchbox", { name: "Pesquisar nessa origem…" }), "ana");
    await waitFor(() =>
      expect(onMudar).toHaveBeenCalledWith({ status: ["open"], busca: "ana" }, "s-1"),
    );
    expect(onMudar).toHaveBeenCalledTimes(1);
  });

  it("o selo de cada gatilho mostra o que está ligado", () => {
    barra({ status: ["open", "won"], tags: ["vip"], dono: "u-1" });
    expect(screen.getByTestId("status-do-quadro")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: /^Tags/ })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: /^Dono do negócio/ })).toHaveTextContent("1");
  });

  it("o status muda pelo gatilho, mantendo o filtro salvo aplicado", async () => {
    const { onMudar, u } = barra();
    await u.click(screen.getByTestId("status-do-quadro"));
    await u.click(screen.getByRole("checkbox", { name: "Ganhos" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open", "won"] }, "s-1");
  });

  it("Ordenar mora na engrenagem: monta os critérios e aplica", async () => {
    const { onMudar, u } = barra();
    await u.click(screen.getByRole("button", { name: "Configurações do quadro" }));
    await u.click(screen.getByRole("button", { name: /^Ordenar/ }));
    expect(screen.getByText("Nenhum critério de ordenação")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Adicionar critério" }));
    await u.click(screen.getByRole("combobox", { name: "Campo 1" }));
    expect(screen.getByRole("option", { name: "Renda" })).toBeInTheDocument();
    await u.click(screen.getByRole("option", { name: "Valor do negócio" }));
    await u.click(screen.getByRole("combobox", { name: "Direção 1" }));
    await u.click(screen.getByRole("option", { name: "Decrescente" }));
    await u.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open"], ordem: ORDEM }, "s-1");
  });

  it("com ordenação ativa, avisa que arrastar dentro da coluna está desligado", () => {
    barra({ status: ["open"], ordem: ORDEM });
    expect(screen.getByText(/Ordenação ativa/)).toBeInTheDocument();
  });

  it("Atualizar relê o quadro", async () => {
    const { onAtualizar, u } = barra();
    await u.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(onAtualizar).toHaveBeenCalled();
  });

  it("Exportar e Ajuda aparecem como na Clint, desligados", () => {
    barra();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ajuda" })).toBeDisabled();
  });

  it("na engrenagem: os filtros salvos, Limpar filtros (solta o filtro salvo) e Personalizar desligado", async () => {
    const { onMudar, u } = barra({ status: ["open", "won"], tags: ["vip"], ordem: ORDEM });
    await u.click(screen.getByRole("button", { name: "Configurações do quadro" }));
    expect(screen.getByText("filtros salvos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Personalizar cards/ })).toBeDisabled();
    await u.click(screen.getByRole("button", { name: /Limpar filtros/ }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open", "won"], ordem: ORDEM }, null);
  });

  it("o painel único de filtros e os chips saíram: a Clint usa um gatilho por filtro (D4)", () => {
    expect(existsSync("components/escale/filtros/PainelDeFiltros.tsx")).toBe(false);
    expect(existsSync("components/escale/filtros/ResumoDosFiltros.tsx")).toBe(false);
  });
});
