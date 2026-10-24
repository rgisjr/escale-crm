import { describe, expect, it } from "vitest";

import { FILTRO_VAZIO } from "@/lib/campanhas/audiencia";
import {
  POS_ENVIO_PADRAO,
  PUBLICO_VAZIO,
  assistenteDaLinha,
  assistenteSchema,
  colunasDoAssistente,
  mensagemSchema,
  posEnvioSchema,
  type Assistente,
  type LinhaDoAssistente,
  type MensagemDeModelo,
} from "@/lib/escale/campanhas/assistente";
import {
  contagemResolvida,
  corpoComValores,
  entradaDoEnvio,
  tokensDoModelo,
  trechoDaVariavel,
  valoresDoModelo,
  variaveisDoCorpo,
} from "@/lib/escale/campanhas/modelo";
import { comAvulsos, comSelecao, publicoVazio, semContato } from "@/lib/escale/campanhas/publico";

const NUMERO = "aaaaaaaa-0000-4000-8000-000000000001";
const C1 = "bbbbbbbb-0000-4000-8000-000000000001";
const C2 = "bbbbbbbb-0000-4000-8000-000000000002";
const ORIGEM = "cccccccc-0000-4000-8000-000000000001";
const ETAPA = "cccccccc-0000-4000-8000-000000000002";

const MODELO: MensagemDeModelo = {
  tipo: "modelo",
  nome: "msg1_ancca",
  idioma: "pt_BR",
  categoria: "MARKETING",
  corpo: "Oi, {{1}}! Tudo bem? {{2}}, aqui é a Naiara.",
  variaveis: {
    "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null },
    "2": { fonte: "campo", campo: "saudacao", alternativo: null },
  },
};

const BASE: Assistente = {
  nome: "Reativação de junho",
  numeroId: NUMERO,
  mensagem: { tipo: "texto", texto: "Olá {{primeiro_nome}}" },
  quando: { modo: "agora" },
  baseLegal: "consent",
  lia: null,
  publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] },
  posEnvio: POS_ENVIO_PADRAO,
  agenteId: null,
  ritmo: {},
  numerosExtras: [],
};

describe("assistenteSchema", () => {
  it("aceita o assistente completo", () => {
    expect(assistenteSchema.safeParse(BASE).success).toBe(true);
  });

  it("nome de 3 a 80 (a Clint)", () => {
    expect(assistenteSchema.safeParse({ ...BASE, nome: "ab" }).success).toBe(false);
    expect(assistenteSchema.safeParse({ ...BASE, nome: "x".repeat(81) }).success).toBe(false);
    expect(assistenteSchema.safeParse({ ...BASE, nome: "x".repeat(80) }).success).toBe(true);
  });

  it("interesse legítimo exige a LIA", () => {
    expect(assistenteSchema.safeParse({ ...BASE, baseLegal: "legitimate_interest" }).success).toBe(
      false,
    );
    expect(
      assistenteSchema.safeParse({ ...BASE, baseLegal: "legitimate_interest", lia: "LIA-7" })
        .success,
    ).toBe(true);
  });

  it("o número principal não entra como extra", () => {
    expect(assistenteSchema.safeParse({ ...BASE, numerosExtras: [NUMERO] }).success).toBe(false);
  });

  it("origem e etapa andam juntas; dono do negócio só com origem", () => {
    expect(posEnvioSchema.safeParse({ ...POS_ENVIO_PADRAO, origemId: ORIGEM }).success).toBe(false);
    expect(
      posEnvioSchema.safeParse({ ...POS_ENVIO_PADRAO, origemId: ORIGEM, etapaId: ETAPA }).success,
    ).toBe(true);
    expect(posEnvioSchema.safeParse({ ...POS_ENVIO_PADRAO, donoDoNegocio: true }).success).toBe(
      false,
    );
  });

  it("variável do modelo: campo do CRM conhecido ou valor fixo", () => {
    const comCampo = (campo: string) =>
      mensagemSchema.safeParse({
        ...MODELO,
        variaveis: { "1": { fonte: "campo", campo, alternativo: null } },
      }).success;
    expect(comCampo("contato.cidade")).toBe(true);
    expect(comCampo("lead.gancho")).toBe(true);
    expect(comCampo("sobrenome")).toBe(false);
    expect(
      mensagemSchema.safeParse({ ...MODELO, variaveis: { "1": { fonte: "fixo", valor: "" } } })
        .success,
    ).toBe(false);
  });
});

