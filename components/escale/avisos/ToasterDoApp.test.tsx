import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";

import { ATRIBUTO_DA_CASCA } from "@/lib/escale/casca-ligada";

import { ToasterDoApp } from "./ToasterDoApp";

function lista(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-sonner-toaster]");
}

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
  document.documentElement.removeAttribute(ATRIBUTO_DA_CASCA);
});

describe("o Toaster do app", () => {
  it("fora da casca, fica o do original (canto inferior direito)", async () => {
    render(<ToasterDoApp />);
    act(() => {
      toast.success("Salvo");
    });
    await screen.findByText("Salvo");
    expect(lista()?.getAttribute("data-x-position")).toBe("right");
    expect(screen.queryByRole("button", { name: "Fechar" })).toBeNull();
  });

  it("na casca, o aviso fica no centro de baixo, como na Clint", async () => {
    document.documentElement.setAttribute(ATRIBUTO_DA_CASCA, "");
    render(<ToasterDoApp />);
    act(() => {
      toast.success("As alterações foram salvas com sucesso!");
    });
    await screen.findByText("As alterações foram salvas com sucesso!");
    expect(lista()?.getAttribute("data-x-position")).toBe("center");
    expect(lista()?.getAttribute("data-y-position")).toBe("bottom");
  });

  it("na casca, todo aviso tem o Fechar da Clint, e ele fecha", async () => {
    document.documentElement.setAttribute(ATRIBUTO_DA_CASCA, "");
    render(<ToasterDoApp />);
    act(() => {
      toast("Copiado.");
    });
    await screen.findByText("Copiado.");
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByText("Copiado.")).toBeNull(), { timeout: 2000 });
  });

  it("na casca, o aviso comum não tem ícone e o de sucesso tem o check da Clint", async () => {
    document.documentElement.setAttribute(ATRIBUTO_DA_CASCA, "");
    render(<ToasterDoApp />);
    act(() => {
      toast("Comum");
      toast.success("Deu certo");
    });
    const comum = (await screen.findByText("Comum")).closest("[data-sonner-toast]");
    const sucesso = (await screen.findByText("Deu certo")).closest("[data-sonner-toast]");
    expect(comum?.querySelector("[data-aviso-icone]")).toBeNull();
    expect(sucesso?.querySelector('[data-aviso-icone="sucesso"]')).not.toBeNull();
  });
});
