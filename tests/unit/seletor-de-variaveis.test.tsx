import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { SeletorDeVariaveis } from "@/components/escale/variaveis/SeletorDeVariaveis";
import { TooltipProvider } from "@/components/ui/tooltip";

/** FORK ESCALE · Frente V (Task 6): o popover "Variáveis" igual à Clint (prints v03 a v07). */
const CATALOGOS: Record<string, unknown> = {
  negocio: { grupos: [], campos: [{ id: "1", objeto: "negocio", chave: "plano", definicao: { label: "Plano", type: "text" } }] },
  contato: { grupos: [], campos: [] },
  empresa: { grupos: [], campos: [] },
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const objeto = new URL(url, "http://x").searchParams.get("objeto") ?? "";
      return new Response(JSON.stringify({ data: CATALOGOS[objeto] }), { status: 200 });
    }),
  );
});

function abrir(props: Partial<Parameters<typeof SeletorDeVariaveis>[0]> = {}) {
  const aoEscolher = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider>
        <SeletorDeVariaveis
          gatilho={<button type="button">+ Adicionar variáveis</button>}
          aoEscolher={aoEscolher}
          {...props}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { user, aoEscolher };
}

const abrirPopover = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "+ Adicionar variáveis" }));
  return screen.getByRole("dialog");
};

describe("SeletorDeVariaveis", () => {
  it("abre com o título, a busca focada e só o 1º grupo aberto", async () => {
    const { user } = abrir();
    const painel = await abrirPopover(user);
    expect(within(painel).getByText("Variáveis")).toBeInTheDocument();
    expect(within(painel).getByRole("searchbox", { name: "Buscar variável" })).toHaveFocus();
    const titulos = within(painel).getAllByRole("button", { expanded: true });
    expect(titulos.map((b) => b.textContent)).toEqual(["Negócio"]);
    expect(within(painel).getAllByRole("button", { expanded: false }).map((b) => b.textContent)).toEqual([
      "Contato",
      "Empresa",
      "Usuário",
    ]);
    expect(within(painel).getByRole("button", { name: "Data" })).toBeInTheDocument();
    expect(within(painel).queryByRole("button", { name: "Primeiro nome" })).toBeNull();
  });

  it("o personalizado do catálogo aparece no fim do grupo", async () => {
    const { user } = abrir();
    const painel = await abrirPopover(user);
    const negocio = within(painel).getByRole("group", { name: "Negócio" });
    expect(await within(negocio).findByRole("button", { name: "Plano" })).toBeInTheDocument();
    const chips = within(negocio).getAllByRole("button").map((b) => b.textContent);
    expect(chips.at(-1)).toBe("Plano");
  });

  it("clicar no título abre e fecha o grupo", async () => {
    const { user } = abrir();
    const painel = await abrirPopover(user);
    await user.click(within(painel).getByRole("button", { name: "Contato" }));
    expect(within(painel).getByRole("button", { name: "Contato" })).toHaveAttribute("aria-expanded", "true");
    await user.click(within(painel).getByRole("button", { name: "Negócio" }));
    expect(within(painel).getByRole("button", { name: "Negócio" })).toHaveAttribute("aria-expanded", "false");
  });

  it("a busca abre todo grupo com resultado e some com os vazios", async () => {
    const { user } = abrir();
    const painel = await abrirPopover(user);
    await user.type(within(painel).getByRole("searchbox"), "nome");
    expect(within(painel).getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual([
      "Contato",
      "Empresa",
      "Usuário",
    ]);
    expect(within(within(painel).getByRole("group", { name: "Contato" })).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Contato",
      "Nome",
      "Primeiro nome",
      "Sobrenome",
    ]);
  });

  it("busca sem resultado", async () => {
    const { user } = abrir();
    const painel = await abrirPopover(user);
    await user.type(within(painel).getByRole("searchbox"), "xyzq");
    expect(within(painel).getByText("Nenhuma variável encontrada")).toBeInTheDocument();
  });

  it("o chip devolve o token da Clint e fecha", async () => {
    const { user, aoEscolher } = abrir();
    const painel = await abrirPopover(user);
    await user.click(within(painel).getByRole("button", { name: "Contato" }));
    await user.click(within(painel).getByRole("button", { name: "Primeiro nome" }));
    expect(aoEscolher).toHaveBeenCalledWith("[CONTACT.FIRST_NAME]");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("teclado: Tab chega ao chip e Enter escolhe", async () => {
    const { user, aoEscolher } = abrir();
    await abrirPopover(user);
    await user.tab(); // título Negócio
    await user.tab(); // 1º chip
    await user.keyboard("{Enter}");
    expect(aoEscolher).toHaveBeenCalledWith("[DEAL.DATE]");
  });

  it("a saudação só com o extra, em Outros", async () => {
    const { user, aoEscolher } = abrir({ extras: ["saudacao"] });
    const painel = await abrirPopover(user);
    await user.click(within(painel).getByRole("button", { name: "Outros" }));
    await user.click(within(painel).getByRole("button", { name: "Saudação" }));
    expect(aoEscolher).toHaveBeenCalledWith("{{saudacao}}");
  });

  it("os adicionais da tela entram sem repetir os do catálogo", async () => {
    const { user } = abrir({
      adicionais: { negocio: [{ chave: "plano", rotulo: "Plano repetido" }, { chave: "cupom", rotulo: "Cupom" }] },
    });
    const painel = await abrirPopover(user);
    const negocio = within(painel).getByRole("group", { name: "Negócio" });
    await within(negocio).findByRole("button", { name: "Plano" });
    expect(within(negocio).queryByRole("button", { name: "Plano repetido" })).toBeNull();
    expect(within(negocio).getByRole("button", { name: "Cupom" })).toBeInTheDocument();
  });
});
