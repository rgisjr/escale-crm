import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [] }) }));
vi.mock("@/components/escale/filtros/MenuDeFiltrosSalvos", () => ({ MenuDeFiltrosSalvos: () => <p>filtros salvos</p> }));

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

function barra(filtros: FiltrosDoQuadro = { status: ["open"] }, extra: Partial<BarraDoQuadroProps> = {}) {
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

describe("<BarraDoQuadro>", () => {
  it("mostra a contagem, a busca da origem e o status Em aberto", () => {
    const { props, rerender } = barra();
    expect(screen.getByText("21 negócios")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Pesquisar nessa origem…")).toBeInTheDocument();
    expect(screen.getByTestId("status-do-quadro")).toHaveTextContent("Em aberto");
    rerender(<BarraDoQuadro {...props} contagem={1} />);
    expect(screen.getByText("1 negócio")).toBeInTheDocument();
  });

  it("na visualização, a busca diz 'nessa visualização'", () => {
    barra({ status: ["open"] }, { alvo: { tipo: "visualizacao", id: "v-1" } });
    expect(screen.getByPlaceholderText("Pesquisar nessa visualização…")).toBeInTheDocument();
  });

  it("a busca espera a pessoa parar de digitar e mantém o filtro salvo aplicado", async () => {
    const { onMudar, u } = barra();
    await u.type(screen.getByRole("searchbox"), "ana");
    await waitFor(() => expect(onMudar).toHaveBeenCalledWith({ status: ["open"], busca: "ana" }, "s-1"));
    expect(onMudar).toHaveBeenCalledTimes(1);
  });

  it("o status muda pela barra, mantendo o filtro salvo aplicado", async () => {
    const { onMudar, u } = barra();
    await u.click(screen.getByTestId("status-do-quadro"));
    await u.click(screen.getByRole("menuitemcheckbox", { name: "Ganhos" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open", "won"] }, "s-1");
  });

  it("Ordenar: monta os critérios (com os campos do negócio) e aplica", async () => {
    const { onMudar, u } = barra();
    await u.click(screen.getByRole("button", { name: /^Ordenar/ }));
    expect(screen.getByText("Nenhum critério de ordenação")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Adicionar critério" }));
    await u.click(screen.getByRole("combobox", { name: "Campo 1" }));
    expect(screen.getByRole("option", { name: "Renda" })).toBeInTheDocument();
    await u.click(screen.getByRole("option", { name: "Valor do negócio" }));
    await u.selectOptions(screen.getByRole("combobox", { name: "Direção 1" }), "desc");
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

  it("o resumo fica visível com o painel fechado, e Limpar filtros solta o filtro salvo", async () => {
    const { onMudar, u } = barra({ status: ["open", "won"], tags: ["vip"], ordem: ORDEM });
    expect(screen.getByText("1 tag")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open", "won"], ordem: ORDEM }, null);
  });
});
