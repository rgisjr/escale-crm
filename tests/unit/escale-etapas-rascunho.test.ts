import { describe, expect, it } from "vitest";

import type { EtapaDaOrigem } from "@/lib/escale/configuracoes/montar";
import {
  criarEtapaProvisoria,
  decidirNegocios,
  editarEtapa,
  erroDaEtapa,
  etapasMudaram,
  excluirEtapa,
  moverEtapa,
  nomeRepetido,
  pedidoDeGravarEtapas,
  rascunhoInicialDasEtapas,
} from "@/lib/escale/etapas/rascunho";

/** FORK ESCALE · Fase 1L: as regras puras do rascunho das etapas (lápis, lixeira, arrastar, "Nova Etapa"). */
const SALVAS: EtapaDaOrigem[] = [
  {
    id: "e1",
    name: "1. Entrada",
    description: "Começo",
    position: 1,
    is_won: false,
    is_lost: false,
  },
  {
    id: "e2",
    name: "2. Atendimento",
    description: null,
    position: 2,
    is_won: false,
    is_lost: false,
  },
  { id: "g", name: "Ganho", description: null, position: 3, is_won: true, is_lost: false },
  { id: "p", name: "Perdido", description: null, position: 4, is_won: false, is_lost: true },
];

describe("rascunho das etapas", () => {
  it("começa só com as etapas abertas, na ordem, e sem mudança", () => {
    const r = rascunhoInicialDasEtapas(SALVAS);
    expect(r.etapas.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(r.etapas[0]).toMatchObject({ nome: "1. Entrada", descricao: "Começo", nova: false });
    expect(etapasMudaram(r, SALVAS)).toBe(false);
  });

  it("valida nome (1 a 40) e descrição (até 200)", () => {
    expect(erroDaEtapa("", "")).toBe("O nome precisa ter pelo menos 1 caractere.");
    expect(erroDaEtapa("   ", "")).toBe("O nome precisa ter pelo menos 1 caractere.");
    expect(erroDaEtapa("x".repeat(41), "")).toBe("O nome pode ter no máximo 40 caracteres.");
    expect(erroDaEtapa("ok", "y".repeat(201))).toBe(
      "A descrição não pode ter mais de 200 caracteres.",
    );
    expect(erroDaEtapa("x".repeat(40), "y".repeat(200))).toBeNull();
  });

  it("'Nova Etapa' entra no fim, com o nome 'Nova Etapa N' e id provisório", () => {
    const r = criarEtapaProvisoria(rascunhoInicialDasEtapas(SALVAS), "novo:a");
    expect(r.etapas.at(-1)).toEqual({
      id: "novo:a",
      nome: "Nova Etapa 3",
      descricao: "",
      nova: true,
    });
    expect(etapasMudaram(r, SALVAS)).toBe(true);
  });

  it("editar muda nome e descrição (aparados) só da etapa pedida; voltar ao original desmarca a mudança", () => {
    const base = rascunhoInicialDasEtapas(SALVAS);
    const r = editarEtapa(base, "e2", { nome: "  2. Em atendimento ", descricao: " explica " });
    expect(r.etapas[1]).toMatchObject({ nome: "2. Em atendimento", descricao: "explica" });
    expect(r.etapas[0]).toBe(base.etapas[0]);
    expect(etapasMudaram(r, SALVAS)).toBe(true);
    expect(
      etapasMudaram(editarEtapa(r, "e2", { nome: "2. Atendimento", descricao: "" }), SALVAS),
    ).toBe(false);
  });

  it("arrastar troca a ordem sem mexer no resto; índice fora do intervalo não faz nada", () => {
    const base = rascunhoInicialDasEtapas(SALVAS);
    expect(moverEtapa(base, 0, 1).etapas.map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(moverEtapa(base, 0, 5)).toBe(base);
    expect(etapasMudaram(moverEtapa(base, 0, 1), SALVAS)).toBe(true);
  });

  it("excluir etapa criada agora some sem rastro; a salva vai para a lista de exclusões", () => {
    const comNova = criarEtapaProvisoria(rascunhoInicialDasEtapas(SALVAS), "novo:a");
    expect(excluirEtapa(comNova, "novo:a").etapas.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(excluirEtapa(comNova, "novo:a").excluidas).toEqual([]);
    const sem = excluirEtapa(rascunhoInicialDasEtapas(SALVAS), "e1");
    expect(sem.etapas.map((e) => e.id)).toEqual(["e2"]);
    expect(sem.excluidas).toEqual([{ id: "e1", nome: "1. Entrada", negocios: null }]);
    expect(etapasMudaram(sem, SALVAS)).toBe(true);
  });

  it("acha nome repetido sem distinguir maiúscula", () => {
    const r = editarEtapa(rascunhoInicialDasEtapas(SALVAS), "e2", {
      nome: "1. ENTRADA",
      descricao: "",
    });
    expect(nomeRepetido(r)).toBe("1. ENTRADA");
    expect(nomeRepetido(rascunhoInicialDasEtapas(SALVAS))).toBeNull();
  });

  it("monta o corpo da rota: descrição vazia vira null e a decisão dos negócios viaja com a exclusão", () => {
    const base = excluirEtapa(rascunhoInicialDasEtapas(SALVAS), "e1");
    const r = decidirNegocios(base, "e1", { acao: "mover", destinoId: "e2" });
    expect(pedidoDeGravarEtapas(r)).toEqual({
      etapas: [{ id: "e2", nome: "2. Atendimento", descricao: null }],
      excluidas: [{ id: "e1", negocios: { acao: "mover", destino_id: "e2" } }],
    });
    expect(
      pedidoDeGravarEtapas(decidirNegocios(base, "e1", { acao: "excluir" })).excluidas,
    ).toEqual([{ id: "e1", negocios: { acao: "excluir" } }]);
    expect(pedidoDeGravarEtapas(base).excluidas).toEqual([{ id: "e1" }]);
  });
});
