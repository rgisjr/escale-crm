import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const estado = vi.hoisted(() => ({
  org: null as null | { marca?: { nome?: string; logoUrl?: string | null; logoDarkUrl?: string | null } },
  instalacao: { name: "Escale OS", logoUrl: null as string | null, logoDarkUrl: null as string | null, initial: "E" },
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: estado.org }) }));
vi.mock("@/lib/branding/contexto", () => ({ useMarcaDaInstalacao: () => estado.instalacao }));

import { MarcaNoTopo } from "@/components/escale/menu/MarcaNoTopo";

beforeEach(() => {
  estado.org = null;
  estado.instalacao = { name: "Escale OS", logoUrl: null, logoDarkUrl: null, initial: "E" };
});

describe("<MarcaNoTopo>", () => {
  it("sem logo, mostra só o nome", () => {
    render(<MarcaNoTopo />);
    const link = screen.getByRole("link", { name: "Escale OS" });
    expect(link).toHaveTextContent("Escale OS");
    expect(link.querySelector("img")).toBeNull();
  });

  it("com logo, mostra a logo e o nome ao lado", () => {
    estado.instalacao = { ...estado.instalacao, logoUrl: "https://cdn.exemplo/logo.png" };
    render(<MarcaNoTopo />);
    const link = screen.getByRole("link", { name: "Escale OS" });
    expect(link.querySelector("img")).toHaveAttribute("src", "https://cdn.exemplo/logo.png");
    expect(link).toHaveTextContent("Escale OS");
  });

  it("o nome e a logo da organização vencem os da instalação", () => {
    estado.instalacao = { ...estado.instalacao, logoUrl: "https://cdn.exemplo/logo.png" };
    estado.org = { marca: { nome: "Acme", logoUrl: "https://cdn.exemplo/acme.png" } };
    render(<MarcaNoTopo />);
    const link = screen.getByRole("link", { name: "Acme" });
    expect(link.querySelector("img")).toHaveAttribute("src", "https://cdn.exemplo/acme.png");
    expect(link).toHaveTextContent("Acme");
  });
});
