import { describe, expect, it } from "vitest";

import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import {
  CONTEM_MAX,
  camposDoContatoDoFiltro,
  chipsDosFiltros,
  contarNaSecao,
  diaValido,
  enxugarFiltros,
  filtrosDaUrl,
  filtrosDeContatosSchema,
  filtrosParaUrl,
  limparSecao,
  mesmosFiltros,
  operadoresDoTipo,
  removerChip,
  temFiltros,
  textoDoPeriodo,
  type FiltrosDeContatos,
} from "@/lib/escale/contatos/filtros";
import { opcoesDoFiltroDasOrigens } from "@/lib/escale/contatos/opcoes-do-filtro";

const O1 = "11111111-1111-4111-8111-111111111111";
const E1 = "22222222-2222-4222-8222-222222222222";
const U1 = "33333333-3333-4333-8333-333333333333";
const A1 = "44444444-4444-4444-8444-444444444444";

const completo: FiltrosDeContatos = {
  criadoEm: { de: "2026-10-01", ate: "2026-10-17" },
  telefone: "com",
  negocio: {
    tem: "com",
    origens: [O1],
    etapas: [E1],
    status: ["open"],
    donos: [U1, `agent:${A1}`, "sem_dono"],
  },
  tags: {
    combinar: "ou",
    grupos: [
      {
        modo: "e",
        condicoes: [
          { op: "possui", tag: "VIP" },
          { op: "nao_possui", tag: "frio" },
        ],
      },
    ],
  },
  campos: {
    combinar: "ou",
    grupos: [
      {
        modo: "e",
        condicoes: [
          { alvo: "contato", chave: "nome", tipo: "texto", op: "contem", valor: "joao" },
          { alvo: "negocio", chave: "valor", tipo: "numero", op: "maior", valor: "1500" },
        ],
      },
    ],
  },
};

const comCondicao = (c: object) => ({
  campos: { combinar: "e", grupos: [{ modo: "e", condicoes: [c] }] },
});

describe("o modelo do filtro", () => {
  it("aceita o filtro completo da Clint", () => {
    expect(filtrosDeContatosSchema.safeParse(completo).success).toBe(true);
  });

  it("recusa operador fora do tipo, número que não é número, data que não existe, valor faltando e tag sem a tag", () => {
    const recusa = (c: object) =>
      expect(filtrosDeContatosSchema.safeParse(comCondicao(c)).success).toBe(false);
    recusa({ alvo: "contato", chave: "nome", tipo: "texto", op: "maior", valor: "1" });
    recusa({ alvo: "negocio", chave: "valor", tipo: "numero", op: "igual", valor: "abc" });
    recusa({
      alvo: "contato",
      chave: "nascimento",
      tipo: "data",
      op: "antes",
      valor: "2026-02-30",
    });
    recusa({ alvo: "contato", chave: "nome", tipo: "texto", op: "contem" });
    expect(filtrosDeContatosSchema.safeParse({ inventado: 1 }).success).toBe(false);
    const recusaTag = (condicoes: object[]) =>
      expect(
        filtrosDeContatosSchema.safeParse({
          tags: { combinar: "e", grupos: [{ modo: "e", condicoes }] },
        }).success,
      ).toBe(false);
    recusaTag([{ op: "possui" }]);
    recusaTag([{ op: "qualquer", tag: "vip" }]);
    recusaTag([{ op: "talvez" }]);
    recusaTag([]);
  });

  it("no máximo 10 'contém / não contém' por filtro (Clint)", () => {
    const condicao = { alvo: "contato", chave: "nome", tipo: "texto", op: "contem", valor: "a" };
    const condicoes = Array.from({ length: CONTEM_MAX + 1 }, () => condicao);
    const grupos = [condicoes.slice(0, 6), condicoes.slice(6)].map((c) => ({
      modo: "e",
      condicoes: c,
    }));
    expect(filtrosDeContatosSchema.safeParse({ campos: { combinar: "e", grupos } }).success).toBe(
      false,
    );
  });

  it("os operadores de cada tipo seguem a Clint", () => {
    expect(operadoresDoTipo("texto")).toEqual([
      "contem",
      "nao_contem",
      "igual",
      "diferente",
      "vazio",
      "preenchido",
    ]);
    expect(operadoresDoTipo("numero")).toEqual([
      "igual",
      "diferente",
      "maior",
      "menor",
      "vazio",
      "preenchido",
    ]);
    expect(operadoresDoTipo("data")).toEqual([
      "igual",
      "diferente",
      "depois",
      "antes",
      "vazio",
      "preenchido",
    ]);
  });

  it("dia válido só quando a data existe", () => {
    expect(diaValido("2026-10-17")).toBe(true);
    expect(diaValido("2026-02-30")).toBe(false);
    expect(diaValido("17/10/2026")).toBe(false);
  });
});

