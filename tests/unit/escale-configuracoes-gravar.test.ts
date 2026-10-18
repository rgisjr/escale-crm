import { describe, expect, it } from "vitest";

import {
  SECOES_DO_ADMINISTRADOR,
  aplicarConfiguracoes,
  patchDasConfiguracoesSchema,
  secoesDoPatch,
} from "@/lib/escale/configuracoes/gravar";
import { montarConfiguracoes, type ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import {
  LIMITE_NOVO,
  algoMudou,
  alertaDaTela,
  pedidoDoSalvar,
  rascunhoInicial,
} from "@/lib/escale/configuracoes/rascunho";

const E1 = "aaaaaaaa-0000-4000-8000-000000000001";
const E2 = "aaaaaaaa-0000-4000-8000-000000000002";
const EG = "aaaaaaaa-0000-4000-8000-000000000003";
const SETTINGS = {
  fields: [{ key: "proposta", label: "Proposta", type: "text" }],
  lost_reasons: ["Preço", "Sumiu"],
  canonical_tags: ["meta_ads"],
};
const ETAPAS = { abertas: [E1, E2], vivas: [E1, E2, EG] };

describe("o corpo do PATCH", () => {
  it("seções opcionais, pelo menos uma, sem chave a mais", () => {
    expect(
      patchDasConfiguracoesSchema.safeParse({ gerais: { moeda: "USD", tags_padrao: [], visualizacao: "own_and_unassigned" } }).success,
    ).toBe(true);
    expect(patchDasConfiguracoesSchema.safeParse({}).success).toBe(false);
    expect(
      patchDasConfiguracoesSchema.safeParse({ gerais: { moeda: "XYZ", tags_padrao: [], visualizacao: "own_and_unassigned" } }).success,
    ).toBe(false);
    expect(patchDasConfiguracoesSchema.safeParse({ outra: 1 }).success).toBe(false);
  });
  it("motivos e campos são do administrador", () => {
    expect([...SECOES_DO_ADMINISTRADOR].sort()).toEqual(["campos", "motivos"]);
    expect(
      secoesDoPatch({ gerais: { moeda: null, tags_padrao: [], visualizacao: "own_and_unassigned" }, campos: { regras: [] } }),
    ).toEqual(["gerais", "campos"]);
  });
});

describe("aplicar: só as chaves das seções mudam, todas juntas", () => {
  it("gerais e alerta no mesmo pedido, e o resto do settings intacto", () => {
    const geral = {
      atencao: 4,
      atencao_unidade: "horas" as const,
      critico: 8,
      critico_unidade: "horas" as const,
    };
    const r = aplicarConfiguracoes(
      SETTINGS,
      { gerais: { moeda: "USD", tags_padrao: [" VIP "], visualizacao: "own_and_unassigned" }, alerta: { geral, etapas: {} } },
      ETAPAS,
    );
    expect(r).toEqual({
      ok: true,
      settings: {
        ...SETTINGS,
        escale_moeda: "USD",
        escale_tags_padrao: ["vip"],
        escale_visualizacao: "own_and_unassigned",
        escale_alerta_tempo: { geral, etapas: {} },
      },
    });
  });
  it("moeda null e tags vazias apagam as chaves", () => {
    const antes = { ...SETTINGS, escale_moeda: "USD", escale_tags_padrao: ["vip"] };
    expect(
      aplicarConfiguracoes(antes, { gerais: { moeda: null, tags_padrao: [], visualizacao: "own_and_unassigned" } }, ETAPAS),
    ).toEqual({ ok: true, settings: { ...SETTINGS, escale_visualizacao: "own_and_unassigned" } });
  });
  it("a tag do sistema e mais de 10 tags são recusadas", () => {
    expect(
      aplicarConfiguracoes(SETTINGS, { gerais: { moeda: null, tags_padrao: ["Cliente"], visualizacao: "own_and_unassigned" } }, ETAPAS),
    ).toEqual({
      ok: false,
      erro: "A tag «cliente» é do sistema. Escolha outra.",
    });
  });
  it("motivos e campos", () => {
    const r = aplicarConfiguracoes(
      SETTINGS,
      {
        motivos: { selecionados: ["Sumiu"], novos: [] },
        campos: { regras: [{ campo: "proposta", quando: "ao_sair", etapas: [E1], status: [] }] },
      },
      ETAPAS,
    );
    expect(r.ok && r.settings).toMatchObject({
      escale_motivos_inativos: ["Preço"],
      escale_ao_sair: { proposta: [E1] },
    });
  });
  it("o primeiro erro de regra volta como veredito", () => {
    expect(
      aplicarConfiguracoes(SETTINGS, { motivos: { selecionados: [], novos: [] } }, ETAPAS),
    ).toEqual({
      ok: false,
      erro: "Para continuar selecione ao menos um motivo de perda.",
    });
  });
});

const CONFIG: ConfiguracoesDaOrigem = montarConfiguracoes({
  pipeline: {
    id: "p1",
    name: "Leads",
    group_id: "g1",
    is_default: false,
    settings: { ...SETTINGS, escale_tags_padrao: ["vip"] },
  },
  etapas: [
    { id: E2, name: "Proposta", position: 2, is_won: false, is_lost: false },
    { id: E1, name: "Novo", position: 1, is_won: false, is_lost: false },
    { id: EG, name: "Ganho", position: 3, is_won: true, is_lost: false },
  ],
  catalogo: [{ lost_reasons: ["Concorrente"] }],
  moedaDaOrganizacao: "BRL",
  visualizacaoDaOrganizacao: "own_and_unassigned",
  grupo: null,
  podeAdministrar: true,
});

describe("montar", () => {
  it("etapas em ordem, catálogo de motivos, regras e moeda da organização", () => {
    expect(CONFIG.etapas.map((e) => e.name)).toEqual(["Novo", "Proposta", "Ganho"]);
    expect(CONFIG.motivos.map((m) => [m.rotulo, m.selecionado])).toEqual([
      ["Preço", true],
      ["Sumiu", true],
      ["Concorrente", false],
    ]);
    expect(CONFIG.campos.map((c) => c.campo)).toEqual(["proposta"]);
    expect(CONFIG.moedaDaOrganizacao).toBe("BRL");
  });

  it("a regra em vigor e as listas: a da origem vence; sem ela, a da organização", () => {
    expect(CONFIG.visualizacao).toBe("own_and_unassigned");
    expect(CONFIG.visualizacaoDaOrganizacao).toBe("own_and_unassigned");
    expect(CONFIG.fork.visualizacao).toBeNull();
    expect(CONFIG.fork.pessoas).toEqual([]);
    expect(CONFIG.pessoasDoGrupo).toEqual([]);
  });
});

describe("permissoes", () => {
  const PESSOA = "11111111-1111-4111-8111-111111111111";
  it("grava só membros ativos, sem repetição; lista vazia apaga a chave", () => {
    const membros = [PESSOA];
    const ok = aplicarConfiguracoes({}, { permissoes: { pessoas: [PESSOA, PESSOA] } }, { ...ETAPAS, membros });
    expect(ok).toEqual({ ok: true, settings: { escale_pessoas: membros } });
    const vazio = aplicarConfiguracoes({ escale_pessoas: membros }, { permissoes: { pessoas: [] } }, { ...ETAPAS, membros });
    expect(vazio).toEqual({ ok: true, settings: {} });
    const estranho = aplicarConfiguracoes(
      {},
      { permissoes: { pessoas: ["22222222-2222-4222-8222-222222222222"] } },
      { ...ETAPAS, membros },
    );
    expect(estranho).toEqual({ ok: false, erro: "Este usuário não faz parte da equipe." });
  });
});

describe("rascunho da janela", () => {
  it("nasce igual à origem e não mudou nada", () => {
    const r = rascunhoInicial(CONFIG);
    expect(r.gerais).toEqual({ nome: "Leads", grupo: "g1", moeda: "BRL", tags: ["vip"], visualizacao: "own_and_unassigned" });
    expect(algoMudou(r, CONFIG)).toBe(false);
    expect(pedidoDoSalvar(r, CONFIG)).toEqual({ ok: true, mudancaDaOrigem: {}, patch: null });
  });

  it("só o que mudou vai no pedido; moeda igual à da organização vira null", () => {
    const r = rascunhoInicial(CONFIG);
    r.gerais.nome = "Leads 2026";
    r.gerais.moeda = "USD";
    r.motivos.selecionados = ["Preço"];
    expect(algoMudou(r, CONFIG)).toBe(true);
    expect(pedidoDoSalvar(r, CONFIG)).toEqual({
      ok: true,
      mudancaDaOrigem: { name: "Leads 2026" },
      patch: {
        gerais: { moeda: "USD", tags_padrao: ["vip"], visualizacao: "own_and_unassigned" },
        motivos: { selecionados: ["Preço"], novos: [] },
      },
    });
    r.gerais.moeda = "BRL";
    expect(pedidoDoSalvar(r, CONFIG)).toMatchObject({
      patch: { motivos: { selecionados: ["Preço"], novos: [] } },
    });
  });

  it("nome vazio e limite de alerta inválido barram o salvar, dizendo a seção", () => {
    const r = rascunhoInicial(CONFIG);
    r.gerais.nome = "  ";
    expect(pedidoDoSalvar(r, CONFIG)).toEqual({
      ok: false,
      erro: "Nome é um campo obrigatório!",
      secao: "gerais",
    });
    const r2 = rascunhoInicial(CONFIG);
    r2.alerta.geral = { ...LIMITE_NOVO, atencao: "8", critico: "4" };
    expect(pedidoDoSalvar(r2, CONFIG)).toEqual({
      ok: false,
      erro: "O limite crítico deve ser maior que o limite de atenção.",
      secao: "alerta",
    });
  });

  it("alerta da tela: texto vira número; campo vazio é limite vazio", () => {
    expect(
      alertaDaTela({ geral: { ...LIMITE_NOVO, atencao: "", critico: "2" }, excecoes: [] }),
    ).toEqual({
      ok: true,
      alerta: {
        geral: { atencao: null, atencao_unidade: "horas", critico: 2, critico_unidade: "horas" },
        etapas: {},
      },
    });
    expect(
      alertaDaTela({
        geral: null,
        excecoes: [{ etapa: E2, limite: { ...LIMITE_NOVO, atencao: "", critico: "" } }],
      }),
    ).toEqual({
      ok: false,
      erro: "Preencha pelo menos um limite na exceção ou remova-a antes de salvar.",
      etapa: E2,
    });
  });

  it("alerta da tela: regra geral vazia tem texto próprio, sem falar de exceção", () => {
    expect(
      alertaDaTela({ geral: { ...LIMITE_NOVO, atencao: "", critico: "" }, excecoes: [] }),
    ).toEqual({
      ok: false,
      erro: "Preencha pelo menos um limite da regra geral ou remova-a antes de salvar.",
      etapa: null,
    });
  });

  it("alerta da tela: texto que não é número usa o teto da unidade escolhida", () => {
    expect(
      alertaDaTela({
        geral: { ...LIMITE_NOVO, atencao: "abc", atencao_unidade: "dias" },
        excecoes: [],
      }),
    ).toMatchObject({ ok: false, erro: "Informe um valor entre 1 e 365.", etapa: null });
    expect(
      alertaDaTela({
        geral: null,
        excecoes: [{ etapa: E2, limite: { ...LIMITE_NOVO, critico: "x", critico_unidade: "minutos" } }],
      }),
    ).toMatchObject({ ok: false, erro: "Informe um valor entre 1 e 525600.", etapa: E2 });
  });
});
