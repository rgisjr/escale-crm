import { describe, expect, it } from "vitest";

import {
  ERRO_DA_SOMA,
  ERRO_DO_ZERO,
  dataBr,
  dividirIgual,
  horaBr,
  distribuidosForaDaLista,
  erroDaDistribuicao,
  linhasDaTela,
  pedidoDaDistribuicao,
  percentualDaTela,
  textoDoBloqueio,
  tempoRelativo,
  textoDoPercentual,
  versoesDaDistribuicao,
  type AlteracaoDaDistribuicao,
  type LinhaDaDistribuicao,
} from "@/lib/escale/distribuicao/regras";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const linha = (userId: string, percentual: string, papel = "agent"): LinhaDaDistribuicao => ({
  userId,
  percentual,
  papel,
});

describe("percentual", () => {
  it("lê vírgula e ponto; vazio é null; o resto é NaN", () => {
    expect(percentualDaTela("33,33")).toBe(33.33);
    expect(percentualDaTela(" 50.5 ")).toBe(50.5);
    expect(percentualDaTela("")).toBeNull();
    expect(percentualDaTela("abc")).toBeNaN();
    expect(percentualDaTela("1,234")).toBeNaN();
  });

  it("escreve com vírgula, sem zeros sobrando (N10)", () => {
    expect(textoDoPercentual(33.33)).toBe("33,33");
    expect(textoDoPercentual(100)).toBe("100");
    expect(textoDoPercentual(12.5)).toBe("12,5");
  });

  it("linhasDaTela leva o percentual do servidor para o texto da tela", () => {
    expect(linhasDaTela([{ userId: A, percentual: 33.33, contador: 4, papel: "agent" }])).toEqual([
      { userId: A, percentual: "33,33", papel: "agent" },
    ]);
  });
});

describe("dividirIgual (Clint: entrou ou saiu alguém, todos com 100/n)", () => {
  it("três pessoas ficam com 33,33; uma fica com 100; nenhuma é lista vazia", () => {
    expect(
      dividirIgual([linha(A, "90"), linha(B, "5"), linha(C, "5")]).map((l) => l.percentual),
    ).toEqual(["33,33", "33,33", "33,33"]);
    expect(dividirIgual([linha(A, "10")]).map((l) => l.percentual)).toEqual(["100"]);
    expect(dividirIgual([])).toEqual([]);
  });
});

describe("erroDaDistribuicao (o que trava o Salvar)", () => {
  it("lista vazia passa; 33,33 três vezes soma 100 arredondado e passa", () => {
    expect(erroDaDistribuicao([])).toBeNull();
    expect(
      erroDaDistribuicao([linha(A, "33,33"), linha(B, "33,33"), linha(C, "33,33")]),
    ).toBeNull();
  });

  it("zero, vazio ou texto: 'maiores que 0%'", () => {
    expect(erroDaDistribuicao([linha(A, "100"), linha(B, "0")])).toBe(ERRO_DO_ZERO);
    expect(erroDaDistribuicao([linha(A, "100"), linha(B, "")])).toBe(ERRO_DO_ZERO);
    expect(erroDaDistribuicao([linha(A, "x")])).toBe(ERRO_DO_ZERO);
  });

  it("soma diferente de 100, ou alguém acima de 100: 'deve somar 100%'", () => {
    expect(erroDaDistribuicao([linha(A, "50"), linha(B, "40")])).toBe(ERRO_DA_SOMA);
    expect(erroDaDistribuicao([linha(A, "100,4")])).toBe(ERRO_DA_SOMA);
  });

  it("o pedido leva os números", () => {
    expect(pedidoDaDistribuicao([linha(A, "75"), linha(B, "25")], true)).toEqual({
      pessoas: [
        { user_id: A, percentual: 75 },
        { user_id: B, percentual: 25 },
      ],
      reiniciar: true,
    });
  });
});

describe("distribuidosForaDaLista (Q9 da 1J)", () => {
  it("sem lista na origem nem no grupo, ninguém fica de fora", () => {
    expect(
      distribuidosForaDaLista({
        linhas: [linha(A, "50"), linha(B, "50")],
        pessoas: [],
        pessoasDoGrupo: [],
      }),
    ).toEqual([]);
  });

  it("lista da origem só com A: B fica de fora; admin nunca fica", () => {
    const linhas = [linha(A, "40"), linha(B, "30"), linha(C, "30", "admin")];
    expect(distribuidosForaDaLista({ linhas, pessoas: [A], pessoasDoGrupo: [] })).toEqual([B]);
  });

  it("sem lista própria, vale a do grupo", () => {
    expect(
      distribuidosForaDaLista({
        linhas: [linha(A, "50"), linha(B, "50")],
        pessoas: [],
        pessoasDoGrupo: [B],
      }),
    ).toEqual([A]);
  });

  it("o texto da Clint: singular, plural e a variante do grupo", () => {
    expect(textoDoBloqueio(1, false)).toBe(
      "Não é possível salvar. Este usuário recebe negócios por distribuição nesta origem e não está na lista: {usuarios}. Inclua-o na lista de permissões ou remova-o da distribuição.",
    );
    expect(textoDoBloqueio(2, false)).toBe(
      "Não é possível salvar. Estes usuários recebem negócios por distribuição nesta origem e não estão na lista: {usuarios}. Inclua-os na lista de permissões ou remova-os da distribuição.",
    );
    expect(textoDoBloqueio(1, true)).toBe(
      "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e este usuário que recebe negócios por distribuição não está nelas: {usuarios}. Remova-o da distribuição ou mantenha uma lista própria que o inclua.",
    );
    expect(textoDoBloqueio(3, true)).toBe(
      "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e estes usuários que recebem negócios por distribuição não estão nelas: {usuarios}. Remova-os da distribuição ou mantenha uma lista própria que os inclua.",
    );
  });
});

describe("versoesDaDistribuicao (Clint: mesmo autor em até 2 s é uma versão)", () => {
  const alt = (id: string, autorId: string, em: string): AlteracaoDaDistribuicao => ({
    id,
    evento: "pessoa_entrou",
    pessoaId: A,
    percentualAntes: null,
    percentualDepois: 50,
    autorId,
    em,
  });

  it("junta as do mesmo autor perto no tempo e separa o resto, da mais nova para a mais velha", () => {
    const versoes = versoesDaDistribuicao([
      alt("1", A, "2026-10-18T10:00:00.000Z"),
      alt("2", A, "2026-10-18T10:00:01.500Z"),
      alt("3", B, "2026-10-18T10:00:02.000Z"),
      alt("4", A, "2026-10-18T11:00:00.000Z"),
    ]);
    expect(versoes.map((v) => v.itens.map((i) => i.id))).toEqual([["4"], ["3"], ["2", "1"]]);
    expect(versoes[0]?.autorId).toBe(A);
  });
});

describe("datas e tempo (formato brasileiro, 24 h)", () => {
  it("dataBr e horaBr", () => {
    const iso = new Date(2026, 9, 18, 9, 5).toISOString();
    expect(dataBr(iso)).toBe("18/10/2026");
    expect(horaBr(iso)).toBe("09:05");
  });

  it("tempoRelativo usa a unidade certa", () => {
    const agora = Date.parse("2026-10-18T12:00:00Z");
    expect(tempoRelativo("2026-10-18T11:55:00Z", agora, "pt-BR")).toBe("há 5 minutos");
    expect(tempoRelativo("2026-10-18T09:00:00Z", agora, "pt-BR")).toBe("há 3 horas");
    expect(tempoRelativo("2026-10-16T12:00:00Z", agora, "pt-BR")).toBe("anteontem");
  });
});
