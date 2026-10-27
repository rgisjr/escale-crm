import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

const erros: { msg: string; ctx: unknown }[] = [];

vi.mock("@/lib/logger", () => ({
  logger: {
    error: (msg: string, ctx: unknown) => erros.push({ msg, ctx }),
    warn: () => {},
    info: () => {},
    debug: () => {},
  },
}));

const { usuarioDoToken, ehSessaoAusente, renovarClaimsDaSessao } = await import(
  "@/lib/auth/claims"
);

function clienteCom(getClaims: unknown, refreshSession?: unknown) {
  return { auth: { getClaims, refreshSession } } as unknown as SupabaseClient;
}

beforeEach(() => {
  erros.length = 0;
});

describe("usuarioDoToken", () => {
  it("claims válidas viram o usuário, sem ir ao GoTrue", async () => {
    const getClaims = vi.fn(async () => ({
      data: {
        claims: {
          sub: "u-1",
          email: "ana@escale.com",
          user_metadata: { full_name: "Ana", locale: "pt-BR" },
          app_metadata: { provider: "email" },
        },
        header: {},
        signature: new Uint8Array(),
      },
      error: null,
    }));

    const { usuario, error } = await usuarioDoToken(clienteCom(getClaims));

    expect(error).toBeNull();
    expect(usuario).toEqual({
      id: "u-1",
      email: "ana@escale.com",
      user_metadata: { full_name: "Ana", locale: "pt-BR" },
      app_metadata: { provider: "email" },
    });
    expect(erros).toEqual([]);
  });

  it("token sem e-mail nem metadados vira vazio, não undefined", async () => {
    const getClaims = vi.fn(async () => ({
      data: { claims: { sub: "u-2" }, header: {}, signature: new Uint8Array() },
      error: null,
    }));

    const { usuario } = await usuarioDoToken(clienteCom(getClaims));

    expect(usuario).toEqual({ id: "u-2", email: "", user_metadata: {}, app_metadata: {} });
  });

  it("sessão ausente é estado normal: usuário nulo e NADA no log", async () => {
    const erro = { name: "AuthSessionMissingError", message: "Auth session missing!", status: 400 };
    const getClaims = vi.fn(async () => ({ data: null, error: erro }));

    const { usuario, error } = await usuarioDoToken(clienteCom(getClaims));

    expect(usuario).toBeNull();
    expect(error).toBe(erro);
    expect(erros).toEqual([]);
  });

  it("visitante sem sessão e sem erro também não loga", async () => {
    const getClaims = vi.fn(async () => ({ data: null, error: null }));

    const { usuario, error } = await usuarioDoToken(clienteCom(getClaims));

    expect(usuario).toBeNull();
    expect(error).toBeNull();
    expect(erros).toEqual([]);
  });

  it("assinatura inválida ou token ilegível: usuário nulo e UM log com a classe do erro", async () => {
    const getClaims = vi.fn(async () => ({
      data: null,
      error: {
        name: "AuthInvalidJwtError",
        code: "bad_jwt",
        status: 401,
        message: "Invalid JWT signature",
      },
    }));

    const { usuario } = await usuarioDoToken(clienteCom(getClaims));

    expect(usuario).toBeNull();
    expect(erros).toHaveLength(1);
    expect(erros[0]!.msg).toMatch(/getClaims falhou/);
    expect(erros[0]!.ctx).toMatchObject({
      name: "AuthInvalidJwtError",
      code: "bad_jwt",
      status: 401,
      message: "Invalid JWT signature",
    });
  });
});

describe("usuarioDoToken — exceção do auth-js", () => {
  it("cookie corrompido (getClaims LANÇA) vira não autenticado, com log, sem 500", async () => {
    const getClaims = vi.fn(async () => {
      throw new SyntaxError("Unexpected token");
    });

    const { usuario, error } = await usuarioDoToken(clienteCom(getClaims));

    expect(usuario).toBeNull();
    expect(error).toBeNull();
    expect(erros).toHaveLength(1);
    expect(erros[0]!.msg).toMatch(/getClaims lançou/);
  });
});

describe("ehSessaoAusente", () => {
  it("reconhece a sessão ausente pelo nome e não engole outros erros", () => {
    expect(ehSessaoAusente({ name: "AuthSessionMissingError" })).toBe(true);
    expect(ehSessaoAusente({ name: "AuthRetryableFetchError" })).toBe(false);
    expect(ehSessaoAusente(null)).toBe(false);
  });
});

describe("renovarClaimsDaSessao", () => {
  it("devolve true quando o refresh deu certo", async () => {
    const refreshSession = vi.fn(async () => ({ data: {}, error: null }));
    await expect(renovarClaimsDaSessao(clienteCom(vi.fn(), refreshSession))).resolves.toBe(true);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("devolve false, sem lançar, quando o refresh falhou", async () => {
    const refreshSession = vi.fn(async () => ({ data: {}, error: { message: "x" } }));
    await expect(renovarClaimsDaSessao(clienteCom(vi.fn(), refreshSession))).resolves.toBe(false);
  });
});
