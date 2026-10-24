import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let menu = "topo";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: menu }) }) }));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    throw new Error(`REDIRECT ${u}`);
  },
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u1" })),
  resolveActiveOrg: vi.fn(async () => ({
    orgId: "org-1",
    role: "manager",
    timezone: "America/Sao_Paulo",
  })),
}));
vi.mock("@/lib/escale/contatos/origens-da-pagina", () => ({
  origensDaPagina: vi.fn(async () => ({
    origens: [{ id: "p1", nome: "Vendas", etapas: [] }],
    papel: "manager",
    opcoesDoFiltro: {},
  })),
}));
vi.mock("@/components/escale/campanhas/CampanhasDaCasca", () => ({
  CampanhasDaCasca: (p: { campanhaAberta?: string | null; origens?: unknown[] }) => (
    <p>{`casca ${p.campanhaAberta ?? "nenhuma"} ${p.origens?.length ?? 0}`}</p>
  ),
}));
vi.mock("@/app/app/campaigns/_client", () => ({ ListaDeCampanhas: () => null }));
vi.mock("@/app/app/campaigns/[id]/_client", () => ({
  DetalheDaCampanha: ({ id }: { id: string }) => <p>{`original ${id}`}</p>,
}));

import CampanhaPage from "@/app/app/campaigns/[id]/page";
import CampanhasPage from "@/app/app/campaigns/page";

const ID = "e5ca1e00-8c00-4000-8000-0000000000c1";

beforeEach(() => {
  menu = "topo";
});

describe("os encaixes da 8C", () => {
  it("/app/campaigns?campanha=<uuid> passa o id e as origens; id ruim vira nenhum", async () => {
    render(await CampanhasPage({ searchParams: Promise.resolve({ campanha: ID }) }));
    expect(screen.getByText(`casca ${ID} 1`)).toBeInTheDocument();
  });

  it("id que não é uuid não abre janela", async () => {
    render(await CampanhasPage({ searchParams: Promise.resolve({ campanha: "xyz" }) }));
    expect(screen.getByText("casca nenhuma 1")).toBeInTheDocument();
  });

  it("/app/campaigns/[id] com a casca vira a janela; sem a casca, a página do original", async () => {
    await expect(CampanhaPage({ params: Promise.resolve({ id: ID }) })).rejects.toThrow(
      `REDIRECT /app/campaigns?campanha=${ID}`,
    );
    menu = "lateral";
    render(await CampanhaPage({ params: Promise.resolve({ id: ID }) }));
    expect(screen.getByText(`original ${ID}`)).toBeInTheDocument();
  });
});
