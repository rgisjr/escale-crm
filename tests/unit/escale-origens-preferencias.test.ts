import { describe, expect, it } from "vitest";

import {
  COOKIE_LISTA,
  COOKIE_OCULTOS,
  COOKIE_PAINEL,
  COOKIE_ULTIMO_FUNIL,
  COOKIE_VISUALIZACOES,
  OCULTOS_MAX,
  cookieDaPreferencia,
  lerOcultos,
  lerPreferenciasDoPainel,
  lerUuid,
} from "@/lib/escale/origens/preferencias";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

describe("preferências do painel Origens (cookies)", () => {
  it("lerUuid só aceita uuid", () => {
    expect(lerUuid(A)).toBe(A);
    expect(lerUuid("abc")).toBeNull();
    expect(lerUuid(undefined)).toBeNull();
  });

  it("lerOcultos aceita só uuids, sem repetir e com teto", () => {
    expect(lerOcultos(`${A},lixo,${B},${A}`)).toEqual([A, B]);
    expect(lerOcultos(undefined)).toEqual([]);
    const muitos = Array.from({ length: OCULTOS_MAX + 5 }, (_, i) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`);
    expect(lerOcultos(muitos.join(","))).toHaveLength(OCULTOS_MAX);
  });

  it("sem cookie, painel, lista e visualizações abertos e nada oculto", () => {
    expect(lerPreferenciasDoPainel(() => undefined)).toEqual({
      painelAberto: true,
      listaAberta: true,
      visualizacoesAbertas: true,
      ocultos: [],
    });
  });

  it("lê painel fechado, lista fechada, visualizações fechadas e os ocultos", () => {
    const cookies: Record<string, string> = {
      [COOKIE_PAINEL]: "fechado",
      [COOKIE_LISTA]: "fechada",
      [COOKIE_VISUALIZACOES]: "fechada",
      [COOKIE_OCULTOS]: `${A},${B}`,
    };
    expect(lerPreferenciasDoPainel((nome) => cookies[nome])).toEqual({
      painelAberto: false,
      listaAberta: false,
      visualizacoesAbertas: false,
      ocultos: [A, B],
    });
  });

  it("cookieDaPreferencia valida tudo que vem do navegador", () => {
    expect(cookieDaPreferencia({ nome: "painel", valor: "fechado" })).toEqual({ cookie: COOKIE_PAINEL, valor: "fechado" });
    expect(cookieDaPreferencia({ nome: "lista", valor: "aberta" })).toEqual({ cookie: COOKIE_LISTA, valor: "aberta" });
    expect(cookieDaPreferencia({ nome: "visualizacoes", valor: "fechada" })).toEqual({
      cookie: COOKIE_VISUALIZACOES,
      valor: "fechada",
    });
    expect(cookieDaPreferencia({ nome: "visualizacoes", valor: "talvez" })).toBeNull();
    expect(cookieDaPreferencia({ nome: "ocultos", valor: [A, "lixo", B] })).toEqual({ cookie: COOKIE_OCULTOS, valor: `${A},${B}` });
    expect(cookieDaPreferencia({ nome: "ultimo_funil", valor: A })).toEqual({ cookie: COOKIE_ULTIMO_FUNIL, valor: A });
    expect(cookieDaPreferencia({ nome: "ultimo_funil", valor: "../x" })).toBeNull();
    expect(cookieDaPreferencia({ nome: "painel", valor: "talvez" })).toBeNull();
    expect(cookieDaPreferencia({ nome: "outro", valor: "x" })).toBeNull();
    expect(cookieDaPreferencia("lixo")).toBeNull();
  });
});
