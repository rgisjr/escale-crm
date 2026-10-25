import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import type * as CardState from "@/lib/kanban/card-state";
import type * as ModuloDoCard from "@/components/escale/quadro/CardDaCasca";
import { describe, expect, it, vi } from "vitest";

const contagem = vi.hoisted(() => ({
  cartoes: 0,
  cardInput: 0,
  onOpens: new Set<unknown>(),
  onSelects: new Set<unknown>(),
}));

vi.mock("@hello-pangea/dnd", () => ({
  Droppable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children(
      { innerRef: () => {}, droppableProps: {}, placeholder: null },
      { isDraggingOver: false },
    ),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/escale/usePrefsDoCard", () => ({ usePrefsDoCard: () => ({ data: null }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", role: "agent" }),
  useUser: () => ({ id: "u-1" }),
}));
vi.mock("@/lib/kanban/card-state", async (original) => {
  const real = await original<typeof CardState>();
  return {
    ...real,
    buildCardInput: (...args: Parameters<typeof real.buildCardInput>) => {
      contagem.cardInput += 1;
      return real.buildCardInput(...args);
    },
  };
});
vi.mock("@/components/escale/quadro/CardDaCasca", async () => {
  const { memo } = await import("react");
  return {
    CardDaCasca: memo(function CardFalso(props: { onOpen?: unknown; onSelect?: unknown }) {
      contagem.cartoes += 1;
      contagem.onOpens.add(props.onOpen);
      contagem.onSelects.add(props.onSelect);
      return <div />;
    }),
  };
});

import { ColunaDoFunilNaCasca } from "@/components/escale/quadro/ColunaDoFunilNaCasca";
import type { Stage } from "@/lib/kanban/types";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

/** Q2b (G2-4): render da coluna sem mudança de dado não refaz os cards; `onOpen`/`onSelect` são estáveis. */
const ETAPA = {
  id: "e1",
  pipeline_id: "p-1",
  name: "Entrada",
  position: 1,
  is_won: false,
  is_lost: false,
  is_archived: false,
  color: null,
} as Stage;
const LEADS = [negocio("a"), negocio("b")];

describe("cards da casca memoizados", () => {
  it("rerender da coluna com as mesmas props não refaz card nem callbacks", () => {
    const props = {
      stage: ETAPA,
      leads: LEADS,
      pipelineId: "p-1",
      onOpen: vi.fn(),
      onSelectMany: vi.fn(),
    };
    const { rerender } = render(<ColunaDoFunilNaCasca {...props} />);
    const primeiraRodada = { ...contagem };
    rerender(<ColunaDoFunilNaCasca {...props} onOpen={vi.fn()} />);
    expect(contagem.cardInput).toBe(primeiraRodada.cardInput);
    expect(contagem.cartoes).toBe(primeiraRodada.cartoes);
    expect(contagem.onOpens.size).toBe(1);
    expect(contagem.onSelects.size).toBe(1);
  });

  it("o CardDaCasca de verdade é React.memo", async () => {
    const { CardDaCasca } = await vi.importActual<typeof ModuloDoCard>(
      "@/components/escale/quadro/CardDaCasca",
    );
    expect((CardDaCasca as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for("react.memo"),
    );
  });
});
