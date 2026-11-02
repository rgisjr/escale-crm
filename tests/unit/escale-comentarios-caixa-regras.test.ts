import { describe, expect, it } from "vitest";

import {
  estadoDoDirect,
  filtrarComentarios,
  inicioDoPeriodo,
  ordenarPublicacoes,
  semResposta,
  type ComentarioDaCaixa,
  type PublicacaoDaCaixa,
} from "@/lib/escale/comentarios/caixa";

const AGORA = new Date("2026-11-02T12:00:00.000Z");

const comentario = (p: Partial<ComentarioDaCaixa> & { id: string }): ComentarioDaCaixa => ({
  texto: "oi",
  comentadoEm: "2026-11-02T10:00:00.000Z",
  autor: { id: "a1", usuario: "joao.silva", nome: "João Silva", foto: null, daPropriaConta: false },
  oculto: false,
  curtido: null,
  curtidas: null,
  respostas: [],
  respondido: false,
  contato: null,
  direct: { liberado: true },
  ...p,
});

const daConta = { id: "conta", usuario: "empresa", nome: "Empresa", foto: null, daPropriaConta: true };

describe("semResposta (D5)", () => {
  it("sem respostas é sem resposta", () => {
    expect(semResposta(comentario({ id: "c1" }), new Set())).toBe(true);
  });
  it("resposta da própria conta vira respondido", () => {
    const c = comentario({ id: "c1", respostas: [comentario({ id: "r1", autor: daConta })] });
    expect(semResposta(c, new Set())).toBe(false);
  });
  it("ação feita do CRM vira respondido", () => {
    expect(semResposta(comentario({ id: "c1" }), new Set(["c1"]))).toBe(false);
  });
  it("comentário da própria conta nunca fica sem resposta", () => {
    expect(semResposta(comentario({ id: "c1", autor: daConta }), new Set())).toBe(false);
  });
  it("resposta de outra pessoa não conta", () => {
    const c = comentario({ id: "c1", respostas: [comentario({ id: "r1" })] });
    expect(semResposta(c, new Set())).toBe(true);
  });
});

describe("estadoDoDirect (D8)", () => {
  const base = { usados: new Set<string>(), contaConectada: true, agora: AGORA };
  const c = (comentadoEm: string, autor = comentario({ id: "x" }).autor) => ({ id: "c1", comentadoEm, autor });

  it("6 dias e 23 h está liberado", () => {
    const quando = new Date(AGORA.getTime() - (6 * 24 + 23) * 3_600_000).toISOString();
    expect(estadoDoDirect({ ...base, comentario: c(quando) })).toEqual({ liberado: true });
  });
  it("7 dias e 1 min venceu", () => {
    const quando = new Date(AGORA.getTime() - (7 * 24 * 60 + 1) * 60_000).toISOString();
    expect(estadoDoDirect({ ...base, comentario: c(quando) })).toEqual({ liberado: false, motivo: "prazo_vencido" });
  });
  it("id usado vence mesmo dentro do prazo", () => {
    expect(estadoDoDirect({ ...base, usados: new Set(["c1"]), comentario: c("2026-11-02T10:00:00.000Z") })).toEqual({
      liberado: false,
      motivo: "ja_usado",
    });
  });
  it("comentário da própria conta", () => {
    expect(estadoDoDirect({ ...base, comentario: c("2026-11-02T10:00:00.000Z", daConta) })).toEqual({
      liberado: false,
      motivo: "da_propria_conta",
    });
  });
  it("conta desconectada vence todos", () => {
    expect(
      estadoDoDirect({ ...base, contaConectada: false, usados: new Set(["c1"]), comentario: c("2026-11-02T10:00:00.000Z", daConta) }),
    ).toEqual({ liberado: false, motivo: "conta_desconectada" });
  });
  it("data ilegível vira prazo vencido", () => {
    expect(estadoDoDirect({ ...base, comentario: c("ontem") })).toEqual({ liberado: false, motivo: "prazo_vencido" });
  });
});

