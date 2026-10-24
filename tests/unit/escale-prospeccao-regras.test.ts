import { describe, expect, it } from "vitest";

import {
  custoEmDolar,
  etapasDoFunil,
  ROTULO_DA_SITUACAO,
  segmentosDaProspeccao,
  SITUACOES_QUE_PULSAM,
  subtituloDaProspeccao,
  textoDoPorcento,
  textoDoRitmo,
  textoDoSegmentoDaProspeccao,
  TOM_DA_SITUACAO,
} from "@/lib/escale/prospeccao/apresentacao";
import {
  aplicarAgenteCriado,
  buscaDoRascunho,
  configDoRascunho,
  decimalDoTexto,
  errosDaBusca,
  errosDoPasso,
  inicioDoAssistente,
  inteiroDoTexto,
  numerosDoSeletor,
  RASCUNHO_VAZIO,
  rascunhoDaCampanha,
  rascunhoDaCopia,
  type RascunhoDaProspeccao,
} from "@/lib/escale/prospeccao/assistente";
import {
  consultaDaLista,
  padraoDaBusca,
  situacoesDoTexto,
  temFiltroDaProspeccao,
} from "@/lib/escale/prospeccao/filtros";
import {
  contarMarcadas,
  descartaveis,
  filtrarEmpresas,
  marcavel,
  podeSelecionar,
} from "@/lib/escale/prospeccao/selecao";
import { RAZAO_NAO_SELECIONADA } from "@/lib/prospecting/schema";
import {
  AGENTE,
  BUSCA,
  CONFIG,
  contagem,
  detalhe,
  empresa,
  ETAPA_ENTRADA,
  ETAPA_QUALIFICADOS,
  FUNIL,
  ID,
  linha,
  NUMERO,
  OPCOES,
} from "@/tests/helpers/prospeccao-fixtures";

const t = (s: string) => s;

describe("situação (D3)", () => {
  it("rótulos e tons da Clint onde há par; pulsa enquanto busca ou aborda", () => {
    expect(ROTULO_DA_SITUACAO.completa).toBe("Completo");
    expect(TOM_DA_SITUACAO.erro_na_busca).toBe("vermelho");
    expect([...SITUACOES_QUE_PULSAM].sort()).toEqual(["buscando", "em_progresso"]);
  });

  it("subtítulo: buscando, uma, várias", () => {
    expect(subtituloDaProspeccao(linha({ situacao: "buscando" }), t)).toBe("Buscando empresas");
    expect(subtituloDaProspeccao(linha({ encontradas: 1 }), t)).toBe("1 empresa encontrada");
    expect(subtituloDaProspeccao(linha({ encontradas: 1234 }), t)).toBe(
      "1.234 empresas encontradas",
    );
  });
});

describe("barra de resultado (D5)", () => {
  it("sem encontradas, nenhum segmento", () => {
    expect(segmentosDaProspeccao(contagem())).toEqual([]);
  });

  it("larguras disjuntas sobre as encontradas; a dica diz o acumulado", () => {
    const s = segmentosDaProspeccao(
      contagem({ encontradas: 20, abordadas: 10, responderam: 4, qualificadas: 1, falhas: 2 }),
    );
    expect(s.map((x) => [x.chave, x.largura, x.quantidade, x.porcento])).toEqual([
      ["falhas", 10, 2, 10],
      ["abordadas", 30, 10, 50],
      ["responderam", 15, 4, 20],
      ["qualificadas", 5, 1, 5],
    ]);
    expect(textoDoSegmentoDaProspeccao(s[1]!, t)).toBe("10 abordadas - 50%");
  });

  it("segmento vazio sai da barra", () => {
    const s = segmentosDaProspeccao(contagem({ encontradas: 10, abordadas: 4, responderam: 4 }));
    expect(s.map((x) => x.chave)).toEqual(["responderam"]);
  });
});