describe("enxugar, URL e comparação", () => {
  it("tira o vazio e ordena as listas", () => {
    expect(
      enxugarFiltros({
        negocio: { origens: [], status: ["won", "open"] },
        tags: { combinar: "e", grupos: [] },
        campos: { combinar: "e", grupos: [] },
      }),
    ).toEqual({ negocio: { status: ["open", "won"] } });
    expect(temFiltros({ tags: { combinar: "ou", grupos: [] } })).toBe(false);
  });

  it("tags: tira o espaço da tag e mantém os grupos e a ordem", () => {
    expect(
      enxugarFiltros({
        tags: {
          combinar: "e",
          grupos: [{ modo: "ou", condicoes: [{ op: "possui", tag: " vip " }, { op: "sem" }] }],
        },
      }),
    ).toEqual({
      tags: {
        combinar: "e",
        grupos: [{ modo: "ou", condicoes: [{ op: "possui", tag: "vip" }, { op: "sem" }] }],
      },
    });
  });

  it("vai e volta pela URL; lixo vira filtro vazio", () => {
    expect(filtrosDaUrl(filtrosParaUrl(completo))).toEqual(enxugarFiltros(completo));
    expect(filtrosDaUrl("{quebrado")).toEqual({});
    expect(filtrosDaUrl(JSON.stringify({ telefone: "talvez" }))).toEqual({});
    expect(filtrosParaUrl({})).toBeNull();
  });

  it("compara pelo conteúdo, não pela ordem", () => {
    expect(
      mesmosFiltros(
        { negocio: { status: ["won", "open"] } },
        { negocio: { status: ["open", "won"] } },
      ),
    ).toBe(true);
    expect(mesmosFiltros({ telefone: "com" }, { telefone: "sem" })).toBe(false);
  });
});

describe("seções e chips", () => {
  it("conta e limpa por seção", () => {
    expect(contarNaSecao(completo, "contato")).toBe(2);
    expect(contarNaSecao(completo, "negocio")).toBe(5);
    expect(contarNaSecao(completo, "tags")).toBe(2);
    expect(contarNaSecao(completo, "campos")).toBe(2);
    expect(limparSecao(completo, "negocio").negocio).toBeUndefined();
    expect(limparSecao(completo, "contato")).not.toHaveProperty("telefone");
    expect(limparSecao(completo, "contato").tags).toEqual(enxugarFiltros(completo).tags);
  });

  it("um chip por critério, na ordem da Clint, e o × tira só ele", () => {
    expect(chipsDosFiltros(completo).map((c) => c.chave)).toEqual([
      "criadoEm",
      "telefone",
      "negocio.tem",
      "negocio.origens",
      "negocio.etapas",
      "negocio.status",
      "negocio.donos",
      "tags",
      "campos",
    ]);
    const sem = removerChip(completo, "negocio.origens");
    expect(sem.negocio?.origens).toBeUndefined();
    expect(sem.negocio?.etapas).toEqual([E1]);
  });

  it("o período no formato brasileiro", () => {
    expect(textoDoPeriodo({ de: "2026-10-01", ate: "2026-10-17" })).toBe("01/10/2026 – 17/10/2026");
  });
});

