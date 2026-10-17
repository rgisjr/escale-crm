import { describe, expect, it } from "vitest";

import {
  CAMPOS_DO_CONTATO,
  PREFS_PADRAO,
  alternarCampo,
  alternarCanal,
  alternarItem,
  camposDaCapa,
  canaisLigados,
  diferemDoPadrao,
  lerPrefs,
  limparCamposSemOrigem,
  ocupados,
  prefsIguais,
  textoDoValor,
  valorDoCampo,
  type PrefsDoCard,
} from "@/lib/escale/capa/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

const SETTINGS = {
  fields: [
    { key: "renda", label: "Renda", type: "number" },
    { key: "plano", label: "Plano", type: "select", options: [{ value: "a", label: "Anual" }] },
  ],
};
const RENDA = { entidade: "negocio" as const, chave: "renda" };

describe("a preferência do card (forma da Clint)", () => {
  it("o padrão é o da Clint: seis itens ligados e 'Nome da empresa' desligado (E3), sem campos, telefone/mensagem/e-mail", () => {
    expect(lerPrefs(PREFS_PADRAO)).toEqual(PREFS_PADRAO);
    // FORK ESCALE · Fase 1E (decisão E3): "Nome da empresa" fica desligado até a empresa existir.
    expect(PREFS_PADRAO.itens.empresa).toBe(false);
    const { empresa: _empresa, ...demais } = PREFS_PADRAO.itens;
    expect(Object.values(demais).every(Boolean)).toBe(true);
    expect(PREFS_PADRAO.canais).toEqual({
      telefone: true,
      mensagem: true,
      email: true,
      lembrete: false,
      agendamento: false,
    });
    expect(ocupados(PREFS_PADRAO)).toBe(6);
    expect(diferemDoPadrao(PREFS_PADRAO)).toBe(false);
    // Preferência salva antes da E3, com a empresa ligada, agora conta como personalizada.
    expect(diferemDoPadrao({ ...PREFS_PADRAO, itens: { ...PREFS_PADRAO.itens, empresa: true } })).toBe(
      true,
    );
  });

  it("o que não serve mais vira null, sem lançar", () => {
    expect(lerPrefs(null)).toBeNull();
    expect(lerPrefs({ ...PREFS_PADRAO, extra: 1 })).toBeNull();
    expect(
      lerPrefs({ ...PREFS_PADRAO, canais: { ...PREFS_PADRAO.canais, lembrete: true } }),
    ).toBeNull();
    expect(lerPrefs({ ...PREFS_PADRAO, campos: [RENDA, RENDA] })).toBeNull();
  });

  it("10 campos no máximo (itens ligados + campos) e 3 ícones; alternar devolve preferência nova", () => {
    let p: PrefsDoCard = PREFS_PADRAO;
    for (const chave of ["a", "b", "c", "d"]) p = alternarCampo(p, { entidade: "negocio", chave });
    expect(ocupados(p)).toBe(10);
    expect(alternarCampo(p, { entidade: "negocio", chave: "e" })).toBe(p);
    expect(alternarItem(p, "tags").itens.tags).toBe(false);
    expect(alternarCanal(PREFS_PADRAO, "lembrete")).toBe(PREFS_PADRAO);
    expect(canaisLigados(alternarCanal(alternarCanal(PREFS_PADRAO, "email"), "lembrete"))).toBe(3);
    expect(PREFS_PADRAO.itens.tags).toBe(true);
  });

  it("iguais sem olhar a ordem dos campos", () => {
    const a = alternarCampo(alternarCampo(PREFS_PADRAO, RENDA), CAMPOS_DO_CONTATO[0]!);
    const b = alternarCampo(alternarCampo(PREFS_PADRAO, CAMPOS_DO_CONTATO[0]!), RENDA);
    expect(prefsIguais(a, b)).toBe(true);
    expect(diferemDoPadrao(a)).toBe(true);
  });

  it("os campos: Email e Telefone do contato e os da origem; o valor sai com o rótulo da opção", () => {
    const campos = camposDaCapa([SETTINGS]);
    expect(campos.map((c) => `${c.entidade}:${c.chave}`)).toEqual([
      "contato:email",
      "contato:telefone",
      "negocio:renda",
      "negocio:plano",
    ]);
    const lead = negocio("l-1", {
      contact_email: "ana@x.com",
      custom_fields: { renda: 5000, plano: "a" },
    });
    const plano = campos.find((c) => c.chave === "plano")!;
    expect(valorDoCampo(lead, campos[0]!)).toBe("ana@x.com");
    expect(textoDoValor(valorDoCampo(lead, plano), plano, "Sim", "Não")).toBe("Anual");
    expect(textoDoValor(true, campos[2]!, "Sim", "Não")).toBe("Sim");
    expect(textoDoValor("  ", campos[2]!, "Sim", "Não")).toBeNull();
  });
});

describe("campo apagado do CRM (a preferência vale em todas as origens)", () => {
  const CATALOGO = camposDaCapa([SETTINGS, { fields: [{ key: "cidade", label: "Cidade", type: "text" }] }]);
  const CIDADE = { entidade: "negocio" as const, chave: "cidade" };
  const EMAIL = { entidade: "contato" as const, chave: "email" };
  const FANTASMA = { entidade: "negocio" as const, chave: "apagado" };

  it("solta o campo do negócio que nenhuma origem tem mais; contato e os que existem ficam", () => {
    const p: PrefsDoCard = { ...PREFS_PADRAO, campos: [RENDA, FANTASMA, EMAIL, CIDADE] };
    const limpa = limparCamposSemOrigem(p, CATALOGO);
    expect(limpa.campos).toEqual([RENDA, EMAIL, CIDADE]);
    expect(ocupados(limpa)).toBe(ocupados(p) - 1);
    expect(p.campos).toHaveLength(4);
  });

  it("não tem o que soltar: devolve a MESMA preferência; catálogo vazio solta todos os do negócio", () => {
    const p: PrefsDoCard = { ...PREFS_PADRAO, campos: [RENDA, EMAIL] };
    expect(limparCamposSemOrigem(p, CATALOGO)).toBe(p);
    expect(limparCamposSemOrigem(p, []).campos).toEqual([EMAIL]);
  });
});
