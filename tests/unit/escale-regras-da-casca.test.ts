import { describe, expect, it } from "vitest";

import { contarPorGatilho, limparGatilho } from "@/lib/escale/filtros/gatilhos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import {
  atividadesDoCard,
  coresDaTag,
  corDoAvatar,
  dataDaMensagem,
  fotoDoContato,
  idadeNaEtapa,
  inicialDoNome,
  partesDaContagem,
  tituloDoCard,
  totalDaColuna,
  ultimaFoiDaEquipe,
  valorCurto,
} from "@/lib/escale/quadro/aparencia";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

const CHEIO: FiltrosDoQuadro = {
  status: ["open", "won"],
  dono: "u-1",
  tags: ["vip", "quente"],
  modoDasTags: "ou",
  criadoEm: { de: "2026-10-01" },
  campos: [{ alvo: "negocio", chave: "cidade", op: "contem", valor: "Natal" }],
  conversa: { naoLidas: true, canais: ["whatsapp"] },
  valor: { min: 100 },
  atrasados: true,
  tempoNaEtapa: { min: 2, unidade: "dias" },
  ordem: [{ campo: "negocio.valor", direcao: "desc" }],
};

describe("os gatilhos da barra da Clint", () => {
  it("cada gatilho conta o que é dele; o Status conta os status escolhidos", () => {
    expect(contarPorGatilho(CHEIO)).toEqual({
      data: 1,
      campos: 1,
      tags: 2,
      dono: 1,
      status: 2,
      mais: 5,
    });
    expect(contarPorGatilho({ status: ["open"] })).toEqual({
      data: 0,
      campos: 0,
      tags: 0,
      dono: 0,
      status: 1,
      mais: 0,
    });
    expect(contarPorGatilho({ status: ["lost"], perdidoEm: { ate: "2026-10-31" } }).data).toBe(1);
  });

  it("limpar um gatilho tira só o dele e mantém status, busca e ordenação", () => {
    const semMais = limparGatilho({ ...CHEIO, busca: "ana" }, "mais");
    expect(semMais.conversa).toBeUndefined();
    expect(semMais.valor).toBeUndefined();
    expect(semMais.atrasados).toBeUndefined();
    expect(semMais.tempoNaEtapa).toBeUndefined();
    expect(semMais.tags).toEqual(["vip", "quente"]);
    expect(semMais.busca).toBe("ana");
    expect(semMais.ordem).toEqual(CHEIO.ordem);
    expect(limparGatilho(CHEIO, "tags").modoDasTags).toBeUndefined();
    expect(limparGatilho(CHEIO, "data").criadoEm).toBeUndefined();
    expect(limparGatilho(CHEIO, "dono").dono).toBeUndefined();
    expect(limparGatilho(CHEIO, "campos").campos).toBeUndefined();
  });
});

describe("a contagem do quadro", () => {
  it("separa o texto em volta do 'Negócio' em negrito", () => {
    expect(partesDaContagem("{n} oportunidades de {negocio}", 21)).toEqual({
      antes: "21 oportunidades de ",
      depois: "",
    });
    expect(partesDaContagem("{n} oportunidad de {negocio}", 1)).toEqual({
      antes: "1 oportunidad de ",
      depois: "",
    });
  });
});

describe("valores como a Clint escreve", () => {
  it("o card: sem espaço, sem centavos, k e M com uma casa", () => {
    expect(valorCurto(null, null)).toBe("R$0");
    expect(valorCurto(95_000, "BRL")).toBe("R$950");
    expect(valorCurto(6_480_000, "BRL")).toBe("R$64,8k");
    expect(valorCurto(100_000, "BRL")).toBe("R$1k");
    expect(valorCurto(120_000_000, "BRL")).toBe("R$1,2M");
  });

  it("o total da coluna: R$0 sem valor (nunca 'undefined'), milhar com ponto, moedas lado a lado", () => {
    expect(totalDaColuna([])).toBe("R$0");
    expect(totalDaColuna([{ value_cents: null, currency: null }])).toBe("R$0");
    expect(
      totalDaColuna([
        { value_cents: 1_000_000, currency: "BRL" },
        { value_cents: 250_000, currency: null },
      ]),
    ).toBe("R$12.500");
    expect(
      totalDaColuna([
        { value_cents: 100_000, currency: "USD" },
        { value_cents: 100_000, currency: "BRL" },
      ]),
    ).toMatch(/^R\$1\.000 \+ .*1\.000$/);
  });
});

