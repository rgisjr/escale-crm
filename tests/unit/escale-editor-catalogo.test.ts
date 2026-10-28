import { describe, expect, it } from "vitest";

import {
  buscarNaTela,
  estadoDoItem,
  filtrarPorCategoria,
  gruposDoAlvo,
  nomeDoChip,
} from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { ROTULO_DO_OPERADOR, operadoresDoTipo, precisaDeValor, textoDoNumeroBr, usaLista } from "@/lib/escale/indicadores/editor/operadores";
import {
  ATALHOS_DO_EDITOR,
  granularidadesDisponiveis,
  horaDisponivel,
  textoDoPersonalizado,
} from "@/lib/escale/indicadores/editor/periodo-do-editor";
import { CHAVE_DA_LARGURA, gravarLargura, lerLargura } from "@/lib/escale/indicadores/editor/preferencias";
import { adicionarIndicador, adicionarVariavel, rascunhoNovo } from "@/lib/escale/indicadores/editor/rascunho";
import { limiteDoTipo, VISUALIZACAO_POR_TIPO } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import { CATALOGO_FALSO as CAT } from "@/tests/helpers/catalogo-da-tela";

describe("catálogo da tela", () => {
  it("indicador: um grupo por assunto com as medidas", () => {
    const g = gruposDoAlvo(CAT, "indicador");
    expect(g.map((x) => x.id)).toEqual(["negocio", "conversa"]);
    expect(g[0]!.itens).toHaveLength(3);
  });

  it("variável acrescenta Campos personalizados com Contato Cargo; tempo lista os tempos", () => {
    const g = gruposDoAlvo(CAT, "variavel");
    expect(g.at(-1)).toMatchObject({ id: "campos", nome: "Campos personalizados" });
    expect(g.at(-1)!.itens.map((i) => i.nome)).toEqual(["Contato Cargo"]);
    expect(gruposDoAlvo(CAT, "tempo")[0]!.itens[0]!.id).toBe("negocio.criado_em");
  });

  it("categoria conversas mostra só conversa; campos só com o assunto fixado na categoria", () => {
    const g = gruposDoAlvo(CAT, "variavel");
    expect(filtrarPorCategoria(g, "conversas").map((x) => x.id)).toEqual(["conversa"]);
    expect(filtrarPorCategoria(g, "negocios", "negocios").map((x) => x.id)).toEqual(["negocio", "campos"]);
    expect(filtrarPorCategoria(g, "todos")).toHaveLength(3);
  });

  it("busca por pergunta, apelido (com trecho) e sem acento", () => {
    const g = gruposDoAlvo(CAT, "indicador");
    expect(buscarNaTela(g, "ganhei")[0]!.itens.map((i) => i.item.id)).toContain("negocio.quantidade");
    const porApelido = buscarNaTela(g, "vendas")[0]!.itens[0]!;
    expect(porApelido.apelido).toEqual({ texto: "vendas", de: 0, ate: 6 });
    expect(buscarNaTela(g, "negocios").length).toBeGreaterThan(0);
    expect(buscarNaTela(g, "xyz")).toEqual([]);
  });

  it("estado do item: já adicionado, outro assunto, no limite", () => {
    const g = gruposDoAlvo(CAT, "indicador");
    const item = (id: string) => g.flatMap((x) => x.itens).find((i) => i.id === id)!;
    const r = adicionarIndicador(rascunhoNovo(), "negocio.quantidade", CAT);
    expect(estadoDoItem(item("negocio.quantidade"), r, "indicador", CAT)).toBe("ja_adicionado");
    expect(estadoDoItem(item("conversa.iniciadas"), r, "indicador", CAT)).toBe("outro_assunto");
    expect(estadoDoItem(item("negocio.ganhos"), r, "indicador", CAT)).toBe("livre");
    const pizza = { ...r, tipo: "pizza" as const };
    expect(estadoDoItem(item("negocio.ganhos"), pizza, "indicador", CAT)).toBe("no_limite");
    const campo = gruposDoAlvo(CAT, "variavel").at(-1)!.itens[0]!;
    expect(estadoDoItem(campo, adicionarVariavel(rascunhoNovo(), "conversa.canal"), "variavel", CAT)).toBe("outro_assunto");
    expect(estadoDoItem(campo, r, "variavel", CAT)).toBe("livre");
  });

  it("nome do chip: assunto e item; campo com o objeto; desconhecido devolve o id", () => {
    expect(nomeDoChip("negocio.quantidade", CAT)).toBe("Negócio Quantidade");
    expect(nomeDoChip("campo:contato:cargo", CAT)).toBe("Contato Cargo");
    expect(nomeDoChip("x.y", CAT)).toBe("x.y");
  });
});

