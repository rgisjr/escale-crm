import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CalendarioDePeriodo,
  type Periodo,
  type TipoDeData,
} from "@/components/escale/ui/CalendarioDePeriodo";
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";

function Controlado({
  inicial,
  aoMudar,
  tipos,
}: {
  inicial: Periodo;
  aoMudar?: (p: Periodo) => void;
  tipos?: TipoDeData[];
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <CalendarioDePeriodo
      valor={valor}
      tiposDisponiveis={tipos}
      aoMudar={(p) => {
        setValor(p);
        aoMudar?.(p);
      }}
    />
  );
}

const DATA_BR = /^\d{2}\/\d{2}\/\d{4}$/;
const diasDe = (grupo: HTMLElement) =>
  within(grupo)
    .getAllByRole("button")
    .filter((b) => DATA_BR.test(b.getAttribute("aria-label") ?? ""));

beforeEach(() => {
  // Só o relógio é falso: o user-event continua com os timers de verdade.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("<CalendarioDePeriodo>", () => {
  it("abre no mês de hoje e no seguinte, com a semana começando no domingo, como no print", () => {
    render(<Controlado inicial={{ tipo: "criacao" }} />);
    const outubro = screen.getByRole("group", { name: "outubro 2026" });
    expect(screen.getByRole("group", { name: "novembro 2026" })).toBeInTheDocument();
    expect(
      within(outubro)
        .getAllByText(/^(DOM|SEG|TER|QUA|QUI|SEX|SÁB)$/)
        .map((e) => e.textContent),
    ).toEqual(["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]);
    const dias = diasDe(outubro);
    expect(dias).toHaveLength(35);
    expect(dias[0]).toHaveAccessibleName("27/09/2026");
    expect(dias[0]).toHaveTextContent("27");
    expect(dias[4]).toHaveAccessibleName("01/10/2026");
    // o dia do mês vizinho tem o mesmo estilo (print)
    expect(dias[0]).toHaveClass("bg-casca-dia", "text-casca-marca", "h-[30px]", "w-8", "rounded-[6px]");
    expect(dias[4]).toHaveClass("bg-casca-dia", "text-casca-marca");
  });

  it("quando o valor já tem data, abre no mês dela", () => {
    render(<Controlado inicial={{ tipo: "criacao", de: "2026-03-05" }} />);
    expect(screen.getByRole("group", { name: "março 2026" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "abril 2026" })).toBeInTheDocument();
  });

  it("escolhe o intervalo em dois cliques, em qualquer ordem, e o terceiro recomeça", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "criacao" }} aoMudar={aoMudar} />);
    await u.click(screen.getByRole("button", { name: "20/10/2026" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao", de: "2026-10-20" });
    await u.click(screen.getByRole("button", { name: "12/10/2026" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao", de: "2026-10-12", ate: "2026-10-20" });
    expect(screen.getByRole("button", { name: "12/10/2026" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "20/10/2026" })).toHaveClass("bg-casca-marca", "text-accent-foreground");
    expect(screen.getByRole("button", { name: "15/10/2026" })).toHaveAttribute("data-no-intervalo");
    expect(screen.getByRole("button", { name: "15/10/2026" })).toHaveClass("bg-casca-marca-suave");
    expect(screen.getByRole("button", { name: "21/10/2026" })).not.toHaveAttribute("data-no-intervalo");
    expect(screen.getByRole("status")).toHaveTextContent("De 12/10/2026 a 20/10/2026");
    await u.click(screen.getByRole("button", { name: "05/11/2026" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao", de: "2026-11-05" });
    expect(screen.getByRole("status")).toHaveTextContent("A partir de 05/11/2026");
  });

  it("os atalhos da Clint, na ordem, com o ativo em azul; o mês acompanha", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "ganho" }} aoMudar={aoMudar} />);
    const atalhos = screen.getByRole("list", { name: "Atalhos de período" });
    expect(within(atalhos).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Hoje",
      "Ontem",
      "Essa semana",
      "Semana passada",
      "Esse mês",
      "Mês passado",
      "Esse ano",
    ]);
    await u.click(screen.getByRole("button", { name: "Essa semana" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "ganho", de: "2026-10-11", ate: "2026-10-17" });
    expect(screen.getByRole("button", { name: "Essa semana" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Essa semana" })).toHaveClass("text-casca-novo");
    expect(screen.getByRole("button", { name: "Hoje" })).toHaveClass("text-casca-texto-2");
    await u.click(screen.getByRole("button", { name: "Mês passado" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "ganho", de: "2026-09-01", ate: "2026-09-30" });
    expect(screen.getByRole("group", { name: "setembro 2026" })).toBeInTheDocument();
  });

  it("as quatro abas de tipo: só as pontas com canto, a ativa escura, e trocar mantém o período", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "criacao", de: "2026-10-01", ate: "2026-10-05" }} aoMudar={aoMudar} />);
    const abas = screen.getByRole("tablist", { name: "Tipo de data" });
    const todas = within(abas).getAllByRole("tab");
    expect(todas.map((a) => a.getAttribute("aria-label"))).toEqual([
      "Data de criação",
      "Data de ganho",
      "Data de perda",
      "Data agendada",
    ]);
    expect(todas[0]).toHaveAttribute("aria-selected", "true");
    expect(todas[0]).toHaveClass("bg-casca-texto-2", "rounded-l-[5px]", "h-[23px]", "w-[34px]");
    expect(todas[1]).toHaveClass("bg-casca-raia", "text-casca-texto-2");
    expect(todas[1]).not.toHaveClass("rounded-l-[5px]");
    expect(todas[3]).toHaveClass("rounded-r-[5px]");
    await u.click(screen.getByRole("tab", { name: "Data de perda" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "perda", de: "2026-10-01", ate: "2026-10-05" });
    await u.keyboard("{ArrowRight}");
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "agendado", de: "2026-10-01", ate: "2026-10-05" });
    expect(screen.getByRole("tab", { name: "Data agendada" })).toHaveFocus();
  });

  it("tiposDisponiveis desliga as outras abas (dica 'Em breve'), e as setas pulam as desligadas", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "perda" }} tipos={["criacao", "ganho", "perda"]} aoMudar={aoMudar} />);
    const todas = within(screen.getByRole("tablist", { name: "Tipo de data" })).getAllByRole("tab");
    // As 4 abas continuam no lugar, como no print; só a de fora da lista desliga.
    expect(todas).toHaveLength(4);
    const agendada = screen.getByRole("tab", { name: "Data agendada" });
    expect(agendada).toBeDisabled();
    expect(agendada).toHaveAttribute("title", "Em breve");
    expect(agendada).toHaveClass("rounded-r-[5px]");
    expect(screen.getByRole("tab", { name: "Data de ganho" })).toBeEnabled();
    await u.click(agendada);
    expect(aoMudar).not.toHaveBeenCalled();
    act(() => screen.getByRole("tab", { name: "Data de perda" }).focus());
    await u.keyboard("{ArrowRight}");
    // De "perda" a seta pula a desligada e volta ao começo.
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao" });
    expect(screen.getByRole("tab", { name: "Data de criação" })).toHaveFocus();
  });

  it("as setas andam um mês", async () => {
    const u = userEvent.setup();
    render(<Controlado inicial={{ tipo: "criacao" }} />);
    await u.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByRole("group", { name: "novembro 2026" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "dezembro 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "outubro 2026" })).toBeNull();
    await u.click(screen.getByRole("button", { name: "Mês anterior" }));
    await u.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByRole("group", { name: "setembro 2026" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "outubro 2026" })).toBeInTheDocument();
  });

  it("os dias andam pelo teclado (setas) e o Enter escolhe", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "criacao", de: "2026-10-15", ate: "2026-10-15" }} aoMudar={aoMudar} />);
    const quinze = screen.getByRole("button", { name: "15/10/2026" });
    expect(quinze).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("button", { name: "16/10/2026" })).toHaveAttribute("tabindex", "-1");
    act(() => quinze.focus());
    await u.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "16/10/2026" })).toHaveFocus();
    await u.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "23/10/2026" })).toHaveFocus();
    await u.keyboard("{Enter}");
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao", de: "2026-10-23" });
  });

  it("em espanhol, meses, dias, atalhos e abas mudam", () => {
    render(
      <IdiomaProvider locale="es">
        <Controlado inicial={{ tipo: "criacao" }} />
      </IdiomaProvider>,
    );
    expect(screen.getByRole("group", { name: "octubre 2026" })).toBeInTheDocument();
    expect(screen.getAllByText("LUN")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Esta semana" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fecha de creación" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeInTheDocument();
  });

  it("semAbas: Arquivos e Conversas usam só os calendários e os atalhos", () => {
    render(<CalendarioDePeriodo valor={{ tipo: "criacao" }} aoMudar={() => undefined} semAbas />);
    expect(screen.queryByRole("tablist", { name: "Tipo de data" })).toBeNull();
    expect(screen.getByRole("button", { name: "Hoje" })).toBeInTheDocument();
  });
});
