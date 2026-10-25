import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  camposDaCapa,
  PREFS_PADRAO,
  type CampoDaCapa,
  type PrefsDoCard,
} from "@/lib/escale/capa/tipos";

vi.mock("@hello-pangea/dnd", () => ({
  Droppable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children(
      { innerRef: () => {}, droppableProps: {}, placeholder: null },
      { isDraggingOver: false },
    ),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", role: "agent" }),
  useUser: () => ({ id: "u-1" }),
}));
vi.mock("@/hooks/escale/usePrefsDoCard", async () => {
  const { PREFS_PADRAO: padrao } = await import("@/lib/escale/capa/tipos");
  return {
    usePrefsDoCard: () => ({ data: { ...padrao, itens: { ...padrao.itens, valor: false } } }),
  };
});
vi.mock("@/components/escale/quadro/CardDaCasca", () => ({
  CardDaCasca: ({
    lead,
    prefs,
    camposDoCard,
    onOpen,
  }: {
    lead: { id: string };
    prefs?: PrefsDoCard;
    camposDoCard?: readonly CampoDaCapa[];
    onOpen?: (id: string) => void;
  }) => (
    <>
      <p data-testid={`card-${lead.id}`}>
        {`valor ${String(prefs?.itens.valor)} · campos ${camposDoCard?.length ?? 0}`}
      </p>
      <button type="button" onClick={() => onOpen?.(lead.id)}>
        {`abrir ${lead.id}`}
      </button>
    </>
  ),
}));

import { ColunaDoFunilNaCasca } from "@/components/escale/quadro/ColunaDoFunilNaCasca";
import {
  ColunaDaVisualizacao,
  type ContextoDosCards,
} from "@/components/escale/visualizacoes/ColunaDaVisualizacao";
import type { Stage } from "@/lib/kanban/types";
import type { ColunaCombinada } from "@/lib/escale/visualizacoes/regras";
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

const LEADS = [negocio("a"), negocio("b")];
const CAMPOS = camposDaCapa([]);

describe("as colunas da casca passam a preferência ao card", () => {
  it("o funil: prefs da pessoa e campos oferecidos chegam aos dois cards", () => {
    expect(PREFS_PADRAO.itens.valor).toBe(true);
    render(
      <ColunaDoFunilNaCasca
        stage={
          {
            id: "e1",
            pipeline_id: "p-1",
            name: "Entrada",
            position: 1,
            is_won: false,
            is_lost: false,
            is_archived: false,
            color: null,
          } as Stage
        }
        leads={LEADS}
        pipelineId="p-1"
        camposDoCard={CAMPOS}
      />,
    );
    for (const id of ["a", "b"]) {
      expect(screen.getByTestId(`card-${id}`)).toHaveTextContent("valor false · campos 2");
    }
  });

  it("a Visualização: prefs da pessoa e campos do contexto chegam aos dois cards", () => {
    const contexto: ContextoDosCards = {
      nomeDaOrigem: { "p-1": "Vendas" },
      tagsCanonicas: {},
      ownerNames: new Map(),
      coolingIds: new Set(),
      reactivations: new Map(),
      camposDoCard: CAMPOS,
    };
    const coluna: ColunaCombinada = {
      chave: "entrada",
      nome: "Entrada",
      destinos: {},
    } as ColunaCombinada;
    render(
      <ColunaDaVisualizacao
        coluna={coluna}
        leads={LEADS}
        contexto={contexto}
        pulsos={new Map()}
        selecionados={new Set()}
        onSelectMany={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    for (const id of ["a", "b"]) {
      expect(screen.getByTestId(`card-${id}`)).toHaveTextContent("valor false · campos 2");
    }
  });
});

describe("abrir um card guarda o negócio nos Recentes (Fase 1E)", () => {
  const CHAVE = "escale:negocios-recentes:v2:org-1:u-1";
  beforeEach(() => window.localStorage.clear());
  const guardado = () =>
    JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}") as {
      fixados: unknown[];
      recentes: Array<Record<string, unknown>>;
    };

  it("o funil: o título, a origem e o telefone ficam na chave desta pessoa; o onOpen continua chamado", () => {
    const onOpen = vi.fn();
    render(
      <ColunaDoFunilNaCasca
        stage={
          {
            id: "e1",
            pipeline_id: "p-1",
            name: "Entrada",
            position: 1,
            is_won: false,
            is_lost: false,
            is_archived: false,
            color: null,
          } as Stage
        }
        leads={LEADS}
        pipelineId="p-1"
        nomeDaOrigem="Vendas"
        onOpen={onOpen}
      />,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "abrir b" }));
    });
    expect(onOpen).toHaveBeenCalledWith("b");
    expect(guardado().recentes).toEqual([
      expect.objectContaining({ id: "b", titulo: "Negócio b", origemId: "p-1", origem: "Vendas" }),
    ]);
  });

  it("a Visualização: a origem é a do próprio negócio", () => {
    const contexto: ContextoDosCards = {
      nomeDaOrigem: { "p-1": "Vendas" },
      tagsCanonicas: {},
      ownerNames: new Map(),
      coolingIds: new Set(),
      reactivations: new Map(),
      camposDoCard: CAMPOS,
    };
    const onOpen = vi.fn();
    render(
      <ColunaDaVisualizacao
        coluna={{ chave: "entrada", nome: "Entrada", destinos: {} } as ColunaCombinada}
        leads={LEADS}
        contexto={contexto}
        pulsos={new Map()}
        selecionados={new Set()}
        onSelectMany={vi.fn()}
        onOpen={onOpen}
      />,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "abrir a" }));
    });
    expect(onOpen).toHaveBeenCalledWith("a");
    expect(guardado().recentes).toEqual([
      expect.objectContaining({ id: "a", titulo: "Negócio a", origemId: "p-1", origem: "Vendas" }),
    ]);
  });
});
