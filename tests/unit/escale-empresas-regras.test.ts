import { describe, expect, it } from "vitest";

import {
  COLUNAS_PADRAO_DE_EMPRESAS,
  ESCOPO_PADRAO,
  consultaDaListaDeEmpresasSchema,
  desfechoDaRemocao,
  iniciaisDaEmpresa,
  lerCnpj,
  mascaraDeCnpj,
  novaEmpresaSchema,
} from "@/lib/escale/empresas/regras";

describe("regras das empresas (Fase 2D)", () => {
  it("consulta: escopo padrão 'com nome', página 1, 10 por página", () => {
    expect(ESCOPO_PADRAO).toBe("com_nome");
    expect(consultaDaListaDeEmpresasSchema.parse({})).toEqual({ e: "com_nome", p: 1, n: 10 });
    expect(consultaDaListaDeEmpresasSchema.safeParse({ e: "outra" }).success).toBe(false);
  });

  it("máscara do CNPJ enquanto digita", () => {
    expect(mascaraDeCnpj("1")).toBe("1");
    expect(mascaraDeCnpj("11222")).toBe("11.222");
    expect(mascaraDeCnpj("11222333")).toBe("11.222.333");
    expect(mascaraDeCnpj("112223330001")).toBe("11.222.333/0001");
    expect(mascaraDeCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(mascaraDeCnpj("11.222.333/0001-8199")).toBe("11.222.333/0001-81");
  });

  it("CNPJ: vazio é opcional; válido normaliza e formata; inválido recusa", () => {
    expect(lerCnpj("")).toEqual({ ok: true, normalizado: null, formatado: null });
    expect(lerCnpj("11.222.333/0001-81")).toEqual({ ok: true, normalizado: "11222333000181", formatado: "11.222.333/0001-81" });
    expect(lerCnpj("11.222.333/0001-80")).toEqual({ ok: false });
    expect(lerCnpj("11111111111111")).toEqual({ ok: false });
  });

  it("nova empresa: nome obrigatório; contato existente ou novo", () => {
    expect(novaEmpresaSchema.safeParse({ nome: " ", contato_id: "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b" }).success).toBe(false);
    expect(
      novaEmpresaSchema.parse({ nome: "Atlas", cnpj: "", site: "atlas.com.br", contato_id: "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b" }),
    ).toMatchObject({ nome: "Atlas", site: "atlas.com.br" });
  });

  it("remover da empresa: simples, escolher o principal ou último contato", () => {
    const a = { id: "a", principal: true };
    const b = { id: "b", principal: false };
    expect(desfechoDaRemocao([a, b], "b")).toBe("simples");
    expect(desfechoDaRemocao([a, b], "a")).toBe("escolher_principal");
    expect(desfechoDaRemocao([a], "a")).toBe("ultimo");
    expect(desfechoDaRemocao([{ id: "c", principal: false }], "c")).toBe("ultimo");
  });

  it("colunas padrão da Clint e as iniciais do monograma", () => {
    expect(COLUNAS_PADRAO_DE_EMPRESAS.map((c) => c.chave)).toEqual(["contato_principal", "segmento", "contatos", "valor_aberto", "negocios"]);
    expect(iniciaisDaEmpresa("Daiane Feijó Barreto Incorporação Ltda")).toBe("DL");
    expect(iniciaisDaEmpresa("naiara")).toBe("N");
    expect(iniciaisDaEmpresa("")).toBe("?");
  });
});
