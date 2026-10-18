import { describe, expect, it } from "vitest";

import {
  ALERTA_VAZIO,
  emMinutos,
  erroDoLimite,
  gravarAlerta,
  lerAlerta,
  nivelDoPrazo,
} from "@/lib/escale/configuracoes/alerta";
import {
  camposDaOrigem,
  errosDasRegras,
  gravarRegrasDosCampos,
  regrasDaOrigem,
} from "@/lib/escale/configuracoes/campos";
import {
  catalogoDeMotivos,
  gravarMotivos,
  rotuloDoMotivo,
  semMotivosInativos,
} from "@/lib/escale/configuracoes/motivos";
import {
  lerConfiguracoesDoFork,
  moedaDaOrigem,
  normalizarTagsPadrao,
} from "@/lib/escale/configuracoes/tipos";

const E1 = "aaaaaaaa-0000-4000-8000-000000000001";
const E2 = "aaaaaaaa-0000-4000-8000-000000000002";
const ARQ = "aaaaaaaa-0000-4000-8000-000000000009";
const lim = (
  atencao: number | null,
  au: "minutos" | "horas" | "dias",
  critico: number | null,
  cu: "minutos" | "horas" | "dias",
) => ({
  atencao,
  atencao_unidade: au,
  critico,
  critico_unidade: cu,
});

describe("tipos", () => {
  it("lixo vira nada configurado", () => {
    expect(lerConfiguracoesDoFork(null)).toEqual({
      moeda: null,
      tagsPadrao: [],
      motivosInativos: [],
      aoSair: {},
      alerta: ALERTA_VAZIO,
      visualizacao: null,
      pessoas: [],
      soAdminGanha: false,
      atribuicao: { operador: "e", condicoes: [] },
      notificacoes: { novoNegocio: [], mudancaDeStatus: { status: [], pessoas: [] } },
    });
  });
  it("moeda só se for servida; tags na régua do contato, sem cliente, até 10", () => {
    expect(moedaDaOrigem({ escale_moeda: "USD" })).toBe("USD");
    expect(moedaDaOrigem({ escale_moeda: "XYZ" })).toBeNull();
    expect(normalizarTagsPadrao([" VIP ", "vip", "Cliente", ""])).toEqual(["vip"]);
  });
  it("ao sair aceita 'all' ou uuids", () => {
    expect(
      lerConfiguracoesDoFork({ escale_ao_sair: { a: ["all"], b: [E1, "x", E1], c: [] } }).aoSair,
    ).toEqual({ a: ["all"], b: [E1] });
  });
});

describe("alerta (modelo da Clint)", () => {
  it("cada limite tem a sua unidade, e um deles pode faltar", () => {
    expect(emMinutos(2, "horas")).toBe(120);
    expect(emMinutos(1, "dias")).toBe(1440);
    expect(erroDoLimite(lim(4, "horas", 8, "horas"))).toBeNull();
    expect(erroDoLimite(lim(null, "horas", 8, "horas"))).toBeNull();
    expect(erroDoLimite(lim(null, "horas", null, "horas"))).toBe(
      "Preencha pelo menos um limite na exceção ou remova-a antes de salvar.",
    );
    expect(erroDoLimite(lim(2, "dias", 30, "horas"))).toBe(
      "O limite crítico deve ser maior que o limite de atenção.",
    );
    expect(erroDoLimite(lim(0, "horas", null, "horas"))).toBe("Informe um valor entre 1 e 8760.");
  });
  it("lê só o que é válido", () => {
    expect(
      lerAlerta({
        geral: lim(4, "horas", 8, "horas"),
        etapas: { [E1]: lim(1, "dias", null, "dias"), x: lim(1, "horas", 2, "horas") },
      }),
    ).toEqual({
      geral: lim(4, "horas", 8, "horas"),
      etapas: { [E1]: lim(1, "dias", null, "dias") },
    });
  });
  it("nível: ok, atenção e crítico; exceção vence; encerrada e sem regra não têm", () => {
    const alerta = {
      geral: lim(4, "horas", 8, "horas"),
      etapas: { [E2]: lim(null, "horas", 1, "dias") },
    };
    const aberta = (id: string) => ({ id, is_won: false, is_lost: false });
    expect(nivelDoPrazo({ alerta, etapa: aberta(E1), horasNaEtapa: 2 })).toBe("ok");
    expect(nivelDoPrazo({ alerta, etapa: aberta(E1), horasNaEtapa: 5 })).toBe("atencao");
    expect(nivelDoPrazo({ alerta, etapa: aberta(E1), horasNaEtapa: 9 })).toBe("critico");
    expect(nivelDoPrazo({ alerta, etapa: aberta(E2), horasNaEtapa: 9 })).toBe("ok");
    expect(nivelDoPrazo({ alerta, etapa: aberta(E2), horasNaEtapa: 25 })).toBe("critico");
    expect(
      nivelDoPrazo({ alerta, etapa: { id: E1, is_won: true, is_lost: false }, horasNaEtapa: 99 }),
    ).toBeNull();
    expect(nivelDoPrazo({ alerta: ALERTA_VAZIO, etapa: aberta(E1), horasNaEtapa: 99 })).toBeNull();
  });
  it("gravar tira exceção de etapa morta; vazio vira null", () => {
    expect(
      gravarAlerta({ geral: null, etapas: { [E2]: lim(1, "horas", 2, "horas") } }, [E1]),
    ).toBeNull();
  });
});

