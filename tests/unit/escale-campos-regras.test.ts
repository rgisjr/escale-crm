import { describe, expect, it } from "vitest";

import {
  CAMPOS_FIXOS_DA_EMPRESA,
  CAMPOS_FIXOS_DO_CONTATO,
  GRUPO_PADRAO,
  OBJETOS_DE_CAMPO,
  TIPOS_DA_CLINT,
  camposPorGrupo,
  chaveDoNome,
  tipoDoMotor,
  variavelDoCampo,
  visivelPara,
} from "@/lib/escale/campos/regras";

describe("regras do catálogo de campos (Fase 2C)", () => {
  it("os três objetos, na ordem da Clint", () => {
    expect(OBJETOS_DE_CAMPO).toEqual(["contato", "empresa", "negocio"]);
  });

  it("chave pela régua da Clint: sem acento, minúscula, _ no lugar de espaço, 20 caracteres", () => {
    expect(chaveDoNome("Número de funcionários", [])).toBe("numero_de_funcionari");
    expect(chaveDoNome("Projeto  interessado!", [])).toBe("projeto_interessado");
    expect(chaveDoNome("Linkedin", ["linkedin"])).toBe("linkedin_1");
    expect(chaveDoNome("Linkedin", ["linkedin", "linkedin_1"])).toBe("linkedin_2");
    expect(chaveDoNome("ddi", [])).toBe("ddi_1");
    expect(chaveDoNome("   ", [])).toBeNull();
    expect(chaveDoNome("123 abc", [])).toBe("c_123_abc");
  });

  it("os nove tipos da Clint viram tipos do motor", () => {
    expect(TIPOS_DA_CLINT.map((t) => t.chave)).toEqual([
      "TEXT", "NUMBER", "CURRENCY", "RICH_TEXT", "PHONE", "SELECT", "MULTIPLE_SELECT", "DATE", "DATETIME",
    ]);
    expect(tipoDoMotor("RICH_TEXT")).toBe("textarea");
    expect(tipoDoMotor("DATETIME")).toBe("datetime");
  });

  it("visibilidade por papel mínimo", () => {
    expect(visivelPara(null, "viewer")).toBe(true);
    expect(visivelPara("agent", "viewer")).toBe(false);
    expect(visivelPara("manager", "agent")).toBe(false);
    expect(visivelPara("manager", "manager")).toBe(true);
    expect(visivelPara("admin", "manager")).toBe(false);
    expect(visivelPara("admin", "admin")).toBe(true);
  });

  it("campos fixos: contato e empresa", () => {
    expect(CAMPOS_FIXOS_DO_CONTATO.map((c) => c.chave)).toEqual([
      "nome", "telefone", "email", "instagram", "documento", "nascimento",
    ]);
    expect(CAMPOS_FIXOS_DA_EMPRESA.map((c) => c.chave)).toEqual(["nome", "cidade", "estado", "cnpj"]);
  });

  it("agrupa pelo grupo, com os sem grupo em Informações Gerais, na ordem", () => {
    const grupos = camposPorGrupo({
      grupos: [
        { id: "g1", chave: GRUPO_PADRAO, nome: "Informações Gerais", posicao: 0, padrao: true },
        { id: "g2", chave: "kaio_ia", nome: "Kaio IA", posicao: 1, padrao: false },
      ],
      campos: [
        { id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: "g2", papel_minimo: null, posicao: 0, padrao: false },
        { id: "c2", objeto: "contato", chave: "notas", definicao: { label: "Notas", type: "textarea" }, grupo_id: null, papel_minimo: null, posicao: 1, padrao: false },
      ],
    });
    expect(grupos.map((g) => [g.grupo.chave, g.campos.map((c) => c.chave)])).toEqual([
      [GRUPO_PADRAO, ["notas"]],
      ["kaio_ia", ["cargo"]],
    ]);
  });

  it("a variável do campo é {{objeto.chave}}", () => {
    expect(variavelDoCampo("contato", "cargo")).toBe("{{contato.cargo}}");
  });
});
