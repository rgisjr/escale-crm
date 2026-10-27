import { describe, expect, it } from "vitest";

import { montarOrigens, type Origens } from "@/lib/escale/origens/regras";
import { moverNaLista, movimentoDoArraste } from "@/lib/escale/origens/mover";

// Régua ativa da organização: f1, f2, f3, f5 (f4 está arquivado).
// Grupo A mostra f1, f3, f5; grupo B mostra f2; grupo C está vazio.
const ORIGENS: Origens = {
  grupos: [
    { id: "g-a", name: "A", color: null, icon: "iniciais", is_archived: false },
    { id: "g-b", name: "B", color: null, icon: "iniciais", is_archived: false },
    { id: "g-c", name: "C", color: null, icon: "iniciais", is_archived: false },
  ],
  funis: [
    { id: "f1", name: "Um", group_id: "g-a", is_archived: false, is_default: true },
    { id: "f2", name: "Dois", group_id: "g-b", is_archived: false, is_default: false },
    { id: "f3", name: "Três", group_id: "g-a", is_archived: false, is_default: false },
    { id: "f4", name: "Quatro", group_id: "g-a", is_archived: true, is_default: false },
    { id: "f5", name: "Cinco", group_id: "g-a", is_archived: false, is_default: false },
  ],
};

const doGrupo = (origens: Origens, id: string) =>
  montarOrigens(origens).grupos.find((g) => g.id === id)?.funis.map((f) => f.id);

describe("movimentoDoArraste", () => {
  it("subir para o topo do grupo vai para antes da primeira dele na régua", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f5", de: "g-a", para: "g-a", indice: 0 })).toEqual({
      id: "f5",
      grupoNovo: null,
      depoisDe: null,
    });
  });

  it("descer no grupo fica logo abaixo da vizinha de cima", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f1", de: "g-a", para: "g-a", indice: 1 })).toEqual({
      id: "f1",
      grupoNovo: null,
      depoisDe: "f3",
    });
    expect(movimentoDoArraste(ORIGENS, { id: "f1", de: "g-a", para: "g-a", indice: 2 })).toEqual({
      id: "f1",
      grupoNovo: null,
      depoisDe: "f5",
    });
  });

  it("no topo de outro grupo, fica logo abaixo de quem vem antes dele na régua", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f3", de: "g-a", para: "g-b", indice: 0 })).toEqual({
      id: "f3",
      grupoNovo: "g-b",
      depoisDe: "f1",
    });
  });

  it("num grupo vazio, vai para o fim da régua", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f1", de: "g-a", para: "g-c", indice: 0 })).toEqual({
      id: "f1",
      grupoNovo: "g-c",
      depoisDe: "f5",
    });
  });

  it("soltar no mesmo lugar não grava nada", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f3", de: "g-a", para: "g-a", indice: 1 })).toBeNull();
  });

  it("grupo de destino desconhecido não grava nada", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f3", de: "g-a", para: "g-x", indice: 0 })).toBeNull();
  });
});

describe("moverNaLista", () => {
  it("põe a origem no topo do grupo", () => {
    const depois = moverNaLista(ORIGENS, { id: "f5", grupoNovo: null, depoisDe: null });
    expect(doGrupo(depois, "g-a")).toEqual(["f5", "f1", "f3"]);
  });

  it("troca o grupo e põe logo abaixo do vizinho", () => {
    const depois = moverNaLista(ORIGENS, { id: "f3", grupoNovo: "g-b", depoisDe: "f1" });
    expect(doGrupo(depois, "g-b")).toEqual(["f3", "f2"]);
    expect(doGrupo(depois, "g-a")).toEqual(["f1", "f5"]);
  });

  it("não muda a lista original", () => {
    moverNaLista(ORIGENS, { id: "f5", grupoNovo: null, depoisDe: null });
    expect(ORIGENS.funis.map((f) => f.id)).toEqual(["f1", "f2", "f3", "f4", "f5"]);
  });

  it("origem desconhecida devolve a mesma lista", () => {
    expect(moverNaLista(ORIGENS, { id: "f9", grupoNovo: null, depoisDe: null })).toBe(ORIGENS);
  });
});
