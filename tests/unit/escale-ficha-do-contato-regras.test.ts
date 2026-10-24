import { describe, expect, it } from "vitest";

import {
  abaDoContato,
  abasVisiveis,
  contatoDaRota,
  juntarNotasAoHistorico,
  negociosParaMostrar,
  rotaDaListaSemContato,
  rotaDaPaginaCompleta,
  rotaDoContatoAberto,
  temPerdido,
  type NegocioDoContato,
} from "@/lib/escale/ficha-do-contato/regras";
import { rotaDasNotasDoAlvo, type Nota } from "@/lib/escale/negocio/notas";
import type { TimelineItemView } from "@/lib/types/contacts";

const ID = "11111111-2222-4333-8444-555555555555";

describe("URL da janela do contato (N1)", () => {
  it("lê o id do caminho e a aba do parâmetro", () => {
    expect(contatoDaRota(`/app/contacts/${ID}`)).toBe(ID);
    expect(contatoDaRota("/app/contacts")).toBeNull();
    expect(contatoDaRota("/app/contacts/novo")).toBeNull();
    expect(abaDoContato("negocios")).toBe("negocios");
    expect(abaDoContato("outra")).toBe("contato");
    expect(abaDoContato(null)).toBe("contato");
  });

  it("abre e fecha mantendo os parâmetros da lista", () => {
    expect(rotaDoContatoAberto(ID, "q=ana&p=2&ca=arquivos", "contato")).toBe(`/app/contacts/${ID}?q=ana&p=2`);
    expect(rotaDoContatoAberto(ID, "q=ana", "negocios")).toBe(`/app/contacts/${ID}?q=ana&ca=negocios`);
    expect(rotaDaListaSemContato("q=ana&ca=negocios")).toBe("/app/contacts?q=ana");
    expect(rotaDaListaSemContato("")).toBe("/app/contacts");
    expect(rotaDaPaginaCompleta(ID)).toBe(`/app/contacts/${ID}?pagina=completa`);
  });

  it("a aba Negócios só com negócio (Q3)", () => {
    expect(abasVisiveis(true)).toEqual(["contato", "empresa", "negocios", "conversas", "arquivos", "historico"]);
    expect(abasVisiveis(false)).toEqual(["contato", "empresa", "conversas", "arquivos", "historico"]);
  });
});

const negocio = (n: number, extra: Partial<NegocioDoContato> = {}): NegocioDoContato => ({
  id: `n${n}`,
  titulo: `Negócio ${n}`,
  origem_id: "o1",
  origem_nome: "Pedidos",
  origem_arquivada: false,
  etapa_nome: "Novo",
  status: "open",
  motivo_de_perda: null,
  valor_cents: null,
  moeda: null,
  dono_id: null,
  dono_nome: null,
  criado_em: `2026-10-0${n}T10:00:00Z`,
  ...extra,
});

describe("negócios do contato (N9)", () => {
  it("arquivados só quando pedidos; 'Motivo de perda' só com perdido", () => {
    const lista = [negocio(1), negocio(2, { origem_arquivada: true }), negocio(3, { status: "lost", motivo_de_perda: "Preço" })];
    expect(negociosParaMostrar(lista, false).map((n) => n.id)).toEqual(["n1", "n3"]);
    expect(negociosParaMostrar(lista, true)).toHaveLength(3);
    expect(temPerdido(lista)).toBe(true);
    expect(temPerdido([negocio(1)])).toBe(false);
  });
});

const nota = (id: string, lead: string | null, quando: string): Nota => ({
  id,
  lead_id: lead,
  contact_id: "c1",
  user_id: "u1",
  user_nome: "Ana",
  texto: "x",
  created_at: quando,
  updated_at: quando,
});
const item = (id: string, quando: string) =>
  ({ id, type: "stage_change", performed_at: quando, payload: {}, metadata: {} }) as unknown as TimelineItemView;

describe("notas no histórico do contato (N8)", () => {
  it("junta só as soltas, em ordem, sem passar do fim da página carregada", () => {
    const itens = [item("a", "2026-10-10T10:00:00Z"), item("b", "2026-10-05T10:00:00Z")];
    const notas = [
      nota("n1", null, "2026-10-08T10:00:00Z"),
      nota("n2", "lead1", "2026-10-09T10:00:00Z"),
      nota("n3", null, "2026-10-01T10:00:00Z"),
    ];
    expect(juntarNotasAoHistorico(itens, notas, true, "todos").map((i) => i.id)).toEqual(["a", "nota-n1", "b"]);
    expect(juntarNotasAoHistorico(itens, notas, false, "todos").map((i) => i.id)).toEqual(["a", "nota-n1", "b", "nota-n3"]);
    const juntos = juntarNotasAoHistorico(itens, notas, false, "todos");
    expect(juntos[1]).toMatchObject({ type: "note", payload: { nota_id: "n1" }, actor_user_name: "Ana" });
  });

  it("um grupo sem notas não recebe nota", () => {
    const itens = [item("a", "2026-10-10T10:00:00Z")];
    expect(juntarNotasAoHistorico(itens, [nota("n1", null, "2026-10-11T10:00:00Z")], false, "automacoes")).toEqual(itens);
  });
});

describe("rota das notas por alvo", () => {
  it("negócio e contato", () => {
    expect(rotaDasNotasDoAlvo({ tipo: "negocio", id: "l1" })).toBe("/api/v1/leads/l1/notas");
    expect(rotaDasNotasDoAlvo({ tipo: "contato", id: "c1" })).toBe("/api/v1/contatos/c1/notas");
  });
});