describe("operadores", () => {
  it("texto tem 8 e não tem maior que; número não tem contém; booleano só igual e diferente (e vazio)", () => {
    const texto = operadoresDoTipo("texto");
    expect(texto).toHaveLength(8);
    expect(texto).not.toContain("maior_que");
    expect(operadoresDoTipo("numero")).not.toContain("contem");
    expect(operadoresDoTipo("booleano")).toEqual(["igual_a", "diferente_de", "nao_vazio", "vazio"]);
    expect(ROTULO_DO_OPERADOR.nao_vazio).toBe("não está vazio");
  });

  it("precisa de valor e lista", () => {
    expect(precisaDeValor("vazio")).toBe(false);
    expect(precisaDeValor("contem")).toBe(true);
    expect(usaLista({ opcoes: "etapas" }, "igual_a")).toBe(true);
    expect(usaLista({ opcoes: "etapas" }, "contem")).toBe(false);
    expect(usaLista({}, "igual_a")).toBe(false);
  });

  it("número em texto brasileiro", () => {
    expect(textoDoNumeroBr("1.234,5")).toBe(1234.5);
    expect(textoDoNumeroBr("abc")).toBeNull();
  });
});

describe("período e preferências", () => {
  it("a lista de atalhos é a de 10-054", () => {
    expect([...ATALHOS_DO_EDITOR]).toEqual(["tudo", "hoje", "ontem", "7_dias", "15_dias", "1_mes", "este_mes", "personalizado"]);
  });

  it("hora só com período de até 31 dias", () => {
    const hora = (p: Parameters<typeof granularidadesDisponiveis>[0]) => granularidadesDisponiveis(p).find((x) => x.g === "hora")!.ligada;
    expect(hora({ atalho: "tudo" })).toBe(false);
    expect(hora({ atalho: "7_dias" })).toBe(true);
    expect(hora({ atalho: "personalizado", de: "2026-09-01", ate: "2026-10-10" })).toBe(false);
    expect(horaDisponivel({ atalho: "hoje" })).toBe(true);
  });

  it("texto do personalizado em dd/mm/aaaa", () => {
    expect(textoDoPersonalizado({ atalho: "personalizado", de: "2025-11-01", ate: "2025-11-30" })).toBe("01/11/2025 - 30/11/2025");
  });

  it("largura recortada em 240–500; storage que lança dá 400 e gravar não lança", () => {
    const guardado = new Map<string, string>();
    const storage = { getItem: (k: string) => guardado.get(k) ?? null, setItem: (k: string, v: string) => void guardado.set(k, v) };
    gravarLargura(600, storage);
    expect(guardado.get(CHAVE_DA_LARGURA)).toBe("500");
    expect(lerLargura(storage)).toBe(500);
    gravarLargura(100, storage);
    expect(lerLargura(storage)).toBe(240);
    const quebrado = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    expect(lerLargura(quebrado)).toBe(400);
    expect(() => gravarLargura(300, quebrado)).not.toThrow();
  });

  it("limites e visualização por tipo", () => {
    expect([limiteDoTipo("pizza"), limiteDoTipo("numero"), limiteDoTipo("barra")]).toEqual([1, 2, 5]);
    expect(VISUALIZACAO_POR_TIPO.donut).toEqual(["valores", "legendas"]);
    expect(VISUALIZACAO_POR_TIPO.tabela).toEqual(["projecaoNormal", "projecaoDiasUteis"]);
    expect(VISUALIZACAO_POR_TIPO.ranking).toEqual([]);
    expect(limiteDoTipo("ranking")).toBe(1);
  });
});