describe("funil, percentuais, custo e ritmo (D10)", () => {
  it("funil sobre as encontradas; sem base, null", () => {
    expect(
      etapasDoFunil(
        contagem({ encontradas: 20, abordadas: 10, responderam: 4, qualificadas: 1 }),
        t,
      ).map((e) => e.porcento),
    ).toEqual([100, 50, 20, 5]);
    expect(etapasDoFunil(contagem(), t)[0]!.porcento).toBeNull();
  });

  it("textoDoPorcento e custoEmDolar no formato brasileiro", () => {
    expect(textoDoPorcento(1, 3)).toBe("33%");
    expect(textoDoPorcento(1, 0)).toBe("—");
    expect(custoEmDolar(0.4512)).toBe("US$ 0,45");
    expect(custoEmDolar(1234.5)).toBe("US$ 1.234,50");
    expect(custoEmDolar(null)).toBe("—");
  });

  it("textoDoRitmo", () => {
    expect(textoDoRitmo(10, 15, t)).toBe(
      "10 abordagens em 24 horas, com pelo menos 15 minutos entre elas.",
    );
  });
});

describe("filtros da lista (D7)", () => {
  it("consulta, vazio e padrão escapado", () => {
    expect(temFiltroDaProspeccao({})).toBe(false);
    expect(temFiltroDaProspeccao({ busca: "  " })).toBe(false);
    expect(consultaDaLista({ busca: " clin ", situacoes: ["pausada", "rascunho"] }, 2, 10)).toBe(
      "p=2&n=10&q=clin&s=pausada%2Crascunho",
    );
    expect(padraoDaBusca("50%_a\\b")).toBe("%50\\%\\_a\\\\b%");
  });

  it("situações do texto: vazio, válidas, desconhecida", () => {
    expect(situacoesDoTexto(undefined)).toEqual([]);
    expect(situacoesDoTexto("pausada,rascunho,pausada")).toEqual(["pausada", "rascunho"]);
    expect(situacoesDoTexto("pausada,xyz")).toBeNull();
  });
});

