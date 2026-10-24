import { describe, expect, it } from "vitest";

import {
  confianca,
  consultaDeSugestoesSchema,
  contatoResultante,
  escolhasPadrao,
  estadoDoCampo,
  faixaDaConfianca,
  filtrarSugestoes,
  mesclarEmMassaSchema,
  mesclarSchema,
  montarSugestoes,
  ordenarSugestoes,
  principalDasEscolhas,
  principalPorPrioridade,
  type ContatoDaMescla,
  type Sugestao,
} from "@/lib/escale/mescla/regras";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const contato = (n: number, extra: Partial<ContatoDaMescla> = {}): ContatoDaMescla => ({
  id: ID(n),
  nome: `Contato ${n}`,
  telefone: null,
  email: null,
  instagram: null,
  whatsapp: null,
  empresa: null,
  tags: [],
  criado_em: `2026-10-0${n}T10:00:00Z`,
  atualizado_em: `2026-10-0${n}T10:00:00Z`,
  atendimento_ativo: false,
  ...extra,
});

describe("confiança (N10)", () => {
  it("um critério forte sozinho, combinados e com conflito", () => {
    expect(confianca(["telefone"], [])).toBe(90);
    expect(confianca(["email"], [])).toBe(85);
    expect(confianca(["instagram"], [])).toBe(70);
    expect(confianca(["telefone", "nome"], [])).toBe(94);
    expect(confianca(["instagram"], ["telefone"])).toBe(40);
    expect(confianca(["nome"], ["telefone", "email", "instagram"])).toBe(0);
  });

  it("faixas da Clint: 85 Alta, 65 Média, abaixo Baixa", () => {
    expect(faixaDaConfianca(85)).toBe("alta");
    expect(faixaDaConfianca(84)).toBe("media");
    expect(faixaDaConfianca(65)).toBe("media");
    expect(faixaDaConfianca(64)).toBe("baixa");
  });
});

describe("montarSugestoes", () => {
  it("une pelas chaves (encadeado), soma nome e empresa, marca conflito e bloqueio", () => {
    const contatos = new Map(
      [
        contato(1, { nome: "Ana Souza", telefone: "+5543998031566", atendimento_ativo: true }),
        contato(2, { nome: "ana  souza", telefone: "+554398031566", email: "ana@x.com" }),
        contato(3, { nome: "Ána Souza", email: "ana@x.com", telefone: "+5511999990000", atendimento_ativo: true }),
        contato(4, { nome: "Sozinho", telefone: "+5521988887777" }),
      ].map((c) => [c.id, c]),
    );
    const sugestoes = montarSugestoes(
      [
        { contato_id: ID(1), regra: "telefone", chave: "5543998031566" },
        { contato_id: ID(2), regra: "telefone", chave: "5543998031566" },
        { contato_id: ID(2), regra: "email", chave: "ana@x.com" },
        { contato_id: ID(3), regra: "email", chave: "ana@x.com" },
      ],
      contatos,
    );
    expect(sugestoes).toHaveLength(1);
    const s = sugestoes[0]!;
    expect(s.chave).toBe(ID(1));
    expect(s.contatos.map((c) => c.id)).toEqual([ID(1), ID(2), ID(3)]);
    expect(s.casou).toEqual(["telefone", "email", "nome"]);
    expect(s.conflitos).toEqual(["telefone"]);
    expect(s.bloqueada).toBe(true);
    expect(s.confianca).toBe(confianca(["telefone", "email", "nome"], ["telefone"]));
    expect(s.criada_em).toBe("2026-10-03T10:00:00Z");
  });

  it("grupo com mais de 20 contatos fica fora", () => {
    const muitos = Array.from({ length: 21 }, (_, i) => contato(i + 1));
    const sugestoes = montarSugestoes(
      muitos.map((c) => ({ contato_id: c.id, regra: "email" as const, chave: "igual@x.com" })),
      new Map(muitos.map((c) => [c.id, c])),
    );
    expect(sugestoes).toEqual([]);
  });
});

const sugestao = (n: number, extra: Partial<Sugestao> = {}): Sugestao => ({
  chave: ID(n),
  contatos: [contato(n, { nome: `Pessoa ${n}`, telefone: "+5543998031566", tags: ["vip"] }), contato(n + 10)],
  casou: ["telefone"],
  conflitos: [],
  confianca: 90,
  bloqueada: false,
  criada_em: `2026-10-0${n}T10:00:00Z`,
  ...extra,
});

