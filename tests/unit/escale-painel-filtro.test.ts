import { beforeEach, describe, expect, it } from "vitest";

import { comVagaNoNavegador, _zerarFila } from "@/lib/escale/indicadores/painel/fila-do-navegador";
import {
  FILTRO_PADRAO,
  atalhoDaCasca,
  chipsDoPainel,
  contarFiltros,
  enxugarFiltroDoPainel,
  limparSecaoDoPainel,
  mesmosFiltrosDoPainel,
  periodoDoCalendario,
  removerChipDoPainel,
  rotuloDoSeletor,
  textoDoPeriodoDoPainel,
} from "@/lib/escale/indicadores/painel/filtro";
import {
  CHAVE_DO_FILTRO,
  gravarEstado,
  gravarIntervalo,
  lerEstado,
  lerIntervalo,
} from "@/lib/escale/indicadores/painel/preferencias";
import type { FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const tags = (n: number): NonNullable<FiltroDoPainel["tags"]> => ({
  combinar: "ou",
  grupos: [{ modo: "e", condicoes: Array.from({ length: n }, (_, i) => ({ op: "possui" as const, tag: `t${i}` })) }],
});
const t = (s: string) => s;

describe("filtro do painel", () => {
  it("conta e ordena os chips", () => {
    expect(contarFiltros(FILTRO_PADRAO)).toBe(1);
    const f: FiltroDoPainel = { ...FILTRO_PADRAO, usuarios: [U1], tags: tags(2) };
    expect(contarFiltros(f)).toBe(4);
    expect(chipsDoPainel(f).map((c) => c.chave)).toEqual(["periodo", "usuarios", "tags"]);
  });
  it("remove e limpa por seção", () => {
    const f: FiltroDoPainel = { ...FILTRO_PADRAO, usuarios: [U1], tags: tags(1) };
    expect(removerChipDoPainel(f, "periodo").periodo).toBeUndefined();
    expect(removerChipDoPainel(f, "periodo").usuarios).toEqual([U1]);
    const limpo = limparSecaoDoPainel(f, "segmentacao");
    expect(limpo).toEqual({ tags: tags(1) });
  });
  it("compara sem olhar a ordem dos ids e enxuga o vazio", () => {
    expect(mesmosFiltrosDoPainel({ usuarios: [U1, U2] }, { usuarios: [U2, U1] })).toBe(true);
    expect(enxugarFiltroDoPainel({ usuarios: [] })).toEqual({});
  });
  it("atalhos e textos", () => {
    expect(atalhoDaCasca("este_mes")).toBe("esse-mes");
    expect(atalhoDaCasca("7_dias")).toBeNull();
    expect(periodoDoCalendario("2026-10-01", "2026-10-31", new Date(2026, 9, 26))).toEqual({ atalho: "este_mes" });
    expect(periodoDoCalendario("2026-10-02", "2026-10-05", new Date(2026, 9, 26))).toEqual({
      atalho: "personalizado",
      de: "2026-10-02",
      ate: "2026-10-05",
    });
    expect(textoDoPeriodoDoPainel({ atalho: "este_mes" }, t)).toBe("Esse mês");
    expect(textoDoPeriodoDoPainel({ atalho: "personalizado", de: "2026-10-01", ate: "2026-10-17" }, t)).toBe(
      "01/10/2026 – 17/10/2026",
    );
  });
  it("rótulo do seletor", () => {
    expect(rotuloDoSeletor(FILTRO_PADRAO, null, t)).toBe("Este mês");
    expect(rotuloDoSeletor({ usuarios: [U1] }, null, t)).toBe("Personalizado");
    expect(rotuloDoSeletor({ usuarios: [U1] }, { nome: "Time SDR", criterios: { usuarios: [U1] } }, t)).toBe("Time SDR");
  });
});

function armazenamentoFalso(lanca = false): Storage {
  const dados = new Map<string, string>();
  return {
    getItem: (k: string) => {
      if (lanca) throw new Error("bloqueado");
      return dados.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (lanca) throw new Error("bloqueado");
      dados.set(k, v);
    },
  } as unknown as Storage;
}

describe("preferências no navegador", () => {
  it("padrão sem nada guardado; volta o que foi gravado", () => {
    const s = armazenamentoFalso();
    expect(lerEstado("p", s).filtro).toEqual(FILTRO_PADRAO);
    gravarEstado("p", { versao: 1, filtro: { usuarios: [U1] }, filtroSalvoId: "x", faixaAberta: true }, s);
    expect(lerEstado("p", s)).toEqual({ versao: 1, filtro: { usuarios: [U1] }, filtroSalvoId: "x", faixaAberta: true });
  });
  it("lixo, filtro inválido e storage que lança viram o padrão", () => {
    const s = armazenamentoFalso();
    s.setItem(CHAVE_DO_FILTRO("p"), "{quebrado");
    expect(lerEstado("p", s).filtro).toEqual(FILTRO_PADRAO);
    s.setItem(CHAVE_DO_FILTRO("p"), JSON.stringify({ versao: 1, filtro: { tags: { modo: "lista", valores: [] } } }));
    expect(lerEstado("p", s).filtro).toEqual(FILTRO_PADRAO);
    const ruim = armazenamentoFalso(true);
    expect(lerEstado("p", ruim).filtro).toEqual(FILTRO_PADRAO);
    expect(() => gravarEstado("p", lerEstado("p", ruim), ruim)).not.toThrow();
  });
  it("intervalo", () => {
    const s = armazenamentoFalso();
    s.setItem("escale:indicadores:atualizar-a-cada", "15");
    expect(lerIntervalo(s)).toBe(15);
    s.setItem("escale:indicadores:atualizar-a-cada", "7");
    expect(lerIntervalo(s)).toBeNull();
    gravarIntervalo(60, s);
    expect(lerIntervalo(s)).toBe(60);
  });
});

describe("fila do navegador", () => {
  beforeEach(() => _zerarFila());
  it("3 em execução; a 4ª começa quando uma termina; rejeição também solta a vaga", async () => {
    const soltar: Array<() => void> = [];
    const comecou: number[] = [];
    const tarefa = (i: number) => () =>
      new Promise<void>((resolve, reject) => {
        comecou.push(i);
        soltar[i] = () => (i === 0 ? reject(new Error("x")) : resolve());
      });
    const todas = [0, 1, 2, 3, 4].map((i) => comVagaNoNavegador(tarefa(i)).catch(() => undefined));
    await Promise.resolve();
    await Promise.resolve();
    expect(comecou).toEqual([0, 1, 2]);
    soltar[0]?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(comecou).toEqual([0, 1, 2, 3]);
    soltar[1]?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(comecou).toEqual([0, 1, 2, 3, 4]);
    [2, 3, 4].forEach((i) => soltar[i]?.());
    await Promise.all(todas);
  });
});
