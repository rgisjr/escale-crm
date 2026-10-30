import { beforeEach, describe, expect, it, vi } from "vitest";

const cookie = { valor: undefined as string | undefined };
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookie.valor ? { value: cookie.valor } : undefined) }),
}));
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));
const org = { papel: "manager" as string, timezone: "America/Sao_Paulo" as string | null };
vi.mock("@/lib/auth/server", () => ({
  requireAuth: async () => ({ id: "u1" }),
  resolveActiveOrg: async () => ({ orgId: "org-1", role: org.papel, name: "Org", timezone: org.timezone }),
}));
vi.mock("@/components/escale/automacoes/lista/AutomacoesDaCasca", () => ({ AutomacoesDaCasca: () => null }));

import AutomacoesPage from "@/app/app/automacoes/page";
import { AutomacoesDaCasca } from "@/components/escale/automacoes/lista/AutomacoesDaCasca";

const UUID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const abrir = (editor?: string) => AutomacoesPage({ searchParams: Promise.resolve(editor ? { editor } : {}) });

beforeEach(() => {
  vi.clearAllMocks();
  cookie.valor = "topo";
  org.papel = "manager";
  org.timezone = "America/Sao_Paulo";
});

describe("/app/automacoes", () => {
  it("casca + gerente: a lista com o fuso", async () => {
    const el = (await abrir()) as { type: unknown; props: Record<string, unknown> };
    expect(el.type).toBe(AutomacoesDaCasca);
    expect(el.props).toEqual({ fuso: "America/Sao_Paulo", editorAberto: null });
  });

  it("sem fuso na organização usa São Paulo", async () => {
    org.timezone = null;
    const el = (await abrir()) as { props: { fuso: string } };
    expect(el.props.fuso).toBe("America/Sao_Paulo");
  });

  it("casca + agente: vai para o inbox", async () => {
    org.papel = "agent";
    await expect(abrir()).rejects.toThrow("REDIRECT /app/inbox");
  });

  it("sem a casca: vai para a aba de Webhooks", async () => {
    cookie.valor = "lateral";
    await expect(abrir()).rejects.toThrow("REDIRECT /app/webhooks?aba=automacoes");
  });

  it("?editor só vale com uuid", async () => {
    expect(((await abrir("abc")) as { props: { editorAberto: string | null } }).props.editorAberto).toBeNull();
    expect(((await abrir(UUID)) as { props: { editorAberto: string | null } }).props.editorAberto).toBe(UUID);
  });
});
