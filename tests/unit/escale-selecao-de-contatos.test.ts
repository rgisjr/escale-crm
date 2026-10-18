import { describe, expect, it } from "vitest";

import {
  IDS_MAX,
  SELECIONAR_TODOS,
  SEM_SELECAO,
  alternarLinha,
  alvoDaSelecao,
  estadoDaPagina,
  linhaMarcada,
  marcarPagina,
  selecionarQuantidade,
  todosMarcados,
  totalSelecionado,
  type Selecao,
} from "@/lib/escale/contatos/selecao";

const pagina = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("seleção da lista de contatos (B3)", () => {
  it("a caixinha do cabeçalho marca e desmarca só a página", () => {
    const s = marcarPagina(SEM_SELECAO, pagina, 0, true);
    expect(estadoDaPagina(s, pagina, 0)).toBe(true);
    expect(totalSelecionado(s, 64001)).toBe(3);
    expect(estadoDaPagina(alternarLinha(s, "b", 1, false), pagina, 0)).toBe("indeterminada");
    expect(marcarPagina(s, pagina, 0, false)).toEqual(SEM_SELECAO);
  });

  it("marcados à mão valem entre páginas, até 1.000", () => {
    const s = marcarPagina(marcarPagina(SEM_SELECAO, pagina, 0, true), [{ id: "d" }], 10, true);
    expect(totalSelecionado(s, 64001)).toBe(4);
    const cheia: Selecao = { tipo: "ids", ids: Array.from({ length: IDS_MAX }, (_, i) => `x${i}`) };
    expect(alternarLinha(cheia, "novo", 0, true)).toBe(cheia);
  });

  it("todos: o total do filtro, e desmarcar uma linha a exclui", () => {
    const s = alternarLinha(SELECIONAR_TODOS, "b", 1, false);
    expect(totalSelecionado(s, 64001)).toBe(64000);
    expect(linhaMarcada(s, "b", 1)).toBe(false);
    expect(linhaMarcada(s, "z", 5000)).toBe(true);
    expect(todosMarcados(SELECIONAR_TODOS)).toBe(true);
    expect(todosMarcados(s)).toBe(false);
  });

  it("'Selecionar [N]': os N primeiros; N ≥ total = todos; 0 limpa", () => {
    const s = selecionarQuantidade(2, 10);
    expect(linhaMarcada(s, "a", 0)).toBe(true);
    expect(linhaMarcada(s, "c", 2)).toBe(false);
    expect(totalSelecionado(s, 10)).toBe(2);
    expect(selecionarQuantidade(10, 10)).toEqual(SELECIONAR_TODOS);
    expect(selecionarQuantidade(0, 10)).toEqual(SEM_SELECAO);
  });

  it("o alvo da ação: ids, ou o filtro com quantidade e excluídos (nunca a lista inteira de ids)", () => {
    expect(alvoDaSelecao({ tipo: "ids", ids: ["a"] }, { v: "todos" })).toEqual({
      tipo: "ids",
      ids: ["a"],
    });
    expect(
      alvoDaSelecao(
        { tipo: "todos", quantidade: 50, excluidos: ["b"] },
        { q: " ana ", v: "com_negocio", f: '{"telefone":"com"}' },
      ),
    ).toEqual({
      tipo: "filtro",
      q: "ana",
      v: "com_negocio",
      f: '{"telefone":"com"}',
      quantidade: 50,
      excluidos: ["b"],
    });
  });
});
