import { beforeEach, describe, expect, it } from "vitest";

import { assuntoDoRascunho } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { perguntaDoRascunho, rascunhoDoGrafico } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import {
  adicionarCondicao,
  adicionarIndicador,
  adicionarVariavel,
  definirGeradorDeChave,
  definirTempo,
  manterIndicadores,
  mesmoRascunho,
  mudarCondicao,
  mudarPeriodo,
  novoGrupo,
  rascunhoNovo,
  removerCondicao,
  removerIndicador,
  trocarTipo,
  type RascunhoDoGrafico,
} from "@/lib/escale/indicadores/editor/rascunho";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";
import { CATALOGO_FALSO as CAT } from "@/tests/helpers/catalogo-da-tela";

const congelar = <T>(o: T): T => {
  if (o && typeof o === "object") {
    Object.values(o).forEach(congelar);
    Object.freeze(o);
  }
  return o;
};
const QTD = "negocio.quantidade";

beforeEach(() => {
  let n = 0;
  definirGeradorDeChave(() => `k${++n}`);
});

describe("rascunho", () => {
  it("nasce em Linha, Este mês, sem tempo, com valores, legendas e grade ligados", () => {
    const r = rascunhoNovo();
    expect(r.tipo).toBe("linha");
    expect(r.tempo).toEqual({ campo: null, granularidade: null, periodo: { atalho: "este_mes" }, fixo: false });
    expect(r.opcoes.visualizacao).toMatchObject({ valores: true, legendas: true, grade: true });
    expect(r.filtro).toHaveLength(1);
  });

  it("o 1º indicador traz o tempo padrão por dia; o 2º não mexe", () => {
    const um = adicionarIndicador(congelar(rascunhoNovo()), QTD, CAT);
    expect(um.tempo).toMatchObject({ campo: "negocio.criado_em", granularidade: "dia" });
    const dois = adicionarIndicador(congelar(um), "negocio.ganhos", CAT);
    expect(dois.tempo).toEqual(um.tempo);
    expect(dois.indicadores).toEqual([QTD, "negocio.ganhos"]);
  });

  it("tirar o tempo zera o agrupamento; hora com tudo cai para dia", () => {
    const r = adicionarIndicador(rascunhoNovo(), QTD, CAT);
    expect(definirTempo(r, null).tempo).toMatchObject({ campo: null, granularidade: null });
    const hora = { ...r, tempo: { ...r.tempo, granularidade: "hora" as const } };
    expect(mudarPeriodo(hora, { atalho: "tudo" }).tempo.granularidade).toBe("dia");
    expect(mudarPeriodo(hora, { atalho: "7_dias" }).tempo.granularidade).toBe("hora");
  });

  it("o assunto vem do primeiro item de qualquer seção", () => {
    expect(assuntoDoRascunho(rascunhoNovo())).toBeNull();
    expect(assuntoDoRascunho(adicionarVariavel(rascunhoNovo(), "conversa.canal"))).toBe("conversa");
  });

  it("variável para na 2ª; remover indicador tira de ordem.por", () => {
    const v = adicionarVariavel(adicionarVariavel(adicionarVariavel(rascunhoNovo(), "negocio.etapa"), "negocio.origem"), "negocio.titulo");
    expect(v.variaveis).toEqual(["negocio.etapa", "negocio.origem"]);
    const r = { ...adicionarIndicador(rascunhoNovo(), QTD, CAT), ordem: { por: QTD, direcao: "desc" as const } };
    expect(removerIndicador(r, QTD).ordem.por).toBeNull();
  });

  it("condição: operador sem valor apaga o valor; caixa de grupo vazia sai e a principal fica", () => {
    let r = adicionarCondicao(rascunhoNovo(), 0, "negocio.etapa", CAT);
    const chave = r.filtro[0]!.condicoes[0]!.chave;
    r = mudarCondicao(r, 0, chave, { valor: ["e1"] });
    expect(r.filtro[0]!.condicoes[0]!.valor).toEqual(["e1"]);
    r = mudarCondicao(r, 0, chave, { op: "vazio" });
    expect(r.filtro[0]!.condicoes[0]).not.toHaveProperty("valor");
    r = novoGrupo(r);
    r = adicionarCondicao(r, 1, "negocio.origem", CAT);
    const g = r.filtro[1]!.condicoes[0]!.chave;
    expect(removerCondicao(r, 1, g).filtro).toHaveLength(1);
    expect(removerCondicao(r, 0, chave).filtro[0]!.condicoes).toHaveLength(0);
  });

  it("novoGrupo para em 4 caixas", () => {
    expect(novoGrupo(novoGrupo(novoGrupo(novoGrupo(rascunhoNovo())))).filtro).toHaveLength(4);
  });

  it("trocarTipo avisa quando excede; manterIndicadores corta", () => {
    let r: RascunhoDoGrafico = { ...rascunhoNovo("barra"), indicadores: [QTD, "negocio.ganhos", "negocio.soma_de_valores"] };
    const t = trocarTipo(congelar(r), "pizza");
    expect("excede" in t && t.excede.limite).toBe(1);
    expect("rascunho" in trocarTipo(r, "tabela")).toBe(true);
    r = manterIndicadores(r, "pizza", ["negocio.ganhos"]);
    expect(r).toMatchObject({ tipo: "pizza", indicadores: ["negocio.ganhos"] });
  });
});