describe("colunasDoAssistente e assistenteDaLinha", () => {
  it("texto livre: o corpo é o texto; sem origem, funil e etapa nulos; agora, sem agenda", () => {
    const c = colunasDoAssistente(BASE);
    expect(c).toMatchObject({
      name: "Reativação de junho",
      channel_session_id: NUMERO,
      message_body: "Olá {{primeiro_nome}}",
      base_legal: "consent",
      lia_ref: null,
      audience_filter: FILTRO_VAZIO,
      pipeline_id: null,
      stage_id: null,
      escale_quando: null,
    });
    expect(c.escale_mensagem).toEqual(BASE.mensagem);
    expect(c.escale_publico).toEqual(BASE.publico);
  });

  it("modelo: o corpo é o do modelo; a origem vira o funil da resposta; agendar guarda a hora", () => {
    const c = colunasDoAssistente({
      ...BASE,
      mensagem: MODELO,
      quando: { modo: "agendar", em: "2026-11-20T15:00:00.000Z" },
      posEnvio: { ...POS_ENVIO_PADRAO, origemId: ORIGEM, etapaId: ETAPA },
    });
    expect(c).toMatchObject({
      message_body: MODELO.corpo,
      pipeline_id: ORIGEM,
      stage_id: ETAPA,
      escale_quando: "2026-11-20T15:00:00.000Z",
    });
  });

  const linha = (extra: Partial<LinhaDoAssistente> = {}): LinhaDoAssistente => ({
    id: "dddddddd-0000-4000-8000-000000000001",
    status: "draft",
    name: "Antiga",
    channel_session_id: NUMERO,
    message_body: "Oi {{nome}}",
    base_legal: "consent",
    lia_ref: null,
    agent_id: null,
    intervalo_segundos: 60,
    janela_inicio_hora: null,
    janela_fim_hora: null,
    teto_diario: null,
    teto_horario: null,
    escale_mensagem: null,
    escale_publico: null,
    escale_pos_envio: null,
    escale_quando: null,
    ...extra,
  });

  it("rascunho do formulário antigo: o texto vem, o público começa vazio e avisa", () => {
    const { assistente, publicoAntigo } = assistenteDaLinha(linha(), []);
    expect(assistente.mensagem).toEqual({ tipo: "texto", texto: "Oi {{nome}}" });
    expect(assistente.publico).toEqual(PUBLICO_VAZIO);
    expect(assistente.ritmo.intervalo_segundos).toBe(60);
    expect(publicoAntigo).toBe(true);
  });

  it("rascunho da casca volta inteiro", () => {
    const c = colunasDoAssistente({
      ...BASE,
      mensagem: MODELO,
      quando: { modo: "agendar", em: "2026-11-20T15:00:00.000Z" },
    });
    const { assistente, publicoAntigo } = assistenteDaLinha(
      linha({
        escale_mensagem: c.escale_mensagem,
        escale_publico: c.escale_publico,
        escale_pos_envio: c.escale_pos_envio,
        escale_quando: "2026-11-20T15:00:00.000Z",
      }),
      [],
    );
    expect(assistente.mensagem).toEqual(MODELO);
    expect(assistente.quando).toEqual({ modo: "agendar", em: "2026-11-20T15:00:00.000Z" });
    expect(publicoAntigo).toBe(false);
  });
});

