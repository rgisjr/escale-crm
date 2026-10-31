import { beforeEach, describe, expect, it, vi } from "vitest";

const cookie = { valor: undefined as string | undefined };
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookie.valor ? { value: cookie.valor } : undefined) }),
}));
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u), notFound: () => notFound() }));
const org = { papel: "manager" as string, timezone: "America/Sao_Paulo" as string | null };
vi.mock("@/lib/auth/server", () => ({
  requireAuth: async () => ({ id: "u1" }),
  resolveActiveOrg: async () => ({ orgId: "org-1", role: org.papel, name: "Org", timezone: org.timezone }),
}));
vi.mock("@/components/escale/automacoes/fluxo/FluxoDaCasca", () => ({ FluxoDaCasca: () => null }));
vi.mock("@/app/app/webhooks/automacoes/[id]/_components/DesignerDeAutomacao", () => ({ DesignerDeAutomacao: () => null }));

import DesignerPage from "@/app/app/webhooks/automacoes/[id]/page";
import { DesignerDeAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/DesignerDeAutomacao";
import { FluxoDaCasca } from "@/components/escale/automacoes/fluxo/FluxoDaCasca";

const UUID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
type Pagina = { props: { children: { type: unknown; props: Record<string, unknown> } } };
const abrir = (id: string, q: Record<string, string> = {}) =>
  DesignerPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(q) });

beforeEach(() => {
  vi.clearAllMocks();
  cookie.valor = "topo";
  org.papel = "manager";
  org.timezone = "America/Sao_Paulo";
});

describe("/app/webhooks/automacoes/[id]", () => {
  it("casca + gerente: o fluxo da casca com id, fuso, nome e pasta", async () => {
    const el = (await abrir("nova", { nome: "Vendas", pasta: UUID })) as Pagina;
    expect(el.props.children.type).toBe(FluxoDaCasca);
    expect(el.props.children.props).toEqual({
      id: "nova",
      fuso: "America/Sao_Paulo",
      nomeInicial: "Vendas",
      pastaInicial: UUID,
    });
  });

  it("sem fuso na organização usa São Paulo", async () => {
    org.timezone = null;
    const el = (await abrir(UUID)) as Pagina;
    expect(el.props.children.props.fuso).toBe("America/Sao_Paulo");
  });

  it("sem a casca: o designer de hoje", async () => {
    cookie.valor = "lateral";
    const el = (await abrir(UUID)) as Pagina;
    expect(el.props.children.type).toBe(DesignerDeAutomacao);
  });

  it("agente vai para o inbox nas duas formas", async () => {
    org.papel = "agent";
    await expect(abrir(UUID)).rejects.toThrow("REDIRECT /app/inbox");
    cookie.valor = "lateral";
    await expect(abrir(UUID)).rejects.toThrow("REDIRECT /app/inbox");
  });

  it("id que não é uuid nem 'nova' dá 404 nas duas formas", async () => {
    await expect(abrir("abc")).rejects.toThrow("NOT_FOUND");
    cookie.valor = "lateral";
    await expect(abrir("abc")).rejects.toThrow("NOT_FOUND");
  });
});
