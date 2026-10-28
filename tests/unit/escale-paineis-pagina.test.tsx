import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const org = { papel: "agent" as string };
  return {
    cookie: { valor: undefined as string | undefined },
    org,
    redirect: (url: string): never => {
      throw new Error(`REDIRECT ${url}`);
    },
    resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: org.papel, name: "Org", timezone: "America/Recife" })),
    lerPainel: vi.fn(),
  };
});
const { cookie, org, resolveActiveOrg, lerPainel } = h;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (h.cookie.valor ? { value: h.cookie.valor } : undefined) }),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => h.redirect(u) }));
vi.mock("@/lib/auth/server", () => ({ requireAuth: async () => ({ id: "u1" }), resolveActiveOrg: h.resolveActiveOrg }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/escale/indicadores/paineis/banco", () => ({ lerPainel: h.lerPainel }));
vi.mock("@/components/escale/indicadores/lista/IndicadoresDaCasca", () => ({ IndicadoresDaCasca: () => null }));
vi.mock("@/components/escale/indicadores/painel/PainelDaCasca", () => ({ PainelDaCasca: () => null }));
vi.mock("@/app/app/metrics/_components/PaginaDeDesempenho", () => ({ PaginaDeDesempenho: () => null }));

import DesempenhoPage from "@/app/app/ai/desempenho/page";
import PainelPage from "@/app/app/metrics/[id]/page";
import MetricsPage, { generateMetadata } from "@/app/app/metrics/page";
import { PaginaDeDesempenho } from "@/app/app/metrics/_components/PaginaDeDesempenho";
import { IndicadoresDaCasca } from "@/components/escale/indicadores/lista/IndicadoresDaCasca";
import { PainelDaCasca } from "@/components/escale/indicadores/painel/PainelDaCasca";

const P1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const abrir = (id: string) => PainelPage({ params: Promise.resolve({ id }) }) as Promise<ReactElement<Record<string, unknown>>>;

beforeEach(() => {
  vi.clearAllMocks();
  cookie.valor = undefined;
  org.papel = "agent";
});

describe("/app/metrics", () => {
  it("com a casca e atendente, abre a lista de painéis com o papel e o fuso", async () => {
    const el = (await MetricsPage()) as ReactElement<Record<string, unknown>>;
    expect(el.type).toBe(IndicadoresDaCasca);
    expect(el.props).toEqual({ papel: "agent", fuso: "America/Recife" });
    expect((await generateMetadata()).title).toBe("Indicadores");
  });

  it("com a casca e viewer, volta para a caixa de entrada", async () => {
    cookie.valor = "topo";
    org.papel = "viewer";
    await expect(MetricsPage()).rejects.toThrow("REDIRECT /app/inbox");
  });

  it("sem a casca, segue a página Desempenho do original", async () => {
    cookie.valor = "lateral";
    const el = (await MetricsPage()) as ReactElement<Record<string, unknown>>;
    expect(el.type).toBe(PaginaDeDesempenho);
    expect(el.props).toEqual({ titulo: "Desempenho" });
    expect(resolveActiveOrg).not.toHaveBeenCalled();
    expect((await generateMetadata()).title).toBe("Desempenho");
  });
});

describe("/app/ai/desempenho", () => {
  it("abre a página Desempenho como Desempenho do atendimento", () => {
    const el = DesempenhoPage() as ReactElement<Record<string, unknown>>;
    expect(el.type).toBe(PaginaDeDesempenho);
    expect(el.props).toEqual({ titulo: "Desempenho do atendimento" });
  });
});

describe("/app/metrics/[id]", () => {
  it("com a casca e o painel lido, abre o painel", async () => {
    cookie.valor = "topo";
    const painel = { id: P1, nome: "Vendas" };
    lerPainel.mockResolvedValue(painel);
    const el = await abrir(P1);
    expect(el.type).toBe(PainelDaCasca);
    expect(el.props).toEqual({ painel });
    expect(lerPainel).toHaveBeenCalledWith({}, "org-1", P1, false);
  });

  it.each([
    ["sem a casca", "lateral", P1, { id: P1 }],
    ["id inválido", "topo", "x", { id: P1 }],
    ["painel que não se vê", "topo", P1, null],
  ])("%s volta para a lista", async (_rotulo, valor, id, painel) => {
    cookie.valor = valor;
    lerPainel.mockResolvedValue(painel);
    await expect(abrir(id)).rejects.toThrow("REDIRECT /app/metrics");
  });
});
