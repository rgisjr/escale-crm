import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LinhaDeContagem } from "@/components/escale/filtros/LinhaDeContagem";
import {
  EVENTO_DAS_CONFIGURACOES,
  abrirConfiguracoesDaOrigem,
  useAoAbrirConfiguracoesDaOrigem,
} from "@/lib/escale/configuracoes/abrir";

/** FORK ESCALE · Fase 1F (F20): a engrenagem da linha de contagem abre as configurações da origem (print 15 da 1E). */
function Escuta({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  useAoAbrirConfiguracoesDaOrigem(aoAbrir);
  return null;
}

describe("a engrenagem da linha de contagem", () => {
  it("com configurar: ligada, com a dica da Clint, e o clique chama", async () => {
    const configurar = vi.fn();
    render(
      <LinhaDeContagem
        contagem={3}
        ordemAtiva={false}
        onAtualizar={() => {}}
        configurar={configurar}
      />,
    );
    const engrenagem = screen.getByRole("button", { name: "Configurações da origem" });
    expect(engrenagem).toBeEnabled();
    expect(engrenagem).toHaveAttribute("title", "Configurações da origem");
    await userEvent.click(engrenagem);
    expect(configurar).toHaveBeenCalledTimes(1);
  });

  it("sem configurar: desligada, com a dica pedida ou 'Em breve'", () => {
    const { unmount } = render(
      <LinhaDeContagem
        contagem={3}
        ordemAtiva={false}
        onAtualizar={() => {}}
        dicaDaEngrenagem="Sem permissão"
      />,
    );
    expect(screen.getByRole("button", { name: "Configurações da origem" })).toHaveAttribute(
      "title",
      "Sem permissão",
    );
    expect(screen.getByRole("button", { name: "Configurações da origem" })).toBeDisabled();
    unmount();
    render(<LinhaDeContagem contagem={3} ordemAtiva={false} onAtualizar={() => {}} />);
    expect(screen.getByRole("button", { name: "Configurações da origem" })).toHaveAttribute(
      "title",
      "Em breve",
    );
  });

  it("o evento leva o id da origem a quem escuta, e parar de escutar desliga", () => {
    const aoAbrir = vi.fn();
    const { unmount } = render(<Escuta aoAbrir={aoAbrir} />);
    abrirConfiguracoesDaOrigem("f-1");
    expect(aoAbrir).toHaveBeenCalledWith("f-1");
    unmount();
    window.dispatchEvent(new CustomEvent(EVENTO_DAS_CONFIGURACOES, { detail: { id: "f-2" } }));
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });
});
