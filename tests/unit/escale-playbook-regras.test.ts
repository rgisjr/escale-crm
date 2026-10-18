import { describe, expect, it } from "vitest";

import {
  adicionarAtividade,
  atividadesDaEtapa,
  atualizarAtividade,
  doServidor,
  minutosDoPrazo,
  paraOServidor,
  playbookMudou,
  playbookSchema,
  prazoPorUnidade,
  quantidadeDoPrazoValida,
  removerAtividade,
  rotuloDoModelo,
  seloDoPrazo,
  textoDoPrazo,
  trocarDeLugar,
  vizinhaDeMesmoPrazo,
  type AtividadeDoPlaybook,
} from "@/lib/escale/playbook/regras";

/** FORK ESCALE · Fase 1I (D10): as regras puras do playbook da origem. */
const t = (s: string) => s;
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const E1 = ID(901);
const E2 = ID(902);
const atv = (n: number, extra: Partial<AtividadeDoPlaybook> = {}): AtividadeDoPlaybook => ({
  id: ID(n),
  etapaId: E1,
  titulo: `Atividade ${n}`,
  tipo: "whatsapp",
  visibilidade: "padrao",
  prazoMinutos: 1440,
  ordem: n,
  conteudo: null,
  ...extra,
});

describe("prazo em minutos (time_to_check da Clint)", () => {
  it("mostra na maior unidade que divide sem sobra", () => {
    expect(prazoPorUnidade(1440)).toEqual({ quantidade: 1, unidade: "dia" });
    expect(prazoPorUnidade(1380)).toEqual({ quantidade: 23, unidade: "hora" });
    expect(prazoPorUnidade(20160)).toEqual({ quantidade: 2, unidade: "semana" });
    expect(prazoPorUnidade(90)).toEqual({ quantidade: 90, unidade: "minuto" });
    expect(prazoPorUnidade(525600)).toEqual({ quantidade: 1, unidade: "ano" });
  });
  it("minutosDoPrazo multiplica pela unidade; a quantidade vai de 1 a 999", () => {
    expect(minutosDoPrazo(3, "dia")).toBe(4320);
    expect(minutosDoPrazo(2, "hora")).toBe(120);
    expect(quantidadeDoPrazoValida(1)).toBe(true);
    expect(quantidadeDoPrazoValida(999)).toBe(true);
    expect(quantidadeDoPrazoValida(0)).toBe(false);
    expect(quantidadeDoPrazoValida(1000)).toBe(false);
    expect(quantidadeDoPrazoValida(1.5)).toBe(false);
  });
  it("texto e selo da Clint", () => {
    expect(textoDoPrazo(1440, t)).toBe("1 dia(s)");
    expect(textoDoPrazo(43200, t)).toBe("1 mês(es)");
    expect(textoDoPrazo(0, t)).toBe("Ao entrar na etapa");
    expect(seloDoPrazo(1440)).toEqual({ numero: 1, inicial: "D", unidade: "dia" });
    expect(seloDoPrazo(120)).toEqual({ numero: 2, inicial: "H", unidade: "hora" });
    expect(seloDoPrazo(30)).toEqual({ numero: 30, inicial: "m", unidade: "minuto" });
  });
});

describe("o rascunho do playbook", () => {
  it("atividadesDaEtapa ordena por prazo e depois pela ordem", () => {
    const lista = [
      atv(1, { prazoMinutos: 2880, ordem: 0 }),
      atv(2, { ordem: 5 }),
      atv(3, { ordem: 1 }),
      atv(4, { etapaId: E2 }),
    ];
    expect(atividadesDaEtapa(lista, E1).map((a) => a.id)).toEqual([ID(3), ID(2), ID(1)]);
  });
  it("adicionar põe no fim da etapa (ordem = maior + 1); na etapa vazia, 0", () => {
    const lista = adicionarAtividade([atv(1, { ordem: 4 })], { ...atv(2), etapaId: E1 });
    expect(lista.find((a) => a.id === ID(2))?.ordem).toBe(5);
    expect(adicionarAtividade([], atv(7))[0]?.ordem).toBe(0);
  });
  it("atualizar troca os campos; trocar de etapa põe no fim da outra", () => {
    const lista = [atv(1), atv(2, { etapaId: E2, ordem: 3 })];
    expect(atualizarAtividade(lista, ID(1), { titulo: "Novo" })[0]?.titulo).toBe("Novo");
    const movida = atualizarAtividade(lista, ID(1), { etapaId: E2 }).find((a) => a.id === ID(1));
    expect(movida).toMatchObject({ etapaId: E2, ordem: 4 });
  });
  it("remover tira só a atividade pedida", () => {
    expect(removerAtividade([atv(1), atv(2)], ID(1)).map((a) => a.id)).toEqual([ID(2)]);
  });
  it("as setas só trocam vizinhas de MESMO prazo", () => {
    const lista = [
      atv(1, { ordem: 0 }),
      atv(2, { ordem: 1 }),
      atv(3, { ordem: 2, prazoMinutos: 2880 }),
    ];
    expect(vizinhaDeMesmoPrazo(lista, ID(1), 1)).toBe(ID(2));
    expect(vizinhaDeMesmoPrazo(lista, ID(2), 1)).toBeNull();
    expect(vizinhaDeMesmoPrazo(lista, ID(1), -1)).toBeNull();
    const trocada = trocarDeLugar(lista, ID(2), -1);
    expect(atividadesDaEtapa(trocada, E1).map((a) => a.id)).toEqual([ID(2), ID(1), ID(3)]);
    expect(trocarDeLugar(lista, ID(2), 1)).toBe(lista);
  });
  it("servidor ↔ tela, e 'mudou' ignora a ordem do array", () => {
    const a = atv(1, { conteudo: "Olá [CONTACT.FIRST_NAME]" });
    expect(doServidor(paraOServidor(a))).toEqual(a);
    expect(playbookMudou([atv(1), atv(2)], [atv(2), atv(1)])).toBe(false);
    expect(playbookMudou([atv(1, { titulo: "x" })], [atv(1)])).toBe(true);
  });
  it("rótulo do canto", () => {
    expect(rotuloDoModelo(true)).toBe("Origem customizada");
    expect(rotuloDoModelo(false)).toBe("Nenhum modelo");
  });
});

describe("o pedido da rota (playbookSchema)", () => {
  it("aceita a lista válida e recusa id repetido, tipo fora do vocabulário e texto longo", () => {
    const ok = { atividades: [paraOServidor(atv(1))] };
    expect(playbookSchema.safeParse(ok).success).toBe(true);
    expect(
      playbookSchema.safeParse({ atividades: [paraOServidor(atv(1)), paraOServidor(atv(1))] })
        .success,
    ).toBe(false);
    expect(
      playbookSchema.safeParse({ atividades: [{ ...paraOServidor(atv(1)), tipo: "linkedin" }] })
        .success,
    ).toBe(false);
    expect(
      playbookSchema.safeParse({
        atividades: [{ ...paraOServidor(atv(1)), conteudo: "x".repeat(4097) }],
      }).success,
    ).toBe(false);
    expect(
      playbookSchema.safeParse({ atividades: [{ ...paraOServidor(atv(1)), titulo: "  " }] })
        .success,
    ).toBe(false);
  });
});