describe("campos obrigatórios (regras da Clint)", () => {
  const SETTINGS = {
    fields: [
      {
        key: "proposta",
        label: "Proposta",
        type: "text",
        obrigatorio_em: { etapas: [E1, E2, ARQ] },
      },
      { key: "cnpj", label: "CNPJ", type: "text", obrigatorio_em: { ao_perder: true } },
      { key: "obs", label: "Obs", type: "text" },
    ],
    escale_ao_sair: { cnpj: [E1] },
  };
  const ABERTAS = [E1, E2];

  it("campos e regras lidos do settings; 'Ao entrar' em todas as abertas vira 'Todas as etapas'", () => {
    expect(camposDaOrigem(SETTINGS).map((c) => c.campo)).toEqual(["proposta", "cnpj", "obs"]);
    expect(regrasDaOrigem(SETTINGS, ABERTAS)).toEqual([
      { campo: "proposta", quando: "ao_entrar", etapas: ["all"], status: [] },
      { campo: "cnpj", quando: "ao_sair", etapas: [E1], status: ["perdido"] },
    ]);
  });

  it("erros: etapa no Ao entrar; etapa ou status no Durante; regra repetida", () => {
    expect(
      errosDasRegras([
        { campo: "a", quando: "ao_entrar", etapas: [], status: [] },
        { campo: "b", quando: "ao_sair", etapas: [], status: [] },
        { campo: "c", quando: "ao_sair", etapas: [], status: ["ganho"] },
        { campo: "c", quando: "ao_sair", etapas: [E1], status: [] },
      ]),
    ).toEqual({
      0: "Selecione ao menos uma etapa",
      1: "Selecione ao menos uma etapa ou status",
      3: "Este campo já possui uma regra deste tipo.",
    });
  });

  it("gravar: 'all' do Ao entrar vira as abertas; Durante guarda 'all'; status vira ao_ganhar/ao_perder; arquivada fica", () => {
    const r = gravarRegrasDosCampos(
      SETTINGS,
      [
        { campo: "proposta", quando: "ao_entrar", etapas: ["all"], status: [] },
        { campo: "obs", quando: "ao_sair", etapas: ["all"], status: ["ganho"] },
      ],
      ABERTAS,
      ABERTAS,
    );
    expect(r).toEqual({
      ok: true,
      fields: [
        {
          key: "proposta",
          label: "Proposta",
          type: "text",
          obrigatorio_em: { etapas: [E1, E2, ARQ] },
        },
        { key: "cnpj", label: "CNPJ", type: "text" },
        { key: "obs", label: "Obs", type: "text", obrigatorio_em: { ao_ganhar: true } },
      ],
      aoSair: { obs: ["all"] },
    });
  });

  it("recusa campo inexistente, etapa de fora e mais de 50 regras", () => {
    expect(
      gravarRegrasDosCampos(
        SETTINGS,
        [{ campo: "x", quando: "ao_sair", etapas: [E1], status: [] }],
        ABERTAS,
        ABERTAS,
      ),
    ).toEqual({
      ok: false,
      erro: "Esse campo não existe mais no CRM. Feche e abra de novo.",
    });
    expect(
      gravarRegrasDosCampos(
        SETTINGS,
        [{ campo: "obs", quando: "ao_sair", etapas: [ARQ], status: [] }],
        ABERTAS,
        ABERTAS,
      ),
    ).toEqual({
      ok: false,
      erro: "Escolha etapas desta origem.",
    });
    const muitas = Array.from({ length: 51 }, () => ({
      campo: "obs",
      quando: "ao_sair" as const,
      etapas: [E1],
      status: [],
    }));
    expect(gravarRegrasDosCampos(SETTINGS, muitas, ABERTAS, ABERTAS)).toEqual({
      ok: false,
      erro: "Esta origem atingiu o limite de 50 regras de campo obrigatório. Remova algumas para poder salvar.",
    });
  });
});

describe("motivos (catálogo da organização, seleção da origem)", () => {
  const DAQUI = {
    lost_reasons: ["Preço", { label: "Sumiu", categoria: "Ausência" }],
    escale_motivos_inativos: ["sumiu"],
  };
  const OUTRA = { lost_reasons: ["Concorrente", "preço"] };

  it("o catálogo junta as origens; selecionado é o que vale aqui", () => {
    expect(rotuloDoMotivo({ label: " Sumiu " })).toBe("Sumiu");
    expect(catalogoDeMotivos(DAQUI, [DAQUI, OUTRA])).toEqual([
      { rotulo: "Preço", selecionado: true, daOrigem: true },
      { rotulo: "Sumiu", selecionado: false, daOrigem: true },
      { rotulo: "Concorrente", selecionado: false, daOrigem: false },
    ]);
  });

  it("a janela de perder não oferece o inativo", () => {
    expect(semMotivosInativos(["Preço", "Sumiu"], DAQUI)).toEqual(["Preço"]);
  });

  it("gravar: ligar um de fora acrescenta; desligar marca inativo; novo entra no fim", () => {
    expect(gravarMotivos(DAQUI, ["Sumiu", "Concorrente"], ["Sem orçamento"])).toEqual({
      ok: true,
      lostReasons: [
        "Preço",
        { label: "Sumiu", categoria: "Ausência" },
        "Concorrente",
        "Sem orçamento",
      ],
      inativos: ["Preço"],
    });
  });

  it("pelo menos um selecionado; no máximo 50", () => {
    expect(gravarMotivos(DAQUI, [], [])).toEqual({
      ok: false,
      erro: "Para continuar selecione ao menos um motivo de perda.",
    });
    const cheio = { lost_reasons: Array.from({ length: 50 }, (_, i) => `m${i}`) };
    expect(gravarMotivos(cheio, ["m0"], ["novo"])).toEqual({
      ok: false,
      erro: "Uma origem tem no máximo 50 motivos de perda.",
    });
  });
});
