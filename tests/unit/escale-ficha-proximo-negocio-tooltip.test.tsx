import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("st=open"),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { ProximoNegocio } from "@/components/escale/negocio/ProximoNegocio";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/**
 * FORK ESCALE · Q0b (B2-1): o Tooltip é o REAL e não há `TooltipProvider` no
 * wrapper. Abrir o seletor não pode derrubar a ficha (o outro teste mocka o
 * Tooltip e escondia o erro).
 */
const etapa = (id: string, position: number, name: string): Stage =>
  ({ id, position, name, is_won: false, is_lost: false, is_archived: false }) as Stage;
const ETAPAS = [etapa("e1", 1, "1. Entrada Lead"), etapa("e2", 2, "2. Em atendimento")];
const LEAD = { id: "a", stage_id: "e1", position_in_stage: 1, title: "a" } as Lead;

describe("<ProximoNegocio> com o Tooltip real", () => {
  it("abrir o seletor mostra a ajuda sem exigir um TooltipProvider acima", async () => {
    render(
      <ProximoNegocio lead={LEAD} etapas={ETAPAS} leads={[LEAD]} ordem={undefined} aba="atividades" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Etapa do próximo negócio" }));
    expect(screen.getByRole("button", { name: /^Ajuda:/ })).toBeInTheDocument();
  });
});
