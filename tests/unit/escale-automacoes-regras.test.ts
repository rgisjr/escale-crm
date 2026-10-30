import { describe, expect, it } from "vitest";
import {
  CORES_DA_PASTA,
  ICONES_DA_PASTA,
  NOME_DA_COR,
  NOME_DO_ICONE,
  corDaPasta,
  corDoIconeDaPasta,
} from "@/lib/escale/automacoes/pastas";
import {
  agentesDaRegra,
  contagensDoTrilho,
  filtrarAutomacoes,
  mostrarSemPasta,
  nomeDaCopia,
  ordenarAutomacoes,
  paginar,
  textoDeItens,
} from "@/lib/escale/automacoes/regras";
import { rotaDeAbrir, rotaDoFluxoNovo } from "@/lib/escale/automacoes/rotas";
import {
  favoritaSchema,
  loteSchema,
  organizacaoSchema,
  pastaSchema,
} from "@/lib/escale/automacoes/schema";
import type { AutomacaoDaLista, FiltrosDaLista } from "@/lib/escale/automacoes/tipos";

function auto(p: Partial<AutomacaoDaLista> & { id: string }): AutomacaoDaLista {
  return {
    nome: p.id,
    ativa: true,
    atualizadaEm: "2026-10-01T10:00:00Z",
    pastaId: null,
    forma: null,
    favorita: false,
    agentes: [],
    ...p,
  };
}
const SEM_FILTRO: FiltrosDaLista = { visao: { tipo: "todas" }, busca: "", status: [], agentes: [] };

describe("rotas", () => {
  it("monta o fluxo novo e a rota de abrir", () => {
    expect(rotaDoFluxoNovo({ nome: "Pós venda", pastaId: null })).toBe(
      "/app/webhooks/automacoes/nova?nome=P%C3%B3s+venda",
    );
    expect(rotaDoFluxoNovo({ nome: "a", pastaId: "p1" })).toBe("/app/webhooks/automacoes/nova?nome=a&pasta=p1");
    expect(rotaDeAbrir({ id: "a", forma: null })).toBe("/app/webhooks/automacoes/a");
    expect(rotaDeAbrir({ id: "a", forma: "fluxo" })).toBe("/app/webhooks/automacoes/a");
    expect(rotaDeAbrir({ id: "a", forma: "editor" })).toBe("/app/automacoes?editor=a");
  });
});

describe("pastas", () => {
  it("tem 8 cores e 8 ícones na ordem da Clint", () => {
    expect(CORES_DA_PASTA).toHaveLength(8);
    expect(CORES_DA_PASTA[0]).toBe("marca");
    expect(CORES_DA_PASTA[7]).toBe("gray");
    expect(ICONES_DA_PASTA).toHaveLength(8);
    expect(ICONES_DA_PASTA[0]).toBe("folder");
    expect(ICONES_DA_PASTA[7]).toBe("flag");
    expect(Object.keys(NOME_DA_COR)).toHaveLength(8);
    expect(Object.keys(NOME_DO_ICONE)).toHaveLength(8);
  });
  it("resolve cores", () => {
    expect(corDaPasta("marca")).toBe("var(--color-casca-marca)");
    expect(corDaPasta("red")).toBe("#DC2626");
    expect(corDaPasta("roxo")).toBe("var(--color-casca-raia)");
    expect(corDoIconeDaPasta("gray")).toBe("var(--color-casca-suave)");
  });
});

describe("agentesDaRegra", () => {
  const acoes = [
    { type: "send_ai_message", config: { agent_id: "g1" } },
    { type: "add_tag", config: {} },
    { type: "send_ai_message", config: { agent_id: "g2" } },
    { type: "send_ai_message", config: { agent_id: "g1" } },
  ];
  it("lista sem repetir e só os conhecidos", () => {
    expect(agentesDaRegra(acoes, new Set(["g1", "g2"]))).toEqual(["g1", "g2"]);
    expect(agentesDaRegra(acoes, new Set(["g2"]))).toEqual(["g2"]);
  });
  it("tolera lixo", () => {
    const k = new Set(["g1"]);
    expect(agentesDaRegra(null, k)).toEqual([]);
    expect(agentesDaRegra("x", k)).toEqual([]);
    expect(agentesDaRegra([{ type: "send_ai_message" }], k)).toEqual([]);
  });
});

