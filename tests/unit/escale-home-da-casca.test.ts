import { beforeEach, describe, expect, it, vi } from "vitest";

/** FORK ESCALE: a casca da Clint é o padrão, e com ela `/app` abre em Negócios. */
const estado = vi.hoisted(() => ({
  menu: undefined as string | undefined,
  org: { role: "agent", interface_settings: null } as Record<string, unknown> | null,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) =>
      nome === "escale_menu" && estado.menu ? { value: estado.menu } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1", is_platform_admin: false, support: null })),
  resolveActiveOrg: vi.fn(async () => estado.org),
}));

import AppHome from "@/app/app/page";
import { NEGOCIOS_DA_CASCA, homeDaCasca } from "@/lib/escale/home-da-casca";
import { homeDaInterface } from "@/lib/navigation/interface";

beforeEach(() => {
  estado.menu = undefined;
  estado.org = { role: "agent", interface_settings: null };
});

describe("homeDaCasca", () => {
  it("com organização e Negócios à vista, abre em Negócios", () => {
    expect(NEGOCIOS_DA_CASCA).toBe("/app/escale/negocios");
    expect(homeDaCasca({ preset: "completa" }, false, "agent")).toBe(NEGOCIOS_DA_CASCA);
    expect(homeDaCasca(null, false, "viewer")).toBe(NEGOCIOS_DA_CASCA);
  });

  it("a organização escondeu Negócios: a tela inicial de sempre", () => {
    const soProdutos = { preset: "completa", destinos: ["/app/products"] };
    expect(homeDaCasca(soProdutos, false, "admin")).toBe("/app/products");
  });

  it("sem organização ativa, nunca Negócios (a rota de Negócios voltaria para /app, em laço)", () => {
    expect(homeDaCasca(null, true, null)).toBe(homeDaInterface(null, true, null));
    expect(homeDaCasca(null, true, null)).not.toBe(NEGOCIOS_DA_CASCA);
  });
});

describe("a página /app", () => {
  it("sem a chave, vale o padrão (a casca): abre em Negócios", async () => {
    await expect(AppHome()).rejects.toThrow(`REDIRECT ${NEGOCIOS_DA_CASCA}`);
  });

  it("com a casca ligada: Negócios", async () => {
    estado.menu = "topo";
    await expect(AppHome()).rejects.toThrow(`REDIRECT ${NEGOCIOS_DA_CASCA}`);
  });

  it("quem escolheu a lateral fica com a tela inicial do original", async () => {
    estado.menu = "lateral";
    await expect(AppHome()).rejects.toThrow(`REDIRECT ${homeDaInterface(null, false, "agent")}`);
  });
});
