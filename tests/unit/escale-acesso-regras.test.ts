import { describe, expect, it } from "vitest";

import {
  CHAVE_DA_VISUALIZACAO,
  CHAVE_DAS_PESSOAS,
  VISUALIZACOES,
  avisoDaFicha,
  pessoasDaOrigem,
  podeTrocarDono,
  podeVerNegocio,
  regraEmVigor,
  temAcessoAOrigem,
  temAcessoAoGrupo,
  visualizacaoDaOrigem,
} from "@/lib/escale/acesso/regras";

const EU = "11111111-1111-4111-8111-111111111111";
const OUTRO = "22222222-2222-4222-8222-222222222222";

describe("as chaves e a leitura tolerante", () => {
  it("as chaves e a ordem do seletor da Clint", () => {
    expect(CHAVE_DA_VISUALIZACAO).toBe("escale_visualizacao");
    expect(CHAVE_DAS_PESSOAS).toBe("escale_pessoas");
    expect(VISUALIZACOES).toEqual(["all", "own", "own_and_unassigned"]);
  });

  it("lê a regra da origem; lixo vira sem regra", () => {
    expect(visualizacaoDaOrigem({ escale_visualizacao: "own" })).toBe("own");
    expect(visualizacaoDaOrigem({ escale_visualizacao: "ALL_DEALS" })).toBeNull();
    expect(visualizacaoDaOrigem(null)).toBeNull();
  });

  it("lê a lista de pessoas: só uuid, minúsculo, sem repetição; lixo vira lista vazia", () => {
    expect(pessoasDaOrigem({ escale_pessoas: [EU, EU.toUpperCase(), OUTRO, "lixo", 3] })).toEqual([
      EU,
      OUTRO,
    ]);
    expect(pessoasDaOrigem({ escale_pessoas: "x" })).toEqual([]);
    expect(pessoasDaOrigem({})).toEqual([]);
  });

  it("a regra em vigor: origem, senão organização, senão o padrão", () => {
    expect(regraEmVigor({ escale_visualizacao: "all" }, "own")).toBe("all");
    expect(regraEmVigor({}, "own")).toBe("own");
    expect(regraEmVigor({}, null)).toBe("own_and_unassigned");
  });
});

describe("quem tem acesso à origem (N4): só admin passa por cima; a lista da origem vence a do grupo", () => {
  it("admin sempre; gerente, agente e viewer seguem a lista", () => {
    expect(
      temAcessoAOrigem({ papel: "admin", userId: EU, pessoas: [OUTRO], pessoasDoGrupo: [] }),
    ).toBe(true);
    expect(
      temAcessoAOrigem({ papel: "manager", userId: EU, pessoas: [OUTRO], pessoasDoGrupo: [] }),
    ).toBe(false);
    expect(
      temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [EU], pessoasDoGrupo: [] }),
    ).toBe(true);
    expect(
      temAcessoAOrigem({ papel: "viewer", userId: EU, pessoas: [OUTRO], pessoasDoGrupo: [] }),
    ).toBe(false);
    expect(temAcessoAOrigem({ papel: null, userId: EU, pessoas: [], pessoasDoGrupo: [] })).toBe(
      false,
    );
  });

  it("sem lista na origem, vale a do grupo; sem as duas, todos", () => {
    expect(temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [], pessoasDoGrupo: [] })).toBe(
      true,
    );
    expect(
      temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [], pessoasDoGrupo: [OUTRO] }),
    ).toBe(false);
    expect(
      temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [], pessoasDoGrupo: [EU] }),
    ).toBe(true);
    // A lista própria SOBREPÕE a do grupo (Clint `ewe`/`dH`).
    expect(
      temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [EU], pessoasDoGrupo: [OUTRO] }),
    ).toBe(true);
    expect(
      temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [OUTRO], pessoasDoGrupo: [EU] }),
    ).toBe(false);
  });

  it("o grupo: a lista dele, ou alguma origem dele com lista própria que me inclua", () => {
    expect(
      temAcessoAoGrupo({ papel: "agent", userId: EU, pessoasDoGrupo: [], listasDasOrigens: [] }),
    ).toBe(true);
    expect(
      temAcessoAoGrupo({
        papel: "agent",
        userId: EU,
        pessoasDoGrupo: [OUTRO],
        listasDasOrigens: [],
      }),
    ).toBe(false);
    expect(
      temAcessoAoGrupo({
        papel: "agent",
        userId: EU,
        pessoasDoGrupo: [OUTRO],
        listasDasOrigens: [[EU]],
      }),
    ).toBe(true);
    expect(
      temAcessoAoGrupo({
        papel: "admin",
        userId: EU,
        pessoasDoGrupo: [OUTRO],
        listasDasOrigens: [],
      }),
    ).toBe(true);
  });
});

