import { describe, expect, it } from "vitest";

import { gravarNaOrdem, planoDeGravacao } from "@/lib/escale/configuracoes/ordem-de-gravacao";

/** FORK ESCALE · Fase 1K (revisão I3): a ordem do "Salvar" entre a lista de pessoas e a distribuição. */
const X = "aaaaaaaa-1111-4111-8111-111111111111";
const Y = "bbbbbbbb-1111-4111-8111-111111111111";
const Z = "cccccccc-1111-4111-8111-111111111111";
const dist = (...ids: string[]) => ({
  pessoas: ids.map((u) => ({ user_id: u, percentual: 100 / ids.length })),
  reiniciar: false,
});
const PATCH = { permissoes: { pessoas: [Y, Z] } };

describe("planoDeGravacao", () => {
  it("só sai gente: a distribuição grava antes da lista", () => {
    const plano = planoDeGravacao({
      patch: PATCH,
      distribuicao: dist(Y),
      distribuidosHoje: [X.toUpperCase(), Y],
    });
    expect(plano.ordem).toEqual(["distribuicao", "configuracoes"]);
    expect(plano.patch).toEqual(PATCH);
  });

  it("só entra gente: a lista grava antes da distribuição", () => {
    const plano = planoDeGravacao({
      patch: PATCH,
      distribuicao: dist(Y, Z),
      distribuidosHoje: [Y],
    });
    expect(plano.ordem).toEqual(["configuracoes", "distribuicao"]);
    expect(plano.patch).toEqual(PATCH);
  });

  it("sai um e entra outro: a lista vai primeiro levando quem ficará na distribuição", () => {
    const plano = planoDeGravacao({
      patch: PATCH,
      distribuicao: dist(Y, Z),
      distribuidosHoje: [X, Y],
    });
    expect(plano.ordem).toEqual(["configuracoes", "distribuicao"]);
    expect(plano.patch).toEqual({ ...PATCH, distribuicao_pendente: [Y, Z] });
  });

  it("sem mudança na lista ou na distribuição, a ordem de sempre e o pedido intacto", () => {
    expect(planoDeGravacao({ patch: null, distribuicao: dist(Y), distribuidosHoje: [X] })).toEqual({
      ordem: ["configuracoes", "distribuicao"],
      patch: null,
    });
    const soGerais = { gerais: { moeda: null, tags_padrao: [], visualizacao: "all" as const } };
    expect(
      planoDeGravacao({ patch: soGerais, distribuicao: dist(Y), distribuidosHoje: [X] }).patch,
    ).toBe(soGerais);
  });
});

describe("gravarNaOrdem", () => {
  const rodar = async (ordem: Array<"configuracoes" | "distribuicao">, falha?: "distribuicao") => {
    const chamadas: string[] = [];
    const ok = await gravarNaOrdem(ordem, {
      configuracoes: async () => {
        chamadas.push("configuracoes");
      },
      distribuicao: async () => {
        chamadas.push("distribuicao");
        if (falha) return false;
      },
    });
    return { ok, chamadas };
  };

  it("chama as duas rotas na ordem do plano (sai, entra, sai e entra)", async () => {
    for (const [hoje, depois] of [
      [[X, Y], [Y]],
      [[Y], [Y, Z]],
      [
        [X, Y],
        [Y, Z],
      ],
    ] as const) {
      const plano = planoDeGravacao({
        patch: PATCH,
        distribuicao: dist(...depois),
        distribuidosHoje: hoje,
      });
      const { ok, chamadas } = await rodar([...plano.ordem]);
      expect(ok).toBe(true);
      expect(chamadas).toEqual([...plano.ordem]);
    }
  });

  it("a primeira que falha (false) interrompe as seguintes", async () => {
    const { ok, chamadas } = await rodar(["distribuicao", "configuracoes"], "distribuicao");
    expect(ok).toBe(false);
    expect(chamadas).toEqual(["distribuicao"]);
  });
});