describe("consulta, filtro e ordem", () => {
  it("o padrão: maior confiança, 0 a 100, página 1 de 20", () => {
    expect(consultaDeSugestoesSchema.parse({})).toEqual({
      q: "",
      ordem: "maior_confianca",
      regras: [],
      min: 0,
      max: 100,
      tags: [],
      validos: false,
      p: 1,
      n: 20,
    });
    expect(consultaDeSugestoesSchema.parse({ regras: "telefone,email", tags: "vip", validos: "1" })).toMatchObject({
      regras: ["telefone", "email"],
      tags: ["vip"],
      validos: true,
    });
    expect(consultaDeSugestoesSchema.safeParse({ regras: "cpf" }).success).toBe(false);
  });

  it("filtra por busca, critério, faixa, tag, contato e telefone válido", () => {
    const lista = [
      sugestao(1),
      sugestao(2, { casou: ["email"], confianca: 85 }),
      sugestao(3, { confianca: 40 }),
    ];
    const base = consultaDeSugestoesSchema.parse({});
    expect(filtrarSugestoes(lista, { ...base, q: "pessoa 2" }).map((s) => s.chave)).toEqual([ID(2)]);
    expect(filtrarSugestoes(lista, { ...base, q: "98031566" })).toHaveLength(3);
    expect(filtrarSugestoes(lista, { ...base, regras: ["email"] }).map((s) => s.chave)).toEqual([ID(2)]);
    expect(filtrarSugestoes(lista, { ...base, min: 50 })).toHaveLength(2);
    expect(filtrarSugestoes(lista, { ...base, tags: ["outra"] })).toHaveLength(0);
    expect(filtrarSugestoes(lista, { ...base, contato: ID(13) }).map((s) => s.chave)).toEqual([ID(3)]);
    const invalida = sugestao(4, { contatos: [contato(4, { telefone: "+55123" }), contato(14)] });
    expect(filtrarSugestoes([invalida], { ...base, validos: true })).toHaveLength(0);
  });

  it("ordena por confiança e por data", () => {
    const lista = [sugestao(1, { confianca: 70 }), sugestao(2, { confianca: 95 }), sugestao(3, { confianca: 70 })];
    expect(ordenarSugestoes(lista, "maior_confianca").map((s) => s.chave)).toEqual([ID(2), ID(1), ID(3)]);
    expect(ordenarSugestoes(lista, "menor_confianca").map((s) => s.chave)).toEqual([ID(1), ID(3), ID(2)]);
    expect(ordenarSugestoes(lista, "mais_recentes").map((s) => s.chave)).toEqual([ID(3), ID(2), ID(1)]);
    expect(ordenarSugestoes(lista, "mais_antigas").map((s) => s.chave)).toEqual([ID(1), ID(2), ID(3)]);
  });
});

describe("escolhas por campo (N11)", () => {
  const a = contato(1, { nome: "Ana", telefone: "+5543998031566", email: null, empresa: null });
  const b = contato(2, { nome: "Ana Souza", telefone: "+5543998031566", email: "ana@x.com", empresa: { id: ID(99), nome: "Atlas" } });

  it("o padrão é o primeiro que tem o valor", () => {
    expect(escolhasPadrao([a, b])).toEqual({ nome: ID(1), email: ID(2), telefone: ID(1), empresa: ID(2) });
  });

  it("o estado de cada campo", () => {
    expect(estadoDoCampo([a, b], "telefone")).toBe("igual");
    expect(estadoDoCampo([a, b], "email")).toBe("unico");
    expect(estadoDoCampo([a, b], "nome")).toBe("decidir");
    expect(estadoDoCampo([a, b], "instagram")).toBe("vazio");
  });

  it("o contato resultante e o principal (dono do nome)", () => {
    const escolhas = { ...escolhasPadrao([a, b]), nome: ID(2) };
    expect(contatoResultante([a, b], escolhas)).toEqual({
      nome: "Ana Souza",
      email: "ana@x.com",
      telefone: "+5543998031566",
      instagram: null,
      empresa: "Atlas",
    });
    expect(principalDasEscolhas([a, b], escolhas)).toBe(ID(2));
    expect(principalDasEscolhas([a, b], {})).toBe(ID(1));
  });

  it("prioridade da mescla em massa", () => {
    const novo = contato(3, { criado_em: "2026-10-09T00:00:00Z", atualizado_em: "2026-10-01T00:00:00Z" });
    const velho = contato(4, { criado_em: "2026-10-01T00:00:00Z", atualizado_em: "2026-10-09T00:00:00Z" });
    expect(principalPorPrioridade([velho, novo], "criado_por_ultimo")).toBe(novo.id);
    expect(principalPorPrioridade([velho, novo], "criado_por_primeiro")).toBe(velho.id);
    expect(principalPorPrioridade([velho, novo], "atualizado_por_ultimo")).toBe(velho.id);
    expect(principalPorPrioridade([velho, novo], "atualizado_por_primeiro")).toBe(novo.id);
  });
});

describe("schemas das rotas", () => {
  it("mesclar: principal fora dos secundários, sem repetidos, escolha só dos contatos do grupo", () => {
    const ok = { principal_id: ID(1), secundarios: [ID(2)], escolhas: { email: ID(2) } };
    expect(mesclarSchema.safeParse(ok).success).toBe(true);
    expect(mesclarSchema.safeParse({ ...ok, secundarios: [ID(1)] }).success).toBe(false);
    expect(mesclarSchema.safeParse({ ...ok, secundarios: [ID(2), ID(2)] }).success).toBe(false);
    expect(mesclarSchema.safeParse({ ...ok, escolhas: { email: ID(9) } }).success).toBe(false);
    expect(mesclarSchema.safeParse({ ...ok, escolhas: { cpf: ID(2) } }).success).toBe(false);
  });

  it("em massa: 1 a 100 grupos de 2 a 20, com a prioridade", () => {
    const grupo = [ID(1), ID(2)];
    expect(mesclarEmMassaSchema.safeParse({ grupos: [grupo], prioridade: "criado_por_ultimo" }).success).toBe(true);
    expect(mesclarEmMassaSchema.safeParse({ grupos: [], prioridade: "criado_por_ultimo" }).success).toBe(false);
    expect(mesclarEmMassaSchema.safeParse({ grupos: Array(101).fill(grupo), prioridade: "criado_por_ultimo" }).success).toBe(false);
    expect(mesclarEmMassaSchema.safeParse({ grupos: [[ID(1)]], prioridade: "criado_por_ultimo" }).success).toBe(false);
  });
});
