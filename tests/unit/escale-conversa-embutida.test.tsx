import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const marcar = vi.hoisted(() => vi.fn());
let espiao = false;
vi.mock("@/hooks/escale/useModoEspiao", () => ({ useModoEspiao: () => [espiao, vi.fn()] }));
vi.mock("@/hooks/inbox/useMarkAsRead", () => ({ useMarkAsRead: marcar }));
vi.mock("@/hooks/inbox/useConversation", () => ({
  useConversation: () => ({
    data: {
      id: "cv1",
      unread_count_for_assignee: 3,
      contacts: { name: "Maria" },
      channel_sessions: { provider: "waha" },
    },
    isPending: false,
  }),
  isNotFound: () => false,
}));
vi.mock("@/hooks/escale/useEstadoDoCompositor", () => ({
  useEstadoDoCompositor: () => ({
    modo: { tipo: "livre" },
    bloqueio: null,
    ultimaFoiTemplate: false,
    agora: new Date(),
  }),
}));
vi.mock("@/components/escale/conversas/centro/thread/ThreadDaCasca", () => ({
  ThreadDaCasca: ({ compacto }: { compacto?: boolean }) => (
    <div data-testid="thread">{compacto ? "compacta" : "inteira"}</div>
  ),
}));
let tooltipNoCompositor = false;
vi.mock("@/components/escale/conversas/centro/compositor/CompositorDaCasca", async () => {
  const { Tooltip, TooltipTrigger } = await import("@/components/ui/tooltip");
  return {
    CompositorDaCasca: () =>
      tooltipNoCompositor ? (
        <Tooltip>
          <TooltipTrigger>dica</TooltipTrigger>
        </Tooltip>
      ) : (
        <div data-testid="compositor" />
      ),
  };
});
vi.mock("@/components/escale/conversas/agendadas/JanelaAgendarMensagem", () => ({
  JanelaAgendarMensagem: () => null,
}));

import { ConversaEmbutida } from "@/components/escale/conversas/ConversaEmbutida";

beforeEach(() => {
  marcar.mockClear();
  espiao = false;
  tooltipNoCompositor = false;
});

describe("ConversaEmbutida (F3, F4)", () => {
  it("a thread compacta e o compositor; marca como lida fora do espião", () => {
    render(<ConversaEmbutida conversationId="cv1" compacta />);
    expect(screen.getByTestId("thread")).toHaveTextContent("compacta");
    expect(screen.getByTestId("compositor")).toBeInTheDocument();
    expect(marcar).toHaveBeenCalledWith("cv1", 3);
  });
  it("no modo espião não marca", () => {
    espiao = true;
    render(<ConversaEmbutida conversationId="cv1" />);
    expect(marcar).toHaveBeenCalledWith(null, 3);
  });
  it("traz o próprio TooltipProvider: o compositor com dica abre sem provedor por fora (lição da escale.15)", () => {
    // O dublê do compositor monta um Tooltip do Radix de verdade, que lança erro sem
    // TooltipProvider acima. O render NÃO embrulha em provedor: o painel flutuante e a
    // ficha do negócio não têm um, e a JanelaModelosDeMensagem do compositor usa dica.
    tooltipNoCompositor = true;
    expect(() => render(<ConversaEmbutida conversationId="cv1" />)).not.toThrow();
    expect(screen.getByText("dica")).toBeInTheDocument();
  });
});
