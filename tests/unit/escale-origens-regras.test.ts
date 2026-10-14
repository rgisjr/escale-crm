import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";
import {
  ICONES_DE_GRUPO,
  NOME_DE_GRUPO_MAX,
  ROTULO_DO_ICONE,
  corDoGrupo,
  corEfetiva,
  corValida,
  escolherFunilInicial,
  filtrarArvore,
  funilDoCaminho,
  iconeValido,
  iniciais,
  montarOrigens,
  validarNomeDeGrupo,
  type FunilDaOrigem,
  type GrupoDeFunis,
  type Origens,
} from "@/lib/escale/origens/regras";

const grupo = (id: string, name: string, extra: Partial<GrupoDeFunis> = {}): GrupoDeFunis => ({
  id,
  name,
  color: null,
  icon: "iniciais",
  is_archived: false,
  ...extra,
});
const funil = (id: string, name: string, group_id: string | null, extra: Partial<FunilDaOrigem> = {}): FunilDaOrigem => ({
  id,
  name,
  group_id,
  is_archived: false,
  is_default: false,
  ...extra,
});

const ORIGENS: Origens = {
  grupos: [
    grupo("g-obras", "INSS de obras"),
    grupo("g-cred", "Credenciados"),
    grupo("g-vazio", "Parcerias"),
    grupo("g-velho", "Antigo", { is_archived: true }),
  ],
  funis: [
    funil("f-leads", "Leads INSS WhatsApp", "g-obras"),
    funil("f-nayara", "Funil Nayara", "g-cred", { is_default: true }),
    funil("f-turma", "Turma 12", "g-cred"),
    funil("f-morto", "Funil morto", "g-cred", { is_archived: true }),
    funil("f-velho", "Pós-venda", "g-velho"),
    funil("f-solto", "Sem banco novo", null),
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
  });

  it("recusa nome repetido sem olhar caixa nem acento — inclusive de grupo arquivado — menos o do próprio grupo", () => {
    expect(validarNomeDeGrupo("inss DE óbras", ORIGENS.grupos, null)).toEqual({
      ok: false,
      erro: "Já existe um grupo com esse nome.",
    });
    expect(validarNomeDeGrupo("antigo", ORIGENS.grupos, null).ok).toBe(false);
    expect(validarNomeDeGrupo("INSS de Obras", ORIGENS.grupos, "g-obras")).toEqual({ ok: true, nome: "INSS de Obras" });
  });
});

describe("montarOrigens", () => {
  it("grupos ativos por nome, cada um com as origens vivas dele, inclusive o vazio", () => {
    const arvore = montarOrigens(ORIGENS);
    expect(arvore.grupos.map((g) => g.name)).toEqual(["Credenciados", "INSS de obras", "Parcerias"]);
    expect(arvore.grupos[0]!.funis.map((f) => f.id)).toEqual(["f-nayara", "f-turma"]);
    expect(arvore.grupos[2]!.funis).toEqual([]);
  });

  it("grupo arquivado sai da lista e vai para os arquivados com as origens dele", () => {
    const arvore = montarOrigens(ORIGENS);
    expect(arvore.gruposArquivados.map((g) => [g.name, g.funis.map((f) => f.id)])).toEqual([["Antigo", ["f-velho"]]]);
  });

  it("origem arquivada de grupo ativo vai para os arquivados soltos", () => {
    expect(montarOrigens(ORIGENS).funisArquivados.map((f) => f.id)).toEqual(["f-morto"]);
  });

  it("origem sem grupo (banco ainda sem a 9002) não some: vai para semGrupo", () => {
    expect(montarOrigens(ORIGENS).semGrupo.map((f) => f.id)).toEqual(["f-solto"]);
  });
});

describe("filtrarArvore", () => {
  const arvore = montarOrigens(ORIGENS);

  it("busca vazia devolve a árvore como está", () => {
    expect(filtrarArvore(arvore, "   ")).toBe(arvore);
  });

  it("achar pelo nome do grupo mostra o grupo inteiro; pelo da origem, só ela", () => {
    expect(filtrarArvore(arvore, "obras").grupos.map((g) => g.name)).toEqual(["INSS de obras"]);
    const r = filtrarArvore(arvore, "nayara");
    expect(r.grupos.map((g) => [g.name, g.funis.map((f) => f.id)])).toEqual([["Credenciados", ["f-nayara"]]]);
  });

  it("a busca não mexe nos arquivados", () => {
    expect(filtrarArvore(arvore, "nayara").gruposArquivados).toBe(arvore.gruposArquivados);
  });
});

describe("escolherFunilInicial", () => {
  it("abre o último funil aberto quando ele ainda está vivo e visível", () => {
    expect(escolherFunilInicial(ORIGENS, "f-turma")).toBe("f-turma");
  });

  it("sem lembrança válida, abre o funil padrão", () => {
    expect(escolherFunilInicial(ORIGENS, null)).toBe("f-nayara");
    expect(escolherFunilInicial(ORIGENS, "f-morto")).toBe("f-nayara");
    expect(escolherFunilInicial(ORIGENS, "f-velho")).toBe("f-nayara");
  });

  it("sem padrão visível, abre o primeiro da lista; sem nenhum, null", () => {
    const semPadrao: Origens = { ...ORIGENS, funis: ORIGENS.funis.map((f) => ({ ...f, is_default: false })) };
    expect(escolherFunilInicial(semPadrao, null)).toBe("f-leads");
    expect(escolherFunilInicial({ grupos: [], funis: [] }, null)).toBeNull();
  });
});

describe("funilDoCaminho e iniciais", () => {
  it("lê o funil do endereço do quadro", () => {
    expect(funilDoCaminho("/app/pipelines/abc")).toBe("abc");
    expect(funilDoCaminho("/app/kanban")).toBeNull();
  });

  it("iniciais pulam palavras curtas", () => {
    expect(iniciais("INSS de obras")).toBe("IO");
    expect(iniciais("Credenciados")).toBe("CR");
    expect(iniciais("  ")).toBe("?");
  });
});

describe("cor e ícone do grupo", () => {
  it("a cor automática sai da paleta das etiquetas e é estável", () => {
    for (const id of ["g-1", "g-2", "g-3"]) {
      expect(PALETA_DE_ETIQUETAS).toContain(corDoGrupo(id));
      expect(corDoGrupo(id)).toBe(corDoGrupo(id));
    }
  });

  it("a cor escolhida vence a automática; cor fora da paleta é recusada", () => {
    expect(corEfetiva({ id: "g-1", color: "#0091ff" })).toBe("#0091ff");
    expect(corEfetiva({ id: "g-1", color: null })).toBe(corDoGrupo("g-1"));
    expect(corValida("#0091ff")).toBe("#0091ff");
    expect(corValida("#123456")).toBeNull();
    expect(corValida(42)).toBeNull();
  });

  it("ícone fora da lista vira iniciais, e todo ícone tem rótulo em espanhol", () => {
    expect(iconeValido("pessoas")).toBe("pessoas");
    expect(iconeValido("foguete")).toBe("iniciais");
    const semEspanhol = ICONES_DE_GRUPO.map((i) => ROTULO_DO_ICONE[i]).filter((r) => !DICIONARIO[r]?.es);
    expect(semEspanhol).toEqual([]);
  });
});