describe("quem vê o negócio (N5, o espelho do SQL)", () => {
  const base = { userId: EU, pessoas: [] as string[], pessoasDoGrupo: [] as string[] };
  it("sem acesso à origem, ninguém abaixo de admin vê", () => {
    expect(
      podeVerNegocio({
        ...base,
        papel: "manager",
        donoUserId: OUTRO,
        regra: "all",
        pessoas: [OUTRO],
      }),
    ).toBe(false);
    expect(
      podeVerNegocio({
        ...base,
        papel: "admin",
        donoUserId: OUTRO,
        regra: "own",
        pessoas: [OUTRO],
      }),
    ).toBe(true);
  });
  it("viewer, gerente e admin veem tudo da origem; o agente segue a regra", () => {
    expect(podeVerNegocio({ ...base, papel: "viewer", donoUserId: OUTRO, regra: "own" })).toBe(
      true,
    );
    expect(podeVerNegocio({ ...base, papel: "manager", donoUserId: OUTRO, regra: "own" })).toBe(
      true,
    );
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: EU, regra: "own" })).toBe(true);
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: OUTRO, regra: "own" })).toBe(
      false,
    );
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: null, regra: "own" })).toBe(false);
    expect(
      podeVerNegocio({ ...base, papel: "agent", donoUserId: null, regra: "own_and_unassigned" }),
    ).toBe(true);
    expect(
      podeVerNegocio({ ...base, papel: "agent", donoUserId: OUTRO, regra: "own_and_unassigned" }),
    ).toBe(false);
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: OUTRO, regra: "all" })).toBe(true);
    expect(podeVerNegocio({ ...base, papel: null, donoUserId: EU, regra: "all" })).toBe(false);
  });
});

describe("quem troca o dono (N14)", () => {
  it("gerente+ sempre; abaixo disso só com a regra 'todos'", () => {
    expect(podeTrocarDono({ papel: "manager", regra: "own" })).toBe(true);
    expect(podeTrocarDono({ papel: "agent", regra: "all" })).toBe(true);
    expect(podeTrocarDono({ papel: "agent", regra: "own" })).toBe(false);
  });
});

describe("o aviso da ficha (N16)", () => {
  const base = {
    papel: "agent" as const,
    userId: EU,
    settingsDoGrupo: {},
    modoDaOrganizacao: "own_and_unassigned" as const,
  };
  it("sem acesso à origem → 'origem'; negócio de outro sob a regra → 'outro_dono'; visível → null", () => {
    expect(
      avisoDaFicha({ ...base, donoUserId: EU, settingsDaOrigem: { escale_pessoas: [OUTRO] } }),
    ).toBe("origem");
    expect(avisoDaFicha({ ...base, donoUserId: OUTRO, settingsDaOrigem: {} })).toBe("outro_dono");
    expect(avisoDaFicha({ ...base, donoUserId: null, settingsDaOrigem: {} })).toBeNull();
    expect(
      avisoDaFicha({
        ...base,
        donoUserId: OUTRO,
        settingsDaOrigem: {},
        settingsDoGrupo: { escale_pessoas: [OUTRO] },
      }),
    ).toBe("origem");
  });
});