describe("modelo", () => {
  it("as variáveis do corpo, na ordem e sem repetir", () => {
    expect(variaveisDoCorpo("{{2}} e {{1}} e {{2}}")).toEqual(["2", "1"]);
  });

  it("os tokens que o modelo usa (para buscar os campos personalizados)", () => {
    expect(
      tokensDoModelo({
        ...MODELO,
        variaveis: { "1": { fonte: "campo", campo: "lead.gancho", alternativo: null } },
      }),
    ).toContain("{{lead.gancho}}");
  });

  it("valores: o campo, a saudação literal até o envio, o alternativo e a falta", () => {
    expect(valoresDoModelo(MODELO, { nome: "Fernanda Koinwascki" })).toEqual({
      valores: { "1": "Fernanda", "2": "{{saudacao}}" },
      faltando: [],
    });
    expect(valoresDoModelo(MODELO, { nome: "" }).faltando).toEqual(["1"]);
    const comAlternativo: MensagemDeModelo = {
      ...MODELO,
      variaveis: {
        ...MODELO.variaveis,
        "1": { fonte: "campo", campo: "primeiro_nome", alternativo: "cliente" },
      },
    };
    expect(valoresDoModelo(comAlternativo, { nome: "" }).valores["1"]).toBe("cliente");
    const fixo: MensagemDeModelo = {
      ...MODELO,
      variaveis: { "1": { fonte: "fixo", valor: "time" } },
    };
    expect(valoresDoModelo(fixo, { nome: null }).valores).toEqual({ "1": "time" });
  });

  it("o corpo com os valores e o trecho em volta da variável", () => {
    expect(corpoComValores("Oi, {{1}}!", { "1": "Ana" })).toBe("Oi, Ana!");
    expect(corpoComValores("Oi, {{1}} {{3}}", { "1": "Ana" })).toBe("Oi, Ana {{3}}");
    expect(trechoDaVariavel("Bom dia! Oi, {{1}}! Tudo bem? Aqui é a Naiara.", "1")).toBe(
      "…om dia! Oi, {{1}}! Tudo bem?…",
    );
  });

  it("quantas variáveis estão resolvidas", () => {
    expect(contagemResolvida(["1", "2"], MODELO.variaveis)).toEqual({ feitas: 2, total: 2 });
    expect(contagemResolvida(["1", "2"], { "1": { fonte: "fixo", valor: " " } })).toEqual({
      feitas: 0,
      total: 2,
    });
  });

  it("entrada do envio: texto livre continua texto; modelo vira template com a saudação da hora", () => {
    const quando = { agora: new Date("2026-11-20T12:00:00.000Z"), fuso: "America/Sao_Paulo" };
    expect(entradaDoEnvio(null, "Oi Ana", { nome: "Ana" }, quando, "Ana")).toEqual({
      type: "text",
      body: "Oi Ana",
    });
    const e = entradaDoEnvio(
      MODELO,
      "Oi, Ana! {{saudacao}}",
      { nome: "Ana", modelo: { "1": "Ana", "2": "{{saudacao}}" } },
      quando,
      "Ana",
    );
    expect(e).toEqual({
      type: "template",
      body: "Oi, Ana! {{saudacao}}",
      template_name: "msg1_ancca",
      template_language: "pt_BR",
      template_values: { "1": "Ana", "2": "Bom dia" },
    });
  });
});

describe("público", () => {
  it("vazio, avulsos sem repetir, remover e trocar a seleção", () => {
    expect(publicoVazio(PUBLICO_VAZIO)).toBe(true);
    const a = comAvulsos(PUBLICO_VAZIO, [C1, C1, C2]);
    expect(a.avulsos).toEqual([C1, C2]);
    const r = semContato(a, C1);
    expect(r.avulsos).toEqual([C2]);
    expect(r.removidos).toEqual([C1]);
    expect(comAvulsos(r, [C1]).removidos).toEqual([]);
    const s = comSelecao(r, { tipo: "filtro", v: "todos", quantidade: null, excluidos: [] });
    expect(s.selecao?.tipo).toBe("filtro");
    expect(publicoVazio(s)).toBe(false);
  });
});
