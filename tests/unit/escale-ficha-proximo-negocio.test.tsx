import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), busca: "st=open" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.busca),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/components/escale/ui/AjudaDaCasca", () => ({
  AjudaDaCasca: ({ texto }: { texto: string }) => <span data-testid="ajuda">{texto}</span>,
}));

import { ProximoNegocio } from "@/components/escale/negocio/ProximoNegocio";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C8; prints 01 e 11): o próximo negócio da etapa, na ordem e nos filtros do quadro. */
const etapa = (id: string, position: number, name: string): Stage =>
  ({ id, position, name, is_won: false, is_lost: false, is_archived: false }) as Stage;
const negocio = (id: string, stage_id: string, position_in_stage: number, title = id): Lead =>
  ({ id, stage_id, position_in_stage, title }) as Lead;
const ETAPAS = [etapa("e1", 1, "1. Entrada Lead"), etapa("e2", 2, "2. Em atendimento")];
const LEADS = [
  negocio("a", "e1", 1),
  negocio("b", "e1", 2, "Bruno"),
  negocio("c", "e1", 3, "Carla"),
  negocio("x", "e2", 1, "Xavier"),
];

beforeEach(() => {
  nav.push.mockReset();
  nav.replace.mockReset();
  nav.busca = "st=open";
});

describe("<ProximoNegocio>", () => {
  it("as setas levam ao anterior e ao próximo da etapa, com os filtros do quadro", async () => {
    render(
      <ProximoNegocio
        lead={LEADS[1]!}
        etapas={ETAPAS}
        leads={LEADS}
        ordem={undefined}
        aba="atividades"
      />,
    );
    expect(screen.getByRole("button", { name: "Próximo negócio" })).toHaveAttribute(
      "title",
      "Carla",
    );
    await userEvent.click(screen.getByRole("button", { name: "Próximo negócio" }));
    expect(nav.push).toHaveBeenCalledWith("/app/negocios/c?st=open");
    await userEvent.click(screen.getByRole("button", { name: "Negócio anterior" }));
    expect(nav.push).toHaveBeenLastCalledWith("/app/negocios/a?st=open");
  });

  it("sem vizinho, a seta fica desligada com o texto da Clint", () => {
    render(
      <ProximoNegocio
        lead={LEADS[0]!}
        etapas={ETAPAS}
        leads={LEADS}
        ordem={undefined}
        aba="atividades"
      />,
    );
    const anterior = screen.getByRole("button", { name: "Negócio anterior" });
    expect(anterior).toBeDisabled();
    expect(anterior).toHaveAttribute("title", "Não existem negócios anteriores nesta etapa.");
  });

  it("fechado mostra só ▾ ‹ ›; aberto, 'Próximo negócio', a ajuda e a etapa; escolher outra etapa vai na URL", async () => {
    render(
      <ProximoNegocio
        lead={LEADS[1]!}
        etapas={ETAPAS}
        leads={LEADS}
        ordem={undefined}
        aba="historico"
      />,
    );
    expect(screen.queryByTestId("ajuda")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Etapa do próximo negócio" }));
    expect(screen.getByTestId("ajuda")).toHaveTextContent(
      "O próximo negócio leva em consideração a ordem e os filtros atuais da listagem de negócios.",
    );
    expect(screen.getByRole("option", { name: "1. Entrada Lead" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.click(screen.getByRole("option", { name: "2. Em atendimento" }));
    expect(nav.replace).toHaveBeenCalledWith("/app/negocios/b?st=open&aba=historico&pe=e2", {
      scroll: false,
    });
  });

  it("com outra etapa escolhida (pe), a seta › leva ao primeiro dela e a ‹ fica desligada", async () => {
    nav.busca = "st=open&pe=e2";
    render(
      <ProximoNegocio
        lead={LEADS[1]!}
        etapas={ETAPAS}
        leads={LEADS}
        ordem={undefined}
        aba="atividades"
      />,
    );
    expect(screen.getByRole("button", { name: "Negócio anterior" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Próximo negócio" }));
    expect(nav.push).toHaveBeenCalledWith("/app/negocios/x?st=open&pe=e2");
  });
});
