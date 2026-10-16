import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contagem = vi.hoisted(() => ({ data: undefined as { fila?: number; unassigned?: number } | undefined }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org-1" } }) }));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({ useConversationCounts: () => ({ data: contagem.data }) }));

import { ContadorDaFilaDaCasca } from "@/components/escale/menu/ContadorDaFilaDaCasca";
import { SeloDaCasca } from "@/components/escale/menu/SeloDaCasca";

beforeEach(() => {
  contagem.data = undefined;
});

describe("<SeloDaCasca>", () => {
  it("zero não desenha nada", () => {
    const { container } = render(<SeloDaCasca valor={0} limite={99} rotulo="nada" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("vermelho da Clint, com o número limitado e o rótulo para leitor de tela", () => {
    render(<SeloDaCasca valor={120} limite={99} rotulo="120 conversas" />);
    const selo = screen.getByTestId("selo-da-casca");
    expect(selo).toHaveTextContent("99+");
    expect(selo).toHaveAttribute("aria-label", "120 conversas");
    expect(selo).toHaveClass("bg-casca-alerta", "text-white", "rounded-full");
  });

  it("no botão de conversas, acima de 9 vira +9", () => {
    render(<SeloDaCasca valor={12} limite={9} rotulo="12" />);
    expect(screen.getByTestId("selo-da-casca")).toHaveTextContent("+9");
  });
});

describe("<ContadorDaFilaDaCasca>", () => {
  it("mostra a fila com o rótulo de sempre", () => {
    contagem.data = { fila: 3 };
    render(<ContadorDaFilaDaCasca limite={99} />);
    expect(screen.getByLabelText("3 conversas esperando uma pessoa")).toHaveTextContent("3");
  });

  it("uma conversa: rótulo no singular; sem `fila`, usa `unassigned`", () => {
    contagem.data = { unassigned: 1 };
    render(<ContadorDaFilaDaCasca limite={9} />);
    expect(screen.getByLabelText("1 conversa esperando uma pessoa")).toHaveTextContent("1");
  });

  it("fila vazia: sem selo", () => {
    contagem.data = { fila: 0 };
    render(<ContadorDaFilaDaCasca limite={99} />);
    expect(screen.queryByTestId("selo-da-casca")).toBeNull();
  });
});
