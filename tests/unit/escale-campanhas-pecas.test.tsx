import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BarraDeResultado } from "@/components/escale/campanhas/BarraDeResultado";
import { SeloDoStatus } from "@/components/escale/campanhas/SeloDoStatus";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const linha = (extra: Partial<LinhaDeCampanha> = {}): LinhaDeCampanha => ({
  id: "c1",
  nome: "10.09",
  status: "completed",
  numeroId: "s1",
  solicitados: 30,
  agendadaPara: null,
  iniciadaEm: "2026-09-10T15:39:00Z",
  criadaEm: "2026-09-10T12:00:00Z",
  adicionados: 30,
  enviados: 26,
  entregues: 24,
  lidos: 16,
  erros: 3,
  ...extra,
});

describe("SeloDoStatus (002)", () => {
  it("Completo no tom verde; a dica da Clint ao passar o mouse", () => {
    render(<SeloDoStatus status="completed" />);
    const selo = screen.getByText("Completo");
    expect(selo.className).toContain("--escale-tom-verde-fundo");
    fireEvent.mouseEnter(selo.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("O envio da campanha foi concluído.");
  });

  it("Em progresso pulsa; Pausada não", () => {
    const { rerender } = render(<SeloDoStatus status="running" />);
    expect(screen.getByText("Em progresso").className).toContain("animate-pulse");
    rerender(<SeloDoStatus status="paused" />);
    expect(screen.getByText("Pausada").className).not.toContain("animate-pulse");
  });
});

describe("BarraDeResultado (002, 008)", () => {
  it("os quatro segmentos na ordem da Clint; a dica '16 lidos - 53%'; o nome acessível com todos", () => {
    const { container } = render(<BarraDeResultado linha={linha()} />);
    const segmentos = [...container.querySelectorAll("[data-segmento]")].map((e) =>
      e.getAttribute("data-segmento"),
    );
    expect(segmentos).toEqual(["erro", "entregues", "lidos", "enviados"]);
    fireEvent.mouseEnter(container.querySelector('[data-segmento="lidos"]')!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("16 lidos - 53%");
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "3 inválidos ou com erro, 8 entregues - 27%, 16 lidos - 53%, 2 enviados - 7%",
    );
  });

  it("em andamento, as listras; pronta sem envio, o trilho vazio", () => {
    const { container, rerender } = render(
      <BarraDeResultado linha={linha({ status: "running" })} />,
    );
    expect(container.querySelector('[data-segmento="lidos"]')!.className).toContain(
      "escale-listras",
    );
    rerender(
      <BarraDeResultado
        linha={linha({ status: "ready", enviados: 0, entregues: 0, lidos: 0, erros: 0 })}
      />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName("Nenhum envio ainda");
  });

  it("agendada mostra o relógio com a data; sem lista, o traço", () => {
    const { rerender } = render(
      <BarraDeResultado
        linha={linha({ status: "scheduled", agendadaPara: "2026-10-20T13:00:00Z" })}
        fuso="America/Sao_Paulo"
      />,
    );
    expect(screen.getByLabelText("Agendada para 20/10/2026 10:00")).toBeInTheDocument();
    rerender(<BarraDeResultado linha={linha({ status: "draft", adicionados: 0 })} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