describe("filtrarComentarios (D6)", () => {
  const lista = [
    comentario({ id: "c1", texto: "quero comprar" }),
    comentario({ id: "c2", respondido: true, oculto: true, contato: { id: "k1", nome: "Maria" } }),
    comentario({
      id: "c3",
      autor: { id: "a3", usuario: "ana", nome: "Ana", foto: null, daPropriaConta: false },
      respostas: [comentario({ id: "r3", texto: "Qual o PREÇO?" })],
    }),
    comentario({ id: "c4", autor: daConta }),
  ];
  const ids = (l: ComentarioDaCaixa[]) => l.map((c) => c.id);

  it("todos", () => expect(ids(filtrarComentarios(lista, "todos", ""))).toEqual(["c1", "c2", "c3", "c4"]));
  it("sem resposta ignora a própria conta", () => {
    expect(ids(filtrarComentarios(lista, "sem_resposta", ""))).toEqual(["c1", "c3"]);
  });
  it("respondidos", () => expect(ids(filtrarComentarios(lista, "respondidos", ""))).toEqual(["c2"]));
  it("ocultos", () => expect(ids(filtrarComentarios(lista, "ocultos", ""))).toEqual(["c2"]));
  it("contatos", () => expect(ids(filtrarComentarios(lista, "contatos", ""))).toEqual(["c2"]));
  it("busca sem caixa e sem acento acha @joão.silva", () => {
    // c3 entra pela resposta r3, cujo autor padrão também é joao.silva.
    expect(ids(filtrarComentarios(lista, "todos", "JOAO"))).toEqual(["c1", "c2", "c3"]);
  });
  it("busca que só casa numa resposta mantém o pai", () => {
    expect(ids(filtrarComentarios(lista, "todos", "preco"))).toEqual(["c3"]);
  });
  it("não muta a entrada", () => {
    const copia = JSON.stringify(lista);
    filtrarComentarios(lista, "ocultos", "x");
    expect(JSON.stringify(lista)).toBe(copia);
  });
});

describe("ordenarPublicacoes e inicioDoPeriodo", () => {
  const pub = (id: string, p: Partial<PublicacaoDaCaixa>): PublicacaoDaCaixa => ({
    id,
    legenda: null,
    miniatura: null,
    link: null,
    tipo: null,
    publicadaEm: null,
    ultimoComentarioEm: null,
    comentarios: null,
    semResposta: null,
    ...p,
  });
  const lista = [
    pub("a", { publicadaEm: "2026-10-01T00:00:00Z", comentarios: 5 }),
    pub("b", { publicadaEm: "2026-09-01T00:00:00Z", ultimoComentarioEm: "2026-11-01T00:00:00Z", comentarios: 50 }),
    pub("c", { comentarios: null }),
  ];
  it("recentes usa o último comentário, senão a publicação, nulos no fim", () => {
    expect(ordenarPublicacoes(lista, "recentes").map((p) => p.id)).toEqual(["b", "a", "c"]);
  });
  it("mais comentários, nulos no fim", () => {
    expect(ordenarPublicacoes(lista, "mais_comentarios").map((p) => p.id)).toEqual(["b", "a", "c"]);
  });
  it("não muta a entrada", () => {
    const antes = lista.map((p) => p.id);
    ordenarPublicacoes(lista, "mais_comentarios");
    expect(lista.map((p) => p.id)).toEqual(antes);
  });
  it("inicioDoPeriodo", () => {
    expect(inicioDoPeriodo("tudo", AGORA)).toBeNull();
    expect(inicioDoPeriodo("7d", AGORA)).toBe("2026-10-26T12:00:00.000Z");
    expect(inicioDoPeriodo("30d", AGORA)).toBe("2026-10-03T12:00:00.000Z");
    expect(inicioDoPeriodo("90d", AGORA)).toBe("2026-08-04T12:00:00.000Z");
  });
});
