import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CampoDeBuscaDaLista } from "@/components/escale/ui/CampoDeBuscaDaLista";

/** Q3 (G3-9): a tecla renderiza só o campo; a página é avisada uma vez, depois da espera. */
describe("CampoDeBuscaDaLista", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("a página não renderiza de novo a cada tecla e recebe a busca aparada uma vez", () => {
    let renders = 0;
    const aoBuscar = vi.fn();
    function Pagina() {
      renders += 1;
      return <CampoDeBuscaDaLista valorDaUrl="" aoBuscar={aoBuscar} rotulo="Buscar" atrasoMs={250} className="x" />;
    }
    render(<Pagina />);
    const campo = screen.getByLabelText("Buscar");
    for (const v of ["a", "al", "ale ", "ale x "]) fireEvent.change(campo, { target: { value: v } });
    expect(renders).toBe(1);
    expect(aoBuscar).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(250));
    expect(aoBuscar).toHaveBeenCalledTimes(1);
    expect(aoBuscar).toHaveBeenCalledWith("ale x");
  });

  it("apagar o texto manda null; igual ao da URL não avisa", () => {
    const aoBuscar = vi.fn();
    render(<CampoDeBuscaDaLista valorDaUrl="ana" aoBuscar={aoBuscar} rotulo="Buscar" atrasoMs={250} className="x" />);
    act(() => void vi.advanceTimersByTime(300));
    expect(aoBuscar).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "" } });
    act(() => void vi.advanceTimersByTime(250));
    expect(aoBuscar).toHaveBeenCalledWith(null);
  });
});