describe("filtrarAutomacoes", () => {
  const lista = [
    auto({ id: "a", nome: "Pós-venda - Negócio Ganho", favorita: true, pastaId: "p1", agentes: ["g1"] }),
    auto({ id: "b", nome: "Boas-vindas", ativa: false }),
    auto({ id: "c", nome: "Outra", pastaId: "p1", agentes: ["g2"] }),
  ];
  it("filtra por visão", () => {
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, visao: { tipo: "favoritos" } }).map((x) => x.id)).toEqual(["a"]);
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, visao: { tipo: "pasta", id: "p1" } }).map((x) => x.id)).toEqual(["a", "c"]);
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, visao: { tipo: "sem_pasta" } }).map((x) => x.id)).toEqual(["b"]);
  });
  it("busca sem acento e sem caixa, por 'contém'", () => {
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, busca: "pos-venda" })).toHaveLength(1);
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, busca: "PÓS" })).toHaveLength(1);
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, busca: "pos venda" })).toHaveLength(0);
  });
  it("filtra por status e agente", () => {
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, status: ["pausada"] }).map((x) => x.id)).toEqual(["b"]);
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, agentes: ["sem_agente"] }).map((x) => x.id)).toEqual(["b"]);
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, agentes: ["g1"] }).map((x) => x.id)).toEqual(["a"]);
    expect(filtrarAutomacoes(lista, { ...SEM_FILTRO, agentes: ["sem_agente", "g1"] }).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("ordenarAutomacoes", () => {
  it("ordena por nome com acento e não muda a entrada", () => {
    const lista = Object.freeze([auto({ id: "1", nome: "Zeta" }), auto({ id: "2", nome: "beta" }), auto({ id: "3", nome: "Ágil" })]);
    expect(ordenarAutomacoes(lista, { coluna: "nome", direcao: "asc" }).map((x) => x.nome)).toEqual(["Ágil", "beta", "Zeta"]);
  });
  it("status asc põe as ativas primeiro", () => {
    const lista = [auto({ id: "p", ativa: false }), auto({ id: "a", ativa: true })];
    expect(ordenarAutomacoes(lista, { coluna: "status", direcao: "asc" })[0]?.id).toBe("a");
  });
  it("atualizada desc põe a mais recente primeiro", () => {
    const lista = [auto({ id: "v", atualizadaEm: "2026-01-01T00:00:00Z" }), auto({ id: "n", atualizadaEm: "2026-09-01T00:00:00Z" })];
    expect(ordenarAutomacoes(lista, { coluna: "atualizada", direcao: "desc" })[0]?.id).toBe("n");
  });
});

describe("paginar, trilho, cópia e itens", () => {
  const itens = Array.from({ length: 23 }, (_, i) => i);
  it("pagina", () => {
    expect(paginar(itens, 3, 10)).toEqual({ itens: [20, 21, 22], pagina: 3 });
    expect(paginar(itens, 9, 10).pagina).toBe(3);
  });
  it("conta o trilho", () => {
    const lista = [
      auto({ id: "1", favorita: true, pastaId: "p1" }),
      auto({ id: "2", favorita: true, pastaId: "p1" }),
      auto({ id: "3", pastaId: "morta" }),
      auto({ id: "4" }),
      auto({ id: "5" }),
    ];
    const c = contagensDoTrilho(lista, [{ id: "p1", nome: "x", cor: "gray", icone: "folder" }]);
    expect(c).toEqual({ todas: 5, favoritos: 2, porPasta: { p1: 2 }, semPasta: 3 });
    expect(mostrarSemPasta(c, 0)).toBe(false);
    expect(mostrarSemPasta({ ...c, semPasta: 0 }, 1)).toBe(false);
    expect(mostrarSemPasta(c, 1)).toBe(true);
  });
  it("nomeia a cópia", () => {
    expect(nomeDaCopia("Vendas")).toBe("Vendas (cópia)");
    const longa = nomeDaCopia("a".repeat(120));
    expect(longa).toHaveLength(120);
    expect(longa.endsWith(" (cópia)")).toBe(true);
  });
  it("singular e plural de itens", () => {
    expect(textoDeItens(1)).toEqual({ chave: "{n} item", n: "1" });
    expect(textoDeItens(1234)).toEqual({ chave: "{n} itens", n: "1.234" });
  });
});

describe("schema", () => {
  it("pastaSchema", () => {
    expect(pastaSchema.safeParse({ nome: "" }).success).toBe(false);
    expect(pastaSchema.safeParse({ nome: "a".repeat(61) }).success).toBe(false);
    expect(pastaSchema.safeParse({ nome: "a", cor: "purple" }).success).toBe(false);
    expect(pastaSchema.safeParse({ nome: "a", x: 1 }).success).toBe(false);
    expect(pastaSchema.safeParse({ nome: "Pós venda" }).success).toBe(true);
  });
  it("organizacaoSchema e favoritaSchema", () => {
    expect(organizacaoSchema.safeParse({}).success).toBe(false);
    expect(organizacaoSchema.safeParse({ forma: "lista" }).success).toBe(false);
    expect(organizacaoSchema.safeParse({ pasta_id: null }).success).toBe(true);
    expect(organizacaoSchema.safeParse({ forma: "editor" }).success).toBe(true);
    expect(favoritaSchema.safeParse({ favorita: true }).success).toBe(true);
  });
  it("loteSchema", () => {
    const id = "e5ca1e00-9701-4000-8000-000000000001";
    expect(loteSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(loteSchema.safeParse({ ids: Array(101).fill(id) }).success).toBe(false);
    expect(loteSchema.safeParse({ ids: ["x"] }).success).toBe(false);
    expect(loteSchema.safeParse({ ids: [id] }).success).toBe(true);
  });
});
