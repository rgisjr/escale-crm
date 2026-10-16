import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CabecalhoDaSecao } from "@/components/escale/origens/CabecalhoDaSecao";
import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { IconeDoGrupo } from "@/components/escale/origens/IconeDoGrupo";
import { ConteudoDoMenu, ItemDoMenu, SeparadorDoMenu, Tres } from "@/components/escale/origens/MenuDoPainel";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Settings, Trash2 } from "@/lib/ui/icons-da-casca";

describe("casca V3 — peças do painel", () => {
  it("o cabeçalho da seção tem 48px, a divisória #E8E4F5 e o título 11px/600 em caixa alta (01-010)", () => {
    render(
      <CabecalhoDaSecao icone={<svg />} titulo="Origens">
        <button type="button">lupa</button>
      </CabecalhoDaSecao>,
    );
    const titulo = screen.getByRole("heading", { name: "Origens" });
    expect(titulo).toHaveClass("text-[11px]", "font-semibold", "uppercase", "text-casca-texto");
    expect(titulo.parentElement).toHaveClass("group/cabecalho", "h-12", "border-b", "border-casca-borda", "pl-4");
    expect(screen.getByRole("button", { name: "lupa" })).toBeInTheDocument();
  });

  it("o ícone do grupo é o quadrado de 20px da Clint, com a cor da Clint e as iniciais brancas", () => {
    const { container } = render(
      <IconeDoGrupo grupo={{ id: "g-1", name: "Recuperação INSS", color: "#ffe629", icon: "iniciais" }} />,
    );
    const icone = container.querySelector("[data-icone-do-grupo]")!;
    expect(icone).toHaveClass("size-5", "rounded-[4px]", "text-white", "text-[8px]", "font-semibold");
    expect(icone).toHaveStyle({ backgroundColor: "#FFE073" });
    expect(icone).toHaveTextContent("RI");
  });

  it("o ícone com desenho troca as iniciais por um traço branco", () => {
    const { container } = render(
      <IconeDoGrupo grupo={{ id: "g-1", name: "Operacional", color: "#3e63dd", icon: "pessoas" }} />,
    );
    const icone = container.querySelector("[data-icone-do-grupo]")!;
    expect(icone.querySelector("svg")).not.toBeNull();
    expect(icone).toHaveStyle({ backgroundColor: "#263AF1" });
    expect(icone.textContent).toBe("");
  });

  it("o menu ⋮ é a caixa da Clint: raio 8, sombra do painel, itens de 36px com ícone e Excluir em vermelho (01-032)", async () => {
    render(
      <DropdownMenu modal={false}>
        <Tres rotulo="Mais ações de Vendas" />
        <ConteudoDoMenu>
          <ItemDoMenu icone={Settings}>Configurações</ItemDoMenu>
          <SeparadorDoMenu />
          <ItemDoMenu icone={Trash2} perigo>
            Excluir
          </ItemDoMenu>
        </ConteudoDoMenu>
      </DropdownMenu>,
    );
    const tres = screen.getByRole("button", { name: "Mais ações de Vendas" });
    expect(tres).toHaveClass("data-[state=open]:text-casca-marca");
    await userEvent.setup({ pointerEventsCheck: 0 }).click(tres);
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("rounded-[8px]", "shadow-casca-painel", "bg-surface", "border-0");
    const [config, excluir] = within(menu).getAllByRole("menuitem");
    expect(config).toHaveClass("h-9", "text-xs", "px-3");
    expect(config!.querySelector("svg")).not.toBeNull();
    expect(excluir).toHaveClass("text-casca-alerta");
    expect(within(menu).getByRole("separator")).toHaveClass("bg-casca-borda");
  });

  it("a dica escura mostra o texto acima do botão (01-034)", async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <DicaEscura texto="Nova origem">
          <button type="button" aria-label="Nova origem em Vendas">
            +
          </button>
        </DicaEscura>
      </TooltipProvider>,
    );
    await userEvent.setup({ pointerEventsCheck: 0 }).hover(screen.getByRole("button", { name: "Nova origem em Vendas" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Nova origem");
  });
});
