import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `loadAuthUser` lê o idioma das CLAIMS do JWT (sem ir ao GoTrue). O token que o
 * navegador já tem carrega o idioma ANTIGO até vencer, então gravar a preferência
 * sem renovar a sessão faria a tela continuar no idioma anterior por até 1 h.
 */

const chamadas: string[] = [];

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/server", () => ({
  loadAuthUser: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => null),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      updateUser: async () => {
        chamadas.push("updateUser");
        return { error: null };
      },
      refreshSession: async () => {
        chamadas.push("refreshSession");
        return { data: {}, error: null };
      },
    },
  }),
}));

const { trocarIdioma } = await import("@/app/actions/settings/trocarIdioma");

beforeEach(() => {
  chamadas.length = 0;
});

describe("trocarIdioma", () => {
  it("renova a sessão DEPOIS de gravar, para o token já vir com o idioma novo", async () => {
    const r = await trocarIdioma("es");
    expect(r).toEqual({ ok: true });
    expect(chamadas).toEqual(["updateUser", "refreshSession"]);
  });
});