describe("seleção (D10; regras do servidor do original)", () => {
  it("só em rascunho com busca concluída ou pausada", () => {
    expect(podeSelecionar(detalhe({ status: "draft" }))).toBe(true);
    expect(podeSelecionar(detalhe({ status: "paused" }))).toBe(true);
    expect(podeSelecionar(detalhe({ status: "running" }))).toBe(false);
    expect(podeSelecionar(detalhe({ status: "draft", statusDaBusca: "running" }))).toBe(false);
  });

  it("marcável: nova no rascunho; na fila ou desmarcada pelo operador na pausada", () => {
    const rascunho = detalhe({ status: "draft" });
    expect(marcavel(empresa({ status: "new" }), rascunho)).toBe(true);
    const pausada = detalhe({ status: "paused" });
    expect(marcavel(empresa({ status: "queued" }), pausada)).toBe(true);
    expect(marcavel(empresa({ status: "sent" }), pausada)).toBe(false);
    const tirada = empresa({
      status: "skipped",
      selecionada: false,
      erro: RAZAO_NAO_SELECIONADA,
      conversaId: null,
    });
    expect(marcavel(tirada, pausada)).toBe(true);
    expect(
      marcavel(
        tirada,
        detalhe({ status: "paused", config: { ...CONFIG, funnel_entry: "on_start" } }),
      ),
    ).toBe(false);
    expect(
      marcavel(
        empresa({ status: "skipped", selecionada: false, erro: "Sem telefone brasileiro válido." }),
        pausada,
      ),
    ).toBe(false);
  });

  it("descartáveis: desmarcadas sem negócio nem conversa", () => {
    const lista = [
      empresa({ id: "a", status: "new", selecionada: false, negocioId: null, conversaId: null }),
      empresa({
        id: "b",
        status: "skipped",
        selecionada: false,
        erro: RAZAO_NAO_SELECIONADA,
        negocioId: null,
        conversaId: null,
      }),
      empresa({
        id: "c",
        status: "skipped",
        selecionada: false,
        erro: RAZAO_NAO_SELECIONADA,
        negocioId: "l9",
        conversaId: "v9",
      }),
      empresa({ id: "d", status: "new", selecionada: true, negocioId: null, conversaId: null }),
    ];
    expect(descartaveis(lista).map((e) => e.id)).toEqual(["a", "b"]);
    expect(contarMarcadas(lista)).toBe(1);
  });

  it("filtrarEmpresas: desmarcadas escondidas, progresso, nome e telefone", () => {
    const lista = [
      empresa({ id: "a", progresso: "replied" }),
      empresa({ id: "b", selecionada: false, progresso: "new" }),
      empresa({
        id: "c",
        progresso: "qualified",
        dados: { ...empresa().dados, name: "Studio Pele", phone: "+5519911112222" },
      }),
    ];
    const base = { busca: "", progressos: [], mostrarDesmarcadas: false, podeSelecionar: true };
    expect(filtrarEmpresas(lista, base).map((e) => e.id)).toEqual(["a", "c"]);
    expect(filtrarEmpresas(lista, { ...base, mostrarDesmarcadas: true }).map((e) => e.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(filtrarEmpresas(lista, { ...base, progressos: ["qualified"] }).map((e) => e.id)).toEqual(
      ["c"],
    );
    expect(filtrarEmpresas(lista, { ...base, busca: "pele" }).map((e) => e.id)).toEqual(["c"]);
    expect(filtrarEmpresas(lista, { ...base, busca: "1111" }).map((e) => e.id)).toEqual(["c"]);
  });
});

describe("assistente (D9)", () => {
  const pronto: RascunhoDaProspeccao = {
    ...RASCUNHO_VAZIO,
    nome: "Clínicas Campinas",
    numeroId: NUMERO,
    modo: "existente",
    agenteId: AGENTE,
    nicho: "clínicas de estética",
    local: "Campinas, SP",
    orcamento: "1,5",
    funilId: FUNIL,
    etapaId: ETAPA_ENTRADA,
    etapaQualificadaId: ETAPA_QUALIFICADOS,
    instrucao: "Apresente a clínica com educação.",
    qualificacao: "Tem interesse em agendar avaliação.",
    baseLegal: "LIA 2026/01",
  };
  const ctx = { buscaConcluida: true, marcadas: 3 };

  it("números do texto", () => {
    expect(inteiroDoTexto(" 12 ")).toBe(12);
    expect(inteiroDoTexto("1,5")).toBeNull();
    expect(decimalDoTexto("1,5")).toBe(1.5);
    expect(decimalDoTexto("abc")).toBeNull();
  });

  it("passo 1: nome 3–80, número, agente quando existente", () => {
    expect(errosDoPasso(0, pronto, ctx)).toEqual([]);
    expect(errosDoPasso(0, { ...RASCUNHO_VAZIO, nome: "ab" }, ctx)).toEqual([
      "O nome precisa ter de 3 a 80 caracteres.",
      "Escolha o número que vai abordar as empresas.",
    ]);
    expect(errosDoPasso(0, { ...pronto, agenteId: null }, ctx)).toEqual([
      "Escolha um agente publicado.",
    ]);
    expect(errosDoPasso(0, { ...pronto, modo: "conversa", agenteId: null }, ctx)).toEqual([]);
  });

  it("passo 2: busca concluída e alguma marcada", () => {
    expect(errosDoPasso(1, pronto, { buscaConcluida: false, marcadas: 0 })).toEqual([
      "Busque as empresas e espere a busca terminar.",
    ]);
    expect(errosDoPasso(1, pronto, { buscaConcluida: true, marcadas: 0 })).toEqual([
      "Marque pelo menos uma empresa para abordar.",
    ]);
    expect(errosDoPasso(1, pronto, ctx)).toEqual([]);
  });

  it("passo 3: agente, etapas diferentes, textos e ritmo", () => {
    expect(errosDoPasso(2, pronto, ctx)).toEqual([]);
    const erros = errosDoPasso(
      2,
      {
        ...pronto,
        modo: "conversa",
        agenteId: null,
        etapaQualificadaId: ETAPA_ENTRADA,
        instrucao: "curta",
        limiteDiario: "51",
        intervaloMinutos: "4",
      },
      ctx,
    );
    expect(erros).toEqual([
      "Termine a conversa e publique o agente antes de seguir.",
      "Escolha duas etapas abertas e diferentes do mesmo funil: entrada e qualificados.",
      "Descreva o que a IA deve oferecer (de 10 a 2.000 caracteres).",
      "O máximo em 24 horas vai de 1 a 50.",
      "O intervalo mínimo vai de 5 a 1.440 minutos.",
    ]);
  });

  it("passo 4: base legal", () => {
    expect(errosDoPasso(3, { ...pronto, baseLegal: "x" }, ctx)).toEqual([
      "Informe a referência da avaliação de legítimo interesse (de 3 a 500 caracteres).",
    ]);
  });

  it("busca: erros e o que vai ao motor", () => {
    expect(errosDaBusca({ ...pronto, nicho: "", limite: "101", orcamento: "0,4" })).toEqual([
      "Informe o público ou segmento (de 2 a 120 caracteres).",
      "Até quantas empresas: de 1 a 100.",
      "O teto da busca vai de US$ 0,50 a US$ 10,00.",
    ]);
    expect(buscaDoRascunho(pronto)).toEqual(BUSCA);
  });

  it("configuração do rascunho = a do motor", () => {
    expect(configDoRascunho(pronto)).toEqual(CONFIG);
  });

  it("continuar, duplicar e o início do assistente", () => {
    const semConfig = detalhe({ status: "draft", config: null });
    expect(rascunhoDaCampanha(semConfig)).toMatchObject({
      nome: BUSCA.name,
      nicho: BUSCA.niche,
      orcamento: "1,5",
      modo: "conversa",
      numeroId: null,
    });
    expect(rascunhoDaCampanha(detalhe({ status: "draft" }))).toMatchObject({
      modo: "existente",
      agenteId: AGENTE,
      limiteDiario: "10",
    });
    expect(rascunhoDaCopia(detalhe(), " Cópia").nome).toBe("Clínicas Campinas Cópia");
    expect(inicioDoAssistente(null, "nova", " Cópia")).toEqual({
      rascunho: RASCUNHO_VAZIO,
      passo: 0,
      campanhaId: null,
    });
    expect(inicioDoAssistente(semConfig, "continuar", " Cópia")).toMatchObject({
      passo: 0,
      campanhaId: ID,
    });
    expect(inicioDoAssistente(detalhe({ status: "draft" }), "continuar", " Cópia")).toMatchObject({
      passo: 3,
      campanhaId: ID,
    });
    expect(inicioDoAssistente(detalhe(), "copiar", " Cópia")).toMatchObject({
      passo: 0,
      campanhaId: null,
    });
  });

  it("agente criado pela conversa preenche número, funil e textos", () => {
    expect(
      aplicarAgenteCriado(
        { id: AGENTE, name: "Sofia" },
        {
          channel_session_id: NUMERO,
          pipeline_id: FUNIL,
          stage_id: ETAPA_ENTRADA,
          qualified_stage_id: ETAPA_QUALIFICADOS,
          instruction: CONFIG.instruction,
          qualification: CONFIG.qualification,
        },
      ),
    ).toEqual({
      agenteId: AGENTE,
      numeroId: NUMERO,
      funilId: FUNIL,
      etapaId: ETAPA_ENTRADA,
      etapaQualificadaId: ETAPA_QUALIFICADOS,
      instrucao: CONFIG.instruction,
      qualificacao: CONFIG.qualification,
    });
  });

  it("números do seletor: só os conectados", () => {
    const o = {
      ...OPCOES,
      numeros: [...OPCOES.numeros, { id: "x", nome: "Velho", telefone: null, status: "STOPPED" }],
    };
    expect(numerosDoSeletor(o, "Não oficial")).toEqual([
      {
        id: NUMERO,
        nome: "Comercial",
        telefone: "+5519988887777",
        conectado: true,
        grupo: "Não oficial",
      },
    ]);
  });
});