describe("pergunta do rascunho", () => {
  const base = (): RascunhoDoGrafico => adicionarIndicador(rascunhoNovo("barra"), QTD, CAT);

  it("sem indicador → erro de indicador", () => {
    expect(perguntaDoRascunho(rascunhoNovo(), CAT)).toEqual({ ok: false, erros: [{ secao: "indicador" }] });
  });

  it("condição sem valor → erro com a chave; está vazio sem valor passa", () => {
    let r = adicionarCondicao(base(), 0, "negocio.titulo", CAT);
    const chave = r.filtro[0]!.condicoes[0]!.chave;
    expect(perguntaDoRascunho(r, CAT)).toEqual({ ok: false, erros: [{ secao: "filtro", condicao: chave }] });
    r = mudarCondicao(r, 0, chave, { op: "vazio" });
    expect(perguntaDoRascunho(r, CAT).ok).toBe(true);
  });

  it("caixas vazias saem; a 1ª restante vira a principal; o resultado passa no schema", () => {
    let r = novoGrupo(novoGrupo(base()));
    r = adicionarCondicao(r, 2, "negocio.origem", CAT);
    r = mudarCondicao(r, 2, r.filtro[2]!.condicoes[0]!.chave, { valor: ["o1"] });
    const res = perguntaDoRascunho(r, CAT);
    expect(res.ok && res.pergunta.filtro.condicoes).toHaveLength(1);
    expect(res.ok && perguntaSchema.safeParse(res.pergunta).success).toBe(true);
  });

  it("principal todas + grupo: condições soltas e grupos; principal qualquer + grupo: tudo em grupos", () => {
    const com = (modo: "todas" | "qualquer") => {
      let r = base();
      r = { ...r, filtro: [{ ...r.filtro[0]!, modo }] };
      r = adicionarCondicao(r, 0, "negocio.origem", CAT);
      r = mudarCondicao(r, 0, r.filtro[0]!.condicoes[0]!.chave, { valor: ["o1"] });
      r = novoGrupo(r);
      r = adicionarCondicao(r, 1, "negocio.etapa", CAT);
      r = mudarCondicao(r, 1, r.filtro[1]!.condicoes[0]!.chave, { valor: ["e1"] });
      const res = perguntaDoRascunho(r, CAT);
      if (!res.ok) throw new Error("esperava ok");
      return res.pergunta.filtro;
    };
    const todas = com("todas");
    expect(todas.condicoes).toHaveLength(1);
    expect(todas.grupos).toHaveLength(1);
    const qualquer = com("qualquer");
    expect(qualquer.condicoes).toHaveLength(0);
    expect(qualquer.grupos).toHaveLength(2);
  });

  it("número em texto brasileiro vira número; ordem sem por não vai", () => {
    let r = adicionarCondicao(base(), 0, "negocio.valor", CAT);
    r = mudarCondicao(r, 0, r.filtro[0]!.condicoes[0]!.chave, { op: "maior_que", valor: "1.234,5" });
    const res = perguntaDoRascunho(r, CAT);
    expect(res.ok && res.pergunta.filtro.condicoes[0]?.valor).toBe(1234.5);
    expect(res.ok && res.pergunta.ordem).toBeUndefined();
  });

  it("ida e volta devolve um rascunho igual (cinco exemplos)", () => {
    const exemplos: RascunhoDoGrafico[] = [
      base(),
      adicionarVariavel(base(), "negocio.origem"),
      { ...adicionarVariavel(base(), "negocio.etapa"), ordem: { por: QTD, direcao: "desc" } },
      mudarPeriodo(base(), { atalho: "personalizado", de: "2026-10-01", ate: "2026-10-31" }),
      (() => {
        let r = adicionarCondicao(base(), 0, "negocio.etapa", CAT);
        r = mudarCondicao(r, 0, r.filtro[0]!.condicoes[0]!.chave, { op: "diferente_de", valor: ["e1"] });
        r = novoGrupo(r);
        r = adicionarCondicao(r, 1, "negocio.origem", CAT);
        return mudarCondicao(r, 1, r.filtro[1]!.condicoes[0]!.chave, { valor: ["o1"] });
      })(),
    ];
    for (const r of exemplos) {
      const res = perguntaDoRascunho(r, CAT);
      if (!res.ok) throw new Error("esperava ok");
      expect(mesmoRascunho(rascunhoDoGrafico({ tipo: r.tipo, pergunta: res.pergunta, opcoes: r.opcoes }), r)).toBe(true);
    }
  });

  it("pergunta salva inválida → rascunho novo com o tipo gravado; tipo desconhecido → linha", () => {
    expect(rascunhoDoGrafico({ tipo: "funil", pergunta: { lixo: 1 }, opcoes: {} })).toMatchObject({ tipo: "funil", indicadores: [] });
    expect(rascunhoDoGrafico({ tipo: "tipo_que_nao_existe", pergunta: { lixo: 1 }, opcoes: {} }).tipo).toBe("linha");
  });
});