describe("tempo e datas do card", () => {
  it("tempo na etapa: horas até 47h, depois dias", () => {
    expect(idadeNaEtapa(null)).toBe("");
    expect(idadeNaEtapa(0.4)).toBe("0h");
    expect(idadeNaEtapa(31.9)).toBe("31h");
    expect(idadeNaEtapa(47)).toBe("47h");
    expect(idadeNaEtapa(48)).toBe("2d");
    expect(idadeNaEtapa(24 * 19 + 5)).toBe("19d");
  });

  it("data da última mensagem: hora quando é hoje, dd/mm nos outros dias", () => {
    const agora = new Date(2026, 9, 15, 18, 0);
    expect(dataDaMensagem(new Date(2026, 9, 15, 10, 31).toISOString(), agora)).toBe("10:31");
    expect(dataDaMensagem(new Date(2026, 8, 23, 9, 0).toISOString(), agora)).toBe("23/09");
    expect(dataDaMensagem(null, agora)).toBe("");
  });
});

describe("avatares e tags", () => {
  it("a cor do avatar é sempre a mesma para a mesma pessoa, e a inicial é maiúscula", () => {
    expect(corDoAvatar("u-1")).toBe(corDoAvatar("u-1"));
    expect(corDoAvatar("u-1")).toMatch(/^#[0-9A-F]{6}$/);
    expect(inicialDoNome("  ivone ")).toBe("I");
    expect(inicialDoNome(null)).toBe("?");
  });

  it("os 8 tons das nossas etiquetas viram a paleta da Clint; sem cor é o azul padrão", () => {
    expect(coresDaTag("#cf3716")).toEqual({ fundo: "#FFAAA3", texto: "#F44336" });
    expect(coresDaTag("#3E63DD")).toEqual({ fundo: "#B3BEFF", texto: "#3F51B5" });
    expect(coresDaTag(null)).toEqual({ fundo: "#91CEFF", texto: "#2196F3" });
  });
});

describe("o que o card mostra", () => {
  it("o título é o nome do contato; sem nome, o título do negócio", () => {
    expect(
      tituloDoCard(
        negocio("a", { title: "+5511999990000" }, { contato_nome: "Reinaldo Fernandes" }),
      ),
    ).toBe("Reinaldo Fernandes");
    expect(tituloDoCard(negocio("b", { title: "Projeto X" }, { contato_nome: null }))).toBe(
      "Projeto X",
    );
    expect(tituloDoCard(negocio("c", { title: "Sem dados" }))).toBe("Sem dados");
  });

  it("atividades: concluídas sobre o total (concluídas + abertas)", () => {
    expect(
      atividadesDoCard(
        negocio("a", { tarefas: { abertas: 3, atrasadas: 1 } }, { atividades_concluidas: 2 }),
      ),
    ).toEqual({
      concluidas: 2,
      total: 5,
      atrasadas: 1,
    });
    expect(atividadesDoCard(negocio("b"))).toEqual({ concluidas: 0, total: 0, atrasadas: 0 });
  });

  it("✓✓ só quando a última mensagem é da equipe", () => {
    const base = { status: "open", canal: "whatsapp", atendente_id: null };
    expect(
      ultimaFoiDaEquipe({
        ...base,
        ultima_entrada: "2026-10-15T10:00:00Z",
        ultima_saida: "2026-10-15T11:00:00Z",
      }),
    ).toBe(true);
    expect(
      ultimaFoiDaEquipe({
        ...base,
        ultima_entrada: "2026-10-15T12:00:00Z",
        ultima_saida: "2026-10-15T11:00:00Z",
      }),
    ).toBe(false);
    expect(ultimaFoiDaEquipe({ ...base, ultima_entrada: null, ultima_saida: null })).toBe(false);
    expect(ultimaFoiDaEquipe(null)).toBe(false);
  });

  it("a foto vem da rota do avatar, só quando o contato tem foto", () => {
    expect(fotoDoContato(negocio("a", { contact_id: "c1" }, { contato_tem_foto: true }))).toBe(
      "/api/v1/contacts/c1/avatar",
    );
    expect(
      fotoDoContato(negocio("b", { contact_id: "c1" }, { contato_tem_foto: false })),
    ).toBeNull();
    expect(fotoDoContato(negocio("c"))).toBeNull();
  });
});
