import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";
import {
  NOME_DE_GRUPO_MAX,
  corDoGrupo,
  filtrarArvore,
  funilDoCaminho,
  iniciais,
  montarOrigens,
  validarNomeDeGrupo,
  type Origens,
} from "@/lib/escale/origens/regras";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras" },
    { id: "g-cred", name: "Credenciados" },
    { id: "g-vazio", name: "Parcerias" },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras" },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred" },
    { id: "f-turma", name: "Turma 12", group_id: "g-cred" },
    { id: "f-solto", name: "Pós-venda", group_id: null },
    { id: "f-orfao", name: "Funil órfão", group_id: "g-apagado" },
  ],
};

describe("validarNomeDeGrupo", () => {
  it("apara as pontas e junta os espaços do meio", () => {
    expect(validarNomeDeGrupo("  Parcerias   novas ", [], null)).toEqual({ ok: true, nome: "Parcerias novas" });
  });

  it("recusa nome vazio e nome acima do limite", () => {
    expect(validarNomeDeGrupo("   ", [], null)).toEqual({ ok: false, erro: "Dê um nome ao grupo." });
    expect(validarNomeDeGrupo("x".repeat(NOME_DE_GRUPO_MAX + 1), [], null)).toEqual({
      ok: false,
      erro: "O nome do grupo pode ter até 60 caracteres.",
    });
    expect(validarNomeDeGrupo("x".repeat(NOME_DE_GRUPO_MAX), [], null).ok).toBe(true);
  });

  it("recusa nome repetido sem olhar caixa nem acento — menos o do próprio grupo", () => {
    expect(validarNomeDeGrupo("inss DE óbras", ORIGENS.grupos, null)).toEqual({
      ok: false,
      erro: "Já existe um grupo com esse nome.",
    });
    expect(validarNomeDeGrupo("INSS de Obras", ORIGENS.grupos, "g-obras")).toEqual({
      ok: true,
      nome: "INSS de Obras",
    });
  });

  it("toda mensagem de recusa tem espanhol no dicionário", () => {
    const erros = ["Dê um nome ao grupo.", "O nome do grupo pode ter até 60 caracteres.", "Já existe um grupo com esse nome."];
    expect(erros.filter((e) => !DICIONARIO[e]?.es)).toEqual([]);
  });
});

describe("montarOrigens", () => {
  it("ordena os grupos pelo nome, põe cada funil no seu grupo e mantém grupo vazio", () => {
    const arvore = montarOrigens(ORIGENS);
    expect(arvore.grupos.map((g) => g.name)).toEqual(["Credenciados", "INSS de obras", "Parcerias"]);
    expect(arvore.grupos[0]!.funis.map((f) => f.id)).toEqual(["f-nayara", "f-turma"]);
    expect(arvore.grupos[2]!.funis).toEqual([]);
  });

  it("funil sem grupo — ou com grupo que não existe mais — vai para Sem grupo", () => {
    expect(montarOrigens(ORIGENS).semGrupo.map((f) => f.id)).toEqual(["f-solto", "f-orfao"]);
  });
});

describe("filtrarArvore", () => {
  const arvore = montarOrigens(ORIGENS);

  it("busca vazia devolve a árvore como está", () => {
    expect(filtrarArvore(arvore, "   ")).toBe(arvore);
  });

  it("achar pelo nome do grupo mostra o grupo inteiro", () => {
    const r = filtrarArvore(arvore, "obras");
    expect(r.grupos.map((g) => g.name)).toEqual(["INSS de obras"]);
    expect(r.grupos[0]!.funis.map((f) => f.id)).toEqual(["f-leads"]);
    expect(r.semGrupo).toEqual([]);
  });

  it("achar pelo nome do funil mostra só esse funil dentro do grupo dele", () => {
    const r = filtrarArvore(arvore, "nayara");
    expect(r.grupos.map((g) => g.name)).toEqual(["Credenciados"]);
    expect(r.grupos[0]!.funis.map((f) => f.id)).toEqual(["f-nayara"]);
  });

  it("ignora acento e pontuação, e também procura em Sem grupo", () => {
    const r = filtrarArvore(arvore, "pos venda");
    expect(r.grupos).toEqual([]);
    expect(r.semGrupo.map((f) => f.id)).toEqual(["f-solto"]);
  });
});

describe("funilDoCaminho", () => {
  it("lê o funil do endereço do quadro, com ou sem query", () => {
    expect(funilDoCaminho("/app/pipelines/abc")).toBe("abc");
    expect(funilDoCaminho("/app/pipelines/abc?lead=1")).toBe("abc");
    expect(funilDoCaminho("/app/kanban")).toBeNull();
  });
});

describe("iniciais e cor do grupo", () => {
  it("iniciais pulam palavras curtas como 'de'", () => {
    expect(iniciais("INSS de obras")).toBe("IO");
    expect(iniciais("Funil da Nayara")).toBe("FN");
    expect(iniciais("Credenciados")).toBe("CR");
    expect(iniciais("  ")).toBe("?");
  });

  it("a cor sai da paleta medida das etiquetas, é sempre a mesma para o mesmo grupo e varia entre grupos", () => {
    const ids = ["g-1", "g-2", "g-3", "g-4", "g-5", "g-6", "g-7", "g-8"];
    for (const id of ids) {
      expect(PALETA_DE_ETIQUETAS).toContain(corDoGrupo(id));
      expect(corDoGrupo(id)).toBe(corDoGrupo(id));
    }
    expect(new Set(ids.map(corDoGrupo)).size).toBeGreaterThan(1);
  });
});
