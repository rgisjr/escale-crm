import { describe, expect, it } from "vitest";

import {
  COLUNAS_PADRAO,
  cartoesDoTopo,
  colunasDoTexto,
  comparacaoDoBenchmark,
  etapasDoFunil,
  fatiasDaRosca,
  leuSemResposta,
  podeTirarDaLista,
  porcentoDoMotivo,
  reaisBr,
  resumoDosMotivos,
  rodapeDoSumario,
  rotuloDaHora,
  seloDasFalhas,
  textoDoIntervalo,
  textoDoTempoMediano,
  textoDoTotal,
  varreDias,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import {
  ROTULO_DO_FILTRO_DE_SITUACAO,
  SITUACOES_DO_FILTRO,
  compilarFiltrosDeDestinatarios,
  filtrosDeDestinatariosDoTexto,
  temFiltroDeDestinatarios,
  textoDosFiltrosDeDestinatarios,
} from "@/lib/escale/campanhas/detalhe/filtros";
import {
  ROTULO_DA_CATEGORIA,
  modeloDaCampanha,
  partesDaMensagem,
  siglaDoIdioma,
} from "@/lib/escale/campanhas/detalhe/mensagem";
import {
  textoDaExclusao,
  textoDoMotivo,
  textoDoMotivoDaLinha,
} from "@/lib/escale/campanhas/detalhe/motivos";
import {
  camposDoRitmo,
  textoDaBaseLegal,
  textosDoRitmo,
  validarRitmo,
} from "@/lib/escale/campanhas/detalhe/ritmo";
import type { SumarioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";

const t = (s: string) => s;
const SP = "America/Sao_Paulo";
const SUMARIO: SumarioDaCampanha = {
  adicionados: 30,
  enviados: 26,
  entregues: 23,
  lidas: 16,
  respondidas: 10,
  leuSemResposta: 6,
  erros: 4,
  naoEnviados: 0,
  aguardando: 0,
  foraDaLista: 2,
};

describe("cartões, funil e rosca (N3)", () => {
  it("os 4 cartões do topo: números e % sobre enviados com o complemento", () => {
    const c = cartoesDoTopo(SUMARIO);
    expect(c.map((x) => x.rotulo)).toEqual([
      "Adicionados p/ envio",
      "Enviados",
      "Entregues",
      "Respondidas",
    ]);
    expect(c.map((x) => x.valor)).toEqual(["30", "26", "88%", "38%"]);
    expect(c.map((x) => x.complemento)).toEqual([undefined, undefined, "23", "10"]);
    expect(cartoesDoTopo({ ...SUMARIO, enviados: 0 })[2]!.valor).toBe("—");
  });

  it("o funil em % sobre enviados", () => {
    expect(etapasDoFunil(SUMARIO).map((e) => [e.rotulo, e.quantidade, e.porcento])).toEqual([
      ["Enviados", 26, 100],
      ["Entregues", 23, 88],
      ["Lidas", 16, 62],
      ["Respondidas", 10, 38],
    ]);
    expect(etapasDoFunil({ ...SUMARIO, enviados: 0 }).every((e) => e.porcento === null)).toBe(true);
  });

  it("a rosca soma os adicionados; 'Aguardando envio' só quando houver", () => {
    expect(fatiasDaRosca(SUMARIO).map((f) => [f.chave, f.quantidade])).toEqual([
      ["lida", 16],
      ["entregue", 7],
      ["enviado", 3],
      ["erro", 4],
      ["nao_enviado", 0],
    ]);
    expect(fatiasDaRosca({ ...SUMARIO, aguardando: 5 }).at(-1)).toEqual({
      chave: "aguardando",
      quantidade: 5,
    });
  });

  it("leu e não respondeu: % sobre enviados", () => {
    expect(leuSemResposta(SUMARIO)).toEqual({ porcento: 23, quantidade: 6 });
  });
});

describe("motivos do erro (C5)", () => {
  const motivos = [
    { codigo: "131049", quantidade: 2 },
    { codigo: null, quantidade: 1 },
    { codigo: "130429", quantidade: 1 },
  ];

  it("o resumo, o selo e o percentual sobre as falhas da amostra", () => {
    expect(resumoDosMotivos(motivos, t)).toBe("3 motivos em 4 falhas de envio");
    expect(resumoDosMotivos([{ codigo: "x", quantidade: 1 }], t)).toBe(
      "1 motivo em 1 falha de envio",
    );
    expect(seloDasFalhas(4, t)).toBe("4 falhas");
    expect(seloDasFalhas(1, t)).toBe("1 falha");
    expect(porcentoDoMotivo(2, motivos)).toBe(50);
  });

  it("o texto de cada código; desconhecido mostra o código; nada atravessa protótipo", () => {
    expect(textoDoMotivo("131049", t)).toBe("Meta optou por não entregar");
    expect(textoDoMotivo(null, t)).toBe("Sem detalhe do erro registrado");
    expect(textoDoMotivo("sem_codigo", t)).toBe("Sem detalhe do erro registrado");
    expect(textoDoMotivo("999", t)).toBe("Erro do canal: 999");
    expect(textoDoMotivo("constructor", t)).toBe("Erro do canal: constructor");
    expect(textoDaExclusao("opt_out", t)).toBe("Pediu para não receber mensagens");
    expect(textoDoMotivoDaLinha("erro", "131026", t)).toBe(
      "Destinatário incapaz de receber a mensagem",
    );
    expect(textoDoMotivoDaLinha("fora_da_lista", "duplicado", t)).toBe(
      "Mesmo telefone de outro contato da lista",
    );
    expect(textoDoMotivoDaLinha("lida", null, t)).toBeNull();
  });
});

describe("resultado, tempo e benchmark (C7, C9)", () => {
  it("tempo mediano em min, h ou dias, com vírgula", () => {
    expect(textoDoTempoMediano(null, t)).toBe("Não foi possível calcular o tempo de resposta.");
    expect(textoDoTempoMediano(20, t)).toBe("1 min");
    expect(textoDoTempoMediano(90, t)).toBe("2 min");
    expect(textoDoTempoMediano(5400, t)).toBe("1,5 h");
    expect(textoDoTempoMediano(129_600, t)).toBe("1,5 dias");
  });

  it("benchmark: média e esta campanha em inteiros; abaixo quando menor", () => {
    const base = {
      negocios: 0,
      valorAbertoCentavos: 0,
      valorGanhoCentavos: 0,
      medianaSegundos: null,
    };
    expect(comparacaoDoBenchmark({ ...base, benchmark: 0.43, taxaDaCampanha: 0.3333 })).toEqual({
      media: 43,
      estaCampanha: 33,
      abaixo: true,
    });
    expect(comparacaoDoBenchmark({ ...base, benchmark: 0.2, taxaDaCampanha: 0.2 }).abaixo).toBe(
      false,
    );
    expect(comparacaoDoBenchmark({ ...base, benchmark: null, taxaDaCampanha: 0.3333 })).toEqual({
      media: null,
      estaCampanha: 33,
      abaixo: null,
    });
  });

  it("R$ no formato brasileiro; sem valor, o traço", () => {
    expect(reaisBr(1_468_092)).toBe("R$ 14.680,92");
    expect(reaisBr(0)).toBe("R$ 0,00");
    expect(reaisBr(null)).toBe("—");
  });
});

describe("horas, rodapé e regras de tela", () => {
  it("a hora do ritmo; com mais de um dia, o dia junto", () => {
    expect(rotuloDaHora("2026-09-10T12:00:00", false)).toBe("12:00");
    expect(rotuloDaHora("2026-09-10T12:00:00", true)).toBe("10/09 12:00");
    expect(
      varreDias([
        { hora: "2026-09-10T12:00:00", envios: 1 },
        { hora: "2026-09-10T13:00:00", envios: 1 },
      ]),
    ).toBe(false);
    expect(
      varreDias([
        { hora: "2026-09-10T23:00:00", envios: 1 },
        { hora: "2026-09-11T00:00:00", envios: 1 },
      ]),
    ).toBe(true);
  });

  it("o rodapé: enviado em, agendada para ou criado em", () => {
    const base = { iniciadaEm: null, agendadaPara: null, criadaEm: "2026-10-01T12:00:00Z" };
    expect(rodapeDoSumario({ ...base, iniciadaEm: "2026-09-10T15:39:00Z" }, t, SP)).toBe(
      "Enviado em 10/09/2026 12:39",
    );
    expect(rodapeDoSumario({ ...base, agendadaPara: "2026-10-20T13:00:00Z" }, t, SP)).toBe(
      "Agendada para 20/10/2026 10:00",
    );
    expect(rodapeDoSumario(base, t, SP)).toBe("Criado em 01/10/2026 09:00");
  });

  it("tirar da lista só antes de qualquer envio", () => {
    expect(podeTirarDaLista("draft", 0)).toBe(true);
    expect(podeTirarDaLista("ready", 0)).toBe(true);
    expect(podeTirarDaLista("scheduled", 3)).toBe(false);
    expect(podeTirarDaLista("running", 0)).toBe(false);
  });

  it("as colunas guardadas: na ordem fixa, só as conhecidas; o resto volta ao padrão", () => {
    expect(colunasDoTexto(null)).toEqual(COLUNAS_PADRAO);
    expect(colunasDoTexto('["motivo","telefone"]')).toEqual(["telefone", "motivo"]);
    expect(colunasDoTexto("[]")).toEqual(COLUNAS_PADRAO);
    expect(colunasDoTexto("{")).toEqual(COLUNAS_PADRAO);
    expect(colunasDoTexto('["xyz"]')).toEqual(COLUNAS_PADRAO);
  });

  it("'1 a 20 de 30 contatos' e a contagem", () => {
    expect(textoDoIntervalo(1, 20, 30, t)).toBe("1 a 20 de 30 contatos");
    expect(textoDoIntervalo(2, 20, 30, t)).toBe("21 a 30 de 30 contatos");
    expect(textoDoIntervalo(1, 20, 0, t)).toBe("0 contatos");
    expect(textoDoTotal(1, t)).toBe("1 contato");
    expect(textoDoTotal(1500, t)).toBe("1.500 contatos");
  });
});

describe("filtros dos Detalhes (N9)", () => {
  it("as situações na ordem da Clint, com as nossas no fim", () => {
    expect(SITUACOES_DO_FILTRO.map((s) => ROTULO_DO_FILTRO_DE_SITUACAO[s])).toEqual([
      "Enviado",
      "Entregue",
      "Lida",
      "Respondido",
      "Erro",
      "Não enviado",
      "Aguardando envio",
      "Fora da lista",
    ]);
  });

  it("vai e volta pelo texto; ruim é null; vazio não filtra", () => {
    const f = { busca: "Elza", situacoes: ["lida" as const], motivos: ["131049"] };
    expect(filtrosDeDestinatariosDoTexto(textoDosFiltrosDeDestinatarios(f))).toEqual(f);
    expect(filtrosDeDestinatariosDoTexto(undefined)).toEqual({});
    expect(filtrosDeDestinatariosDoTexto('{"situacoes":["xyz"]}')).toBeNull();
    expect(temFiltroDeDestinatarios({ busca: "  ", situacoes: [] })).toBe(false);
  });

  it("compilar: o padrão do nome e os dígitos do telefone (3 ou mais)", () => {
    expect(compilarFiltrosDeDestinatarios({ busca: "(53) 98455" })).toEqual({
      padrao: "%(53) 98455%",
      digitos: "5398455",
    });
    expect(
      compilarFiltrosDeDestinatarios({ busca: "Elza", situacoes: ["erro"], motivos: ["131049"] }),
    ).toEqual({
      padrao: "%Elza%",
      situacoes: ["erro"],
      motivos: ["131049"],
    });
    expect(compilarFiltrosDeDestinatarios({})).toEqual({});
  });
});

describe("mensagem e modelo (N7)", () => {
  it("as variáveis viram chip; raiz desconhecida fica literal", () => {
    expect(
      partesDaMensagem("Oi, {{primeiro_nome}}! {{sobrenome}} {{lead.servico_desejado}} {{1}}"),
    ).toEqual([
      { tipo: "texto", texto: "Oi, " },
      { tipo: "variavel", chave: "primeiro_nome", rotulo: "Primeiro nome", traduzivel: true },
      { tipo: "texto", texto: "! {{sobrenome}} " },
      {
        tipo: "variavel",
        chave: "lead.servico_desejado",
        rotulo: "servico desejado",
        traduzivel: false,
      },
      { tipo: "texto", texto: " " },
      { tipo: "variavel", chave: "1", rotulo: "{{1}}", traduzivel: false },
    ]);
    expect(partesDaMensagem(null)).toEqual([]);
  });

  it("o modelo da 8B: nome, idioma e categoria; texto livre, null", () => {
    const modelo = {
      tipo: "modelo",
      nome: "msg1_ancca",
      idioma: "pt_BR",
      categoria: "MARKETING",
      corpo: "Oi, {{1}}!",
      variaveis: {},
    };
    expect(modeloDaCampanha({ escale_mensagem: modelo })).toEqual({
      nome: "msg1_ancca",
      idioma: "pt_BR",
      categoria: "MARKETING",
    });
    expect(modeloDaCampanha({})).toBeNull();
    expect(modeloDaCampanha({ escale_mensagem: { tipo: "texto", texto: "Oi" } })).toBeNull();
    expect(siglaDoIdioma("pt_BR")).toBe("BR");
    expect(siglaDoIdioma("en")).toBe("EN");
    expect(siglaDoIdioma(null)).toBeNull();
    expect(ROTULO_DA_CATEGORIA.MARKETING).toBe("Marketing");
  });
});

describe("ritmo e base legal (N8)", () => {
  it("valida: vazio herda do número; faixas do CHECK da 0375", () => {
    expect(
      validarRitmo({
        intervalo: "30",
        tetoDiario: "",
        tetoHorario: "20",
        janelaInicio: "8",
        janelaFim: "20",
      }),
    ).toEqual({
      ok: true,
      corpo: {
        intervalo_segundos: 30,
        teto_diario: null,
        teto_horario: 20,
        janela_inicio_hora: 8,
        janela_fim_hora: 20,
      },
    });
    const vazio = {
      intervalo: "",
      tetoDiario: "",
      tetoHorario: "",
      janelaInicio: "",
      janelaFim: "",
    };
    expect(validarRitmo({ ...vazio, intervalo: "0" })).toEqual({
      ok: false,
      erro: "O intervalo vai de 1 a 86.400 segundos.",
    });
    expect(validarRitmo({ ...vazio, intervalo: "abc" })).toEqual({
      ok: false,
      erro: "O intervalo vai de 1 a 86.400 segundos.",
    });
    expect(validarRitmo({ ...vazio, tetoDiario: "10001" })).toEqual({
      ok: false,
      erro: "Os tetos vão de 1 a 10.000 mensagens.",
    });
    expect(validarRitmo({ ...vazio, janelaInicio: "8" })).toEqual({
      ok: false,
      erro: "Preencha o início e o fim da janela, ou deixe os dois vazios.",
    });
    expect(validarRitmo({ ...vazio, janelaInicio: "20", janelaFim: "8" })).toEqual({
      ok: false,
      erro: "A janela precisa terminar depois de começar.",
    });
  });

  it("os textos e a ida e volta dos campos", () => {
    const r = {
      intervaloSegundos: 30,
      tetoDiario: null,
      tetoHorario: 1500,
      janelaInicioHora: 8,
      janelaFimHora: 20,
    };
    expect(textosDoRitmo(r, t).map((x) => x.valor)).toEqual([
      "30 s",
      "O do número",
      "1.500",
      "08h às 20h",
    ]);
    expect(camposDoRitmo(r)).toEqual({
      intervalo: "30",
      tetoDiario: "",
      tetoHorario: "1500",
      janelaInicio: "8",
      janelaFim: "20",
    });
    expect(textoDaBaseLegal("consent", null, t)).toBe("Consentimento");
    expect(textoDaBaseLegal("legitimate_interest", "LIA-2026-01", t)).toBe(
      "Interesse legítimo (LIA-2026-01)",
    );
  });
});
