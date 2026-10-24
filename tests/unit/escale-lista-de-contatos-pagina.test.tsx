import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookie = { valor: undefined as string | undefined };
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookie.valor ? { value: cookie.valor } : undefined) }),
}));
vi.mock("@/app/app/contacts/_client", () => ({ ContactsListClient: () => <div>LISTA DO ORIGINAL</div> }));
vi.mock("@/components/escale/contatos/ListaDeContatos", () => ({
  ListaDeContatos: ({ origens }: { origens: unknown[] }) => <div>LISTA DA CASCA {origens.length}</div>,
}));
vi.mock("@/lib/escale/contatos/origens-da-pagina", () => ({
  origensDaPagina: async () => ({ origens: [{ id: "o1", nome: "A", etapas: [] }], papel: "agent" }),
}));

import ContactsPage from "@/app/app/contacts/page";

beforeEach(() => {
  cookie.valor = undefined;
});

describe("/app/contacts", () => {
  it("com a lateral, a lista do original, sem mudança", async () => {
    cookie.valor = "lateral";
    render(await ContactsPage());
    expect(screen.getByText("LISTA DO ORIGINAL")).toBeInTheDocument();
  });

  it("sem a chave, vale o padrão: a lista da casca", async () => {
    render(await ContactsPage());
    expect(screen.getByText("LISTA DA CASCA 1")).toBeInTheDocument();
  });

  it("com a casca, a lista da Clint com as origens", async () => {
    cookie.valor = "topo";
    render(await ContactsPage());
    expect(screen.getByText("LISTA DA CASCA 1")).toBeInTheDocument();
  });
});
