import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SeletorDaCasca, type OpcaoDoSeletor } from "@/components/escale/ui/SeletorDaCasca";
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

const DONOS: OpcaoDoSeletor<string>[] = [
  { valor: "ana", rotulo: "Ana" },
  { valor: "bia", rotulo: "Bia" },
  { valor: "caio", rotulo: "Caio", desabilitada: true },
];

const OITO: OpcaoDoSeletor<string>[] = ["Ana", "Bia", "Caio", "Davi", "Edu", "Fabi", "Gabi", "Mariana"].map(
  (nome) => ({ valor: nome.toLowerCase(), rotulo: nome }),
);

function Controlado(props: {
  inicial?: string;
  opcoes?: OpcaoDoSeletor<string>[];
  aoMudar?: (v: string) => void;
  vazio?: string;
  buscaAPartirDe?: number;
}) {
  const [valor, setValor] = useState(props.inicial ?? "");
  return (
    <SeletorDaCasca
      valor={valor}
      opcoes={props.opcoes ?? DONOS}
      aria-label="Dono"
      vazio={props.vazio}
      buscaAPartirDe={props.buscaAPartirDe}
      aoMudar={(v) => {
        setValor(v);
        props.aoMudar?.(v);
      }}
    />
  );
}

const usuario = () => userEvent.setup({ pointerEventsCheck: 0 });

describe("<SeletorDaCasca>", () => {
  it("mostra o valor e abre a lista, sem nenhum select nativo", async () => {
    const u = usuario();
    render(<Controlado inicial="ana" />);
    const seletor = screen.getByRole("combobox", { name: "Dono" });
    expect(seletor).toHaveTextContent("Ana");
    expect(seletor).toHaveClass("bg-casca-raia", "text-casca-texto", "rounded-[4px]");
    await u.click(seletor);
    const lista = await screen.findByRole("listbox", { name: "Dono" });
    expect(within(lista).getAllByRole("option").map((o) => o.textContent)).toEqual(["Ana", "Bia", "Caio"]);
    expect(within(lista).getByRole("option", { name: "Ana" })).toHaveAttribute("aria-selected", "true");
    expect(within(lista).getByRole("option", { name: "Ana" })).toHaveClass("bg-casca-marca-suave", "text-casca-marca");
    expect(within(lista).getByRole("option", { name: "Caio" })).toHaveAttribute("aria-disabled", "true");
    expect(seletor).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(document.querySelector("select")).toBeNull();
  });

  it("escolher com o mouse chama aoMudar e fecha", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="ana" aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await u.click(await screen.findByRole("option", { name: "Bia" }));
    expect(aoMudar).toHaveBeenCalledWith("bia");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Dono" })).toHaveTextContent("Bia");
  });

  it("opção desabilitada não é escolhida", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="ana" aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await u.click(await screen.findByRole("option", { name: "Caio" }));
    expect(aoMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("funciona pelo teclado: ↓ abre, ↓ anda pulando a desabilitada, Enter escolhe, o foco volta", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="ana" aoMudar={aoMudar} />);
    const seletor = screen.getByRole("combobox", { name: "Dono" });
    act(() => seletor.focus());
    await u.keyboard("{ArrowDown}");
    const lista = await screen.findByRole("listbox");
    await waitFor(() => expect(lista).toHaveFocus());
    const id = (nome: string) => within(lista).getByRole("option", { name: nome }).id;
    expect(lista).toHaveAttribute("aria-activedescendant", id("Ana"));
    await u.keyboard("{ArrowDown}");
    expect(lista).toHaveAttribute("aria-activedescendant", id("Bia"));
    await u.keyboard("{ArrowDown}");
    expect(lista).toHaveAttribute("aria-activedescendant", id("Bia"));
    await u.keyboard("{Enter}");
    expect(aoMudar).toHaveBeenCalledWith("bia");
    expect(screen.queryByRole("listbox")).toBeNull();
    await waitFor(() => expect(seletor).toHaveFocus());
  });

  it("Esc fecha sem escolher", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="ana" aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await screen.findByRole("listbox");
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("vazio vira a primeira opção e o texto do gatilho sem valor", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="bia" vazio="Todos" aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    const opcoes = within(await screen.findByRole("listbox")).getAllByRole("option");
    expect(opcoes[0]).toHaveTextContent("Todos");
    await u.click(opcoes[0]!);
    expect(aoMudar).toHaveBeenCalledWith("");
    expect(screen.getByRole("combobox", { name: "Dono" })).toHaveTextContent("Todos");
  });

  it("sem valor e sem vazio, o gatilho diz 'Selecione…' em cinza", () => {
    render(<Controlado />);
    const seletor = screen.getByRole("combobox", { name: "Dono" });
    expect(seletor).toHaveTextContent("Selecione…");
    expect(seletor).toHaveClass("text-casca-suave");
  });

  it("a partir de 8 opções aparece a busca, que filtra e aceita Enter", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado opcoes={OITO} aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    const busca = await screen.findByRole("searchbox", { name: "Buscar…" });
    expect(busca).toHaveAttribute("placeholder", "Buscar…");
    await waitFor(() => expect(busca).toHaveFocus());
    await u.type(busca, "bi");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Bia", "Fabi", "Gabi"]);
    await u.keyboard("{Enter}");
    expect(aoMudar).toHaveBeenCalledWith("bia");
  });

  it("busca sem resultado diz 'Nenhum resultado'", async () => {
    const u = usuario();
    render(<Controlado opcoes={OITO} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await u.type(await screen.findByRole("searchbox"), "zzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("Nenhum resultado")).toBeInTheDocument();
  });

  it("buscaAPartirDe muda o corte", async () => {
    const u = usuario();
    render(<Controlado buscaAPartirDe={3} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    expect(await screen.findByRole("searchbox")).toBeInTheDocument();
  });

  it("agrupa as opções pelo grupo, com o título do grupo", async () => {
    const u = usuario();
    const agrupadas: OpcaoDoSeletor<string>[] = [
      { valor: "nome", rotulo: "Nome", grupo: "Contato" },
      { valor: "email", rotulo: "E-mail", grupo: "Contato" },
      { valor: "valor", rotulo: "Valor", grupo: "Negócio" },
    ];
    render(<Controlado opcoes={agrupadas} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    const contato = await screen.findByRole("group", { name: "Contato" });
    expect(within(contato).getAllByRole("option").map((o) => o.textContent)).toEqual(["Nome", "E-mail"]);
    expect(within(screen.getByRole("group", { name: "Negócio" })).getAllByRole("option")).toHaveLength(1);
  });

  it("em espanhol, os textos do próprio seletor mudam", async () => {
    const u = usuario();
    render(
      <IdiomaProvider locale="es">
        <Controlado opcoes={OITO} />
      </IdiomaProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Dono" })).toHaveTextContent("Selecciona…");
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await u.type(await screen.findByRole("searchbox"), "zzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });
});
