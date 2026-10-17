import { describe, expect, it } from "vitest";

import {
  COLUNAS_PADRAO,
  MAXIMO_DE_COLUNAS,
  chaveDoItem,
  formatarTelefone,
  instagramDoLink,
  lerColunas,
  linkDoInstagram,
  mesmasColunas,
  paginasVisiveis,
  telefoneE164,
  totalDePaginas,
} from "@/lib/escale/contatos/regras";

describe("paginação", () => {
  it("total de páginas nunca é zero", () => {
    expect(totalDePaginas(0, 10)).toBe(1);
    expect(totalDePaginas(64001, 10)).toBe(6401);
    expect(totalDePaginas(10, 10)).toBe(1);
  });

  it("no começo mostra 1–4, reticências e a última (captura 03-001)", () => {
    expect(paginasVisiveis(1, 6401)).toEqual([1, 2, 3, 4, "…", 6401]);
  });

  it("no meio mostra a primeira, os vizinhos e a última", () => {
    expect(paginasVisiveis(50, 6401)).toEqual([1, "…", 49, 50, 51, "…", 6401]);
  });

  it("no fim mostra a primeira e as quatro últimas", () => {
    expect(paginasVisiveis(6401, 6401)).toEqual([1, "…", 6398, 6399, 6400, 6401]);
  });

  it("poucas páginas aparecem todas", () => {
    expect(paginasVisiveis(1, 1)).toEqual([1]);
    expect(paginasVisiveis(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("telefone", () => {
  it("celular e fixo do Brasil no formato da Clint", () => {
    expect(formatarTelefone("+5564999446816")).toBe("(64) 99944-6816");
    expect(formatarTelefone("+554833809958")).toBe("(48) 3380-9958");
  });

  it("outro país fica com o código e o número", () => {
    expect(formatarTelefone("+351912345678")).toBe("+351 912345678");
  });

  it("vazio é vazio", () => {
    expect(formatarTelefone(null)).toBe("");
  });

  it("país + número viram E.164; número curto ou longo é recusado", () => {
    expect(telefoneE164("55", "(64) 99944-6816")).toBe("+5564999446816");
    expect(telefoneE164("55", "123")).toBeNull();
    expect(telefoneE164("55", "")).toBeNull();
    expect(telefoneE164("1", "2025550123")).toBe("+12025550123");
  });
});

describe("Instagram", () => {
  it("@usuario, usuario e o link viram o mesmo link", () => {
    expect(linkDoInstagram("@dapenhamaria")).toBe("https://instagram.com/dapenhamaria");
    expect(linkDoInstagram("dapenhamaria")).toBe("https://instagram.com/dapenhamaria");
    expect(linkDoInstagram("https://www.instagram.com/dapenhamaria/")).toBe(
      "https://instagram.com/dapenhamaria",
    );
  });

  it("vazio é null; usuário com caractere proibido é recusado", () => {
    expect(linkDoInstagram("  ")).toBeNull();
    expect(linkDoInstagram("@nome com espaço")).toBe(false);
  });

  it("o link vira o @ da coluna", () => {
    expect(instagramDoLink("https://instagram.com/dapenhamaria")).toBe("dapenhamaria");
    expect(instagramDoLink("https://www.instagram.com/dapenhamaria/?hl=pt")).toBe("dapenhamaria");
    expect(instagramDoLink("https://exemplo.com/x")).toBeNull();
    expect(instagramDoLink(null)).toBeNull();
  });
});

describe("colunas", () => {
  it("padrão: Contato, Tags e Negócios", () => {
    expect(COLUNAS_PADRAO.map(chaveDoItem)).toEqual([
      "nativa:contato",
      "nativa:tags",
      "nativa:negocios",
    ]);
  });

  it("lê a preferência guardada, sem repetir e sem chave desconhecida", () => {
    const lidas = lerColunas({
      itens: [
        { tipo: "nativa", chave: "tags" },
        { tipo: "nativa", chave: "tags" },
        { tipo: "nativa", chave: "inventada" },
        { tipo: "campo", chave: "link_instagram" },
        { tipo: "campo", chave: "nascimento" },
      ],
    });
    expect(lidas.map(chaveDoItem)).toEqual([
      "nativa:tags",
      "campo:link_instagram",
      "campo:nascimento",
    ]);
  });

  it("preferência ausente ou estragada volta ao padrão", () => {
    expect(lerColunas(null)).toEqual(COLUNAS_PADRAO);
    expect(lerColunas({ itens: "x" })).toEqual(COLUNAS_PADRAO);
  });

  it("lista vazia é válida (a pessoa desligou tudo)", () => {
    expect(lerColunas({ itens: [] })).toEqual([]);
  });

  it("corta no máximo", () => {
    const muitas = Array.from({ length: MAXIMO_DE_COLUNAS + 5 }, (_, i) => ({
      tipo: "campo",
      chave: `c${i}`,
    }));
    expect(lerColunas({ itens: muitas })).toHaveLength(MAXIMO_DE_COLUNAS);
  });

  it("compara duas listas pela ordem", () => {
    expect(mesmasColunas(COLUNAS_PADRAO, [...COLUNAS_PADRAO])).toBe(true);
    expect(mesmasColunas(COLUNAS_PADRAO, [...COLUNAS_PADRAO].reverse())).toBe(false);
  });
});