describe("compilarFiltros (o que o banco recebe)", () => {
  const c = compilarFiltros(completo, "America/Sao_Paulo");

  it("fuso, datas e telefone", () => {
    expect(c.fuso).toBe("America/Sao_Paulo");
    expect(c.criado_de).toBe("2026-10-01");
    expect(c.criado_ate).toBe("2026-10-17");
    expect(c.telefone).toBe("com");
  });

  it("donos separados em pessoas, agentes e sem dono", () => {
    expect(c.negocio).toMatchObject({
      tem: "com",
      donos_usuarios: [U1],
      donos_agentes: [A1],
      sem_dono: true,
      com_dono: false,
    });
  });

  it("tags normalizadas (minúsculas), nos grupos", () => {
    expect(c.tags).toEqual({
      combinar: "ou",
      grupos: [
        {
          modo: "e",
          condicoes: [
            { op: "possui", tag: "vip" },
            { op: "nao_possui", tag: "frio" },
          ],
        },
      ],
    });
  });

  it("tags: 'qualquer' e 'sem' vão sem tag", () => {
    expect(
      compilarFiltros(
        { tags: { combinar: "e", grupos: [{ modo: "ou", condicoes: [{ op: "sem" }] }] } },
        "UTC",
      ).tags,
    ).toEqual({ combinar: "e", grupos: [{ modo: "ou", condicoes: [{ op: "sem", tag: null }] }] });
  });

  it("'contém' vira o padrão sem acento do original, que acha 'João'", () => {
    const cond = c.campos?.grupos[0]?.condicoes[0];
    expect(cond?.padrao).toBeTruthy();
    expect(new RegExp(cond?.padrao ?? "^$", "i").test("João Silva")).toBe(true);
    expect(c.campos?.grupos[0]?.condicoes[1]).toMatchObject({
      op: "maior",
      valor: "1500",
      padrao: null,
    });
  });

  it("sem 'tem', Negócio vale 'com'", () => {
    expect(compilarFiltros({ negocio: { status: ["won"] } }, "UTC").negocio?.tem).toBe("com");
  });
});

describe("opcoesDoFiltroDasOrigens", () => {
  const opcoes = opcoesDoFiltroDasOrigens([
    {
      id: O1,
      name: "Leads INSS",
      settings: {
        lost_reasons: ["Preço", { label: "Sem crédito" }],
        fields: [{ key: "cpf_cliente", label: "CPF do cliente", type: "text" }],
      },
      crm_stages: [
        { id: "e2", name: "Ganho", position: 2, is_archived: false },
        { id: E1, name: "Entrada", position: 0, is_archived: false },
        { id: "e3", name: "Velha", position: 1, is_archived: true },
      ],
    },
  ]);

  it("todas as etapas não arquivadas, na ordem (inclui ganho e perda)", () => {
    expect(opcoes.origens[0]?.etapas.map((e) => e.nome)).toEqual(["Entrada", "Ganho"]);
  });

  it("motivos: os canônicos e os das origens, sem repetir rótulo", () => {
    expect(opcoes.motivos.find((m) => m.valor === "price")?.rotulo).toBe("Preço");
    expect(opcoes.motivos.filter((m) => m.rotulo.toLowerCase() === "preço")).toHaveLength(1);
    expect(opcoes.motivos.some((m) => m.valor === "Sem crédito")).toBe(true);
  });

  it("campos do negócio: o valor primeiro, depois os do CRM", () => {
    expect(opcoes.camposDoNegocio.map((c) => c.chave)).toEqual(["valor", "cpf_cliente"]);
  });
});

describe("camposDoContatoDoFiltro (Fase 2C)", () => {
  it("junta os fixos com o catálogo, em ordem alfabética, com o tipo do filtro", () => {
    const campos = camposDoContatoDoFiltro({
      grupos: [],
      campos: [
        { id: "c1", objeto: "contato", chave: "renda", definicao: { label: "Renda", type: "currency" }, grupo_id: null, papel_minimo: null, posicao: 0, padrao: false },
        { id: "c2", objeto: "contato", chave: "origem", definicao: { label: "Canal", type: "select", options: [{ value: "a", label: "A" }] }, grupo_id: null, papel_minimo: null, posicao: 1, padrao: false },
      ],
    });
    expect(campos.map((c) => c.rotulo).slice(0, 3)).toEqual(["Canal", "Data de nascimento", "Email"]);
    expect(campos.find((c) => c.chave === "renda")).toMatchObject({ alvo: "contato", tipo: "numero" });
    expect(campos.find((c) => c.chave === "origem")).toMatchObject({ tipo: "opcao", opcoes: [{ value: "a", label: "A" }] });
  });
});
