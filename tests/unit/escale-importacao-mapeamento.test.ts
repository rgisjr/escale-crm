import { describe, expect, it } from "vitest";

import type { Catalogo } from "@/lib/escale/campos/regras";
import {
  mapeamentoValido,
  opcoesDoMapeamento,
  rotuloDoDestino,
  semNomeDaEmpresa,
  sugerirMapeamento,
  type CatalogosDaImportacao,
} from "@/lib/escale/importacao/mapeamento";

const campo = (objeto: "contato" | "empresa" | "negocio", chave: string, label: string) => ({
  id: chave,
  objeto,
  chave,
  definicao: { label, type: "text" as const },
  grupo_id: null,
  papel_minimo: null,
  posicao: 0,
  padrao: false,
});
const cat = (...campos: ReturnType<typeof campo>[]): Catalogo => ({ grupos: [], campos });
const catalogos: CatalogosDaImportacao = {
  contato: cat(campo("contato", "cidade_natal", "Cidade natal")),
  empresa: cat(campo("empresa", "segmento", "Segmento")),
  negocio: cat(campo("negocio", "produto", "Produto")),
};

describe("mapeamento da importação (Fase 2F)", () => {
  it("Contatos não oferece os destinos de negócio; Negócios oferece", () => {
    const c = opcoesDoMapeamento("contato", catalogos).map((o) => o.valor);
    expect(c).toEqual(expect.arrayContaining(["id", "name", "email", "phone", "company", "org:segmento", "custom:cidade_natal"]));
    expect(c).not.toContain("title");
    expect(c).not.toContain("deal_id");
    const n = opcoesDoMapeamento("negocio", catalogos).map((o) => o.valor);
    expect(n.slice(0, 2)).toEqual(["deal_id", "id"]);
    expect(n).toEqual(expect.arrayContaining(["title", "value", "stage_name", "origin_name", "won_at", "deal_custom:produto"]));
  });

  it("sugere pelo cabeçalho, sem repetir destino (o print v2-08)", () => {
    const opcoes = opcoesDoMapeamento("negocio", catalogos);
    expect(sugerirMapeamento(["Cliente", "Celular", "Email", "Ticket", "Etiquetas"], "negocio", opcoes).map((c) => c.para)).toEqual([
      "none",
      "phone",
      "email",
      "none",
      "none",
    ]);
    expect(
      sugerirMapeamento(["Nome", "Nome da empresa", "Telefone", "WhatsApp", "Produto", "Origem"], "negocio", opcoes).map((c) => c.para),
    ).toEqual(["name", "company", "phone", "none", "deal_custom:produto", "origin_name"]);
    const deContato = opcoesDoMapeamento("contato", catalogos);
    expect(sugerirMapeamento(["Título", "Valor"], "contato", deContato).map((c) => c.para)).toEqual(["none", "none"]);
    expect(sugerirMapeamento(["DDI"], "contato", deContato)[0].para).toBe("ddi");
  });

  it("válido com um identificador; o aviso sem o nome da empresa", () => {
    expect(mapeamentoValido([{ csv: "a", para: "none" }], "contato")).toBe(false);
    expect(mapeamentoValido([{ csv: "a", para: "org:cidade" }], "contato")).toBe(false);
    expect(mapeamentoValido([{ csv: "a", para: "email" }], "contato")).toBe(true);
    expect(mapeamentoValido([{ csv: "a", para: "title" }], "negocio")).toBe(true);
    expect(semNomeDaEmpresa([{ csv: "a", para: "org:cidade" }])).toBe(true);
    expect(semNomeDaEmpresa([{ csv: "a", para: "org:cidade" }, { csv: "b", para: "company" }])).toBe(false);
  });

  it("rótulo do destino", () => {
    const opcoes = opcoesDoMapeamento("contato", catalogos);
    expect(rotuloDoDestino("custom:cidade_natal", opcoes)).toBe("Cidade natal");
    expect(rotuloDoDestino("org:segmento", opcoes)).toBe("Segmento");
    expect(rotuloDoDestino("sumiu", opcoes)).toBe("sumiu");
  });
});
