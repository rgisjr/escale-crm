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
vi.mock("@/hooks/escale/usePrefsDoCard", () => ({
  usePrefsDoCard: () => ({ data: null }),
  useSalvarPrefsDoCard: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/components/escale/filtros/MenuDeFiltrosSalvos", () => ({
  MenuDeFiltrosSalvos: () => <p>filtros salvos</p>,
}));
vi.mock("@/components/escale/filtros/ExportarCards", () => ({
  ExportarCards: () => <button type="button">Exportar</button>,
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

  it("com ordenação ativa, avisa que arrastar dentro da coluna está desligado", () => {
    barra({ status: ["open"], ordem: ORDEM });
    expect(screen.getByText(/Ordenação ativa/)).toBeInTheDocument();
  });

  it("Atualizar relê o quadro", async () => {
    const { onAtualizar, u } = barra();
    await u.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(onAtualizar).toHaveBeenCalled();
  });

  it("sem a prop exportacao, não há ícone de Exportar (Visualização, abaixo de gerente)", () => {
    barra();
    expect(screen.queryByRole("button", { name: "Exportar" })).toBeNull();
  });

  it("com exportacao, o ícone de Exportar aparece na linha de contagem (Fase 1E)", () => {
    barra(
      { status: ["open"] },
      {
        exportacao: {
          origem: { id: "p-1", nome: "Vendas" },
          leads: [negocio("l1")],
          stages: [],
        },
      },
    );
    expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument();
  });

  it("Ajuda aparece como na Clint, desligada", () => {
    barra();
    expect(screen.getByRole("button", { name: "Ajuda" })).toBeDisabled();
  });

  it("Personalizar cards fica ligado na linha de contagem, logo depois de Atualizar (Fase 1E)", () => {
    barra();
    const linha = screen.getByTestId("contagem-do-quadro").parentElement!.parentElement!;
    const nomes = within(linha)
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label"));
    const personalizar = screen.getAllByRole("button", { name: "Personalizar cards" })[0]!;
    expect(personalizar).toBeEnabled();
    expect(nomes.indexOf("Personalizar cards")).toBe(nomes.indexOf("Atualizar") + 1);
  });

  it("o painel único de filtros e os chips saíram: a Clint usa um gatilho por filtro (D4)", () => {
    expect(existsSync("components/escale/filtros/PainelDeFiltros.tsx")).toBe(false);
    expect(existsSync("components/escale/filtros/ResumoDosFiltros.tsx")).toBe(false);
  });
});
