import { describe, expect, it } from "vitest";

import {
  ACOES_DESTRUTIVAS,
  CONFIRMACAO_DA_ACAO,
  acoesDaLinha,
  botaoDaLinha,
} from "@/lib/escale/campanhas/acoes-da-linha";
import {
  DICA_DO_STATUS,
  ROTULO_DO_STATUS,
  STATUS_QUE_PULSAM,
  TOM_DO_STATUS,
  dataBr,
  dataDoDisparo,
  dataEHoraBr,
  numeroBr,
  porcento,
  segmentosDaBarra,
  subtituloDaCampanha,
  tempoDesde,
  textoDoSegmento,
  valoresDoCartao,
} from "@/lib/escale/campanhas/apresentacao";
import {
  ROTULO_DO_FILTRO_DE_STATUS,
  STATUS_DO_FILTRO,
  compilarFiltros,
  enxugarFiltros,
  filtrosDoTexto,
  temFiltro,
  textoDosFiltros,
} from "@/lib/escale/campanhas/filtros";
import {
  abaDaUrl,
  abasVisiveis,
  rotaDaAba,
  rotaDoDetalhe,
  rotaDoRascunho,
} from "@/lib/escale/campanhas/rotas";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { STATUS_DA_CAMPANHA } from "@/lib/campanhas/tipos";

const t = (s: string) => s;
const SP = "America/Sao_Paulo";
const AGORA = new Date("2026-10-17T12:00:00Z");
const NUMERO = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

const linha = (extra: Partial<LinhaDeCampanha> = {}): LinhaDeCampanha => ({
  id: "c1",
  nome: "10.09",
  status: "completed",
  numeroId: NUMERO,
  solicitados: 30,
  agendadaPara: null,
  iniciadaEm: "2026-09-10T15:39:00Z",
  criadaEm: "2026-09-10T12:00:00Z",
  adicionados: 30,
  enviados: 26,
  entregues: 24,
  lidos: 16,
  erros: 3,
  ...extra,
});

describe("filtros da lista (N4)", () => {
  it("enxugar tira o vazio; temFiltro só conta o que filtra", () => {
    expect(
      enxugarFiltros({ busca: "  ", status: [], disparo: {}, criacao: { de: "2026-10-01" } }),
    ).toEqual({
      criacao: { de: "2026-10-01" },
    });
    expect(temFiltro({})).toBe(false);
    expect(temFiltro({ busca: " " })).toBe(false);
    expect(temFiltro({ numero: NUMERO })).toBe(true);
  });

  it("o texto da URL vai e volta; JSON ruim ou fora do schema é null; nada é {}", () => {
    const f = { busca: "Reat", status: ["scheduled" as const], numero: NUMERO };
    expect(filtrosDoTexto(textoDosFiltros(f))).toEqual(f);
    expect(filtrosDoTexto(undefined)).toEqual({});
    expect(filtrosDoTexto("{")).toBeNull();
    expect(filtrosDoTexto(JSON.stringify({ status: ["preparing"] }))).toBeNull();
    expect(filtrosDoTexto(JSON.stringify({ outro: 1 }))).toBeNull();
  });

  it("compilar: fuso, padrão do ilike escapado, status, número e as datas", () => {
    expect(
      compilarFiltros(
        {
          busca: "50%_off",
          status: ["running"],
          numero: NUMERO,
          disparo: { de: "2026-10-01", ate: "2026-10-31" },
          criacao: { ate: "2026-09-30" },
        },
        SP,
      ),
    ).toEqual({
      fuso: SP,
      padrao: "%50\\%\\_off%",
      status: ["running"],
      numero: NUMERO,
      disparo_de: "2026-10-01",
      disparo_ate: "2026-10-31",
      criada_ate: "2026-09-30",
    });
    expect(compilarFiltros({}, SP)).toEqual({ fuso: SP });
  });

  it("o filtro de status: 8 opções sem 'Processando', em ordem alfabética, com as palavras do filtro da Clint", () => {
    expect(STATUS_DO_FILTRO).not.toContain("preparing");
    const rotulos = STATUS_DO_FILTRO.map((s) => ROTULO_DO_FILTRO_DE_STATUS[s]);
    expect(rotulos).toEqual([
      "Agendado",
      "Cancelado",
      "Concluído",
      "Envio em Andamento",
      "Erro de Processamento",
      "Pausada",
      "Pronta para enviar",
      "Rascunho",
    ]);
  });
});

describe("status na tela (N5)", () => {
  it("todo estado tem rótulo, dica e tom; pulsam só Processando e Em progresso", () => {
    for (const s of STATUS_DA_CAMPANHA) {
      expect(ROTULO_DO_STATUS[s], s).toBeTruthy();
      expect(DICA_DO_STATUS[s], s).toBeTruthy();
      expect(TOM_DO_STATUS[s], s).toBeTruthy();
    }
    expect([...STATUS_QUE_PULSAM].sort()).toEqual(["preparing", "running"]);
    expect(ROTULO_DO_STATUS.completed).toBe("Completo");
    expect(TOM_DO_STATUS.completed).toBe("verde");
    expect(TOM_DO_STATUS.paused).toBe("laranja");
  });
});

describe("barra, cartões e números (N6, N7)", () => {
  it("os segmentos disjuntos, na ordem da Clint, sobre os adicionados", () => {
    const s = segmentosDaBarra(linha());
    expect(s.map((x) => [x.chave, x.quantidade, x.porcento])).toEqual([
      ["erro", 3, 10],
      ["entregues", 8, 27],
      ["lidos", 16, 53],
      ["enviados", 2, 7],
    ]);
    expect(s.reduce((a, x) => a + x.largura, 0)).toBeCloseTo(96.67, 1);
    expect(textoDoSegmento(s[2]!, t)).toBe("16 lidos - 53%");
    expect(textoDoSegmento(s[0]!, t)).toBe("3 inválidos ou com erro");
    expect(segmentosDaBarra(linha({ adicionados: 0 }))).toEqual([]);
  });

  it("os cartões: o 1º só o total, os outros o percentual sobre os adicionados", () => {
    const r = { adicionados: 14989, enviados: 9922, entregues: 9110, lidos: 2408, erros: 4087 };
    expect(valoresDoCartao("adicionados", r)).toEqual({ total: 14989, porcento: null });
    expect(valoresDoCartao("enviados", r)).toEqual({ total: 9922, porcento: 66 });
    expect(valoresDoCartao("lidas", r)).toEqual({ total: 2408, porcento: 16 });
    expect(valoresDoCartao("erros", { ...r, adicionados: 0 })).toEqual({
      total: 4087,
      porcento: null,
    });
    expect(porcento(1, 3)).toBe(33);
    expect(numeroBr(14989)).toBe("14.989");
  });
});

describe("tempo e datas (N8)", () => {
  it("o tempo relativo no molde do dayjs da Clint", () => {
    expect(tempoDesde("2026-10-17T11:59:40Z", AGORA, t)).toBe("há poucos segundos");
    expect(tempoDesde("2026-10-17T10:00:00Z", AGORA, t)).toBe("há 2 horas");
    expect(tempoDesde("2026-09-10T12:00:00Z", AGORA, t)).toBe("há um mês");
    expect(tempoDesde("2026-09-01T12:00:00Z", AGORA, t)).toBe("há 2 meses");
    expect(tempoDesde("2026-07-13T12:00:00Z", AGORA, t)).toBe("há 3 meses");
    expect(tempoDesde("2025-04-17T12:00:00Z", AGORA, t)).toBe("há 2 anos");
  });

  it("datas no formato brasileiro, no fuso pedido", () => {
    expect(dataEHoraBr("2026-09-10T15:39:00Z", SP)).toBe("10/09/2026 12:39");
    expect(dataBr("2026-10-01T02:00:00Z", SP)).toBe("30/09/2026");
    expect(dataDoDisparo(linha({ agendadaPara: "2026-10-20T13:00:00Z" }))).toBe(
      "2026-10-20T13:00:00Z",
    );
    expect(dataDoDisparo(linha())).toBe("2026-09-10T15:39:00Z");
    expect(dataDoDisparo(linha({ iniciadaEm: null }))).toBeNull();
  });

  it("o subtítulo: N Solicitado(s) há X; sem snapshot, Criado em", () => {
    expect(subtituloDaCampanha(linha(), AGORA, t, SP)).toBe("30 Solicitados há um mês");
    expect(subtituloDaCampanha(linha({ solicitados: 1 }), AGORA, t, SP)).toBe(
      "1 Solicitado há um mês",
    );
    expect(subtituloDaCampanha(linha({ solicitados: 1500 }), AGORA, t, SP)).toBe(
      "1.500 Solicitados há um mês",
    );
    expect(
      subtituloDaCampanha(
        linha({ solicitados: 0, criadaEm: "2026-10-01T12:00:00Z" }),
        AGORA,
        t,
        SP,
      ),
    ).toBe("Criado em 01/10/2026");
  });
});

describe("o ⋮ e o botão da linha (N9)", () => {
  it("as ações por status", () => {
    expect(acoesDaLinha("draft", 0)).toEqual(["editar", "excluir", "duplicar"]);
    expect(acoesDaLinha("ready", 0)).toEqual(["cancelar_para_rascunho", "duplicar"]);
    expect(acoesDaLinha("scheduled", 0)).toEqual([
      "alterar_horario",
      "cancelar_para_rascunho",
      "duplicar",
    ]);
    expect(acoesDaLinha("scheduled", 4)).toEqual(["alterar_horario", "cancelar", "duplicar"]);
    expect(acoesDaLinha("running", 10)).toEqual(["cancelar", "duplicar"]);
    expect(acoesDaLinha("paused", 10)).toEqual(["cancelar", "duplicar"]);
    for (const s of ["completed", "cancelled", "failed", "preparing"] as const) {
      expect(acoesDaLinha(s, 0), s).toEqual(["duplicar"]);
    }
  });

  it("destrutivas e confirmações; o botão de pausa", () => {
    expect([...ACOES_DESTRUTIVAS].sort()).toEqual([
      "cancelar",
      "cancelar_para_rascunho",
      "excluir",
    ]);
    expect(CONFIRMACAO_DA_ACAO.cancelar_para_rascunho).toContain("movida para Rascunho");
    expect(botaoDaLinha("running")).toBe("pausar");
    expect(botaoDaLinha("paused")).toBe("retomar");
    expect(botaoDaLinha("scheduled")).toBeNull();
  });
});

describe("rotas e abas (N2, N11)", () => {
  it("destinos até a 8B/8C e as abas por papel", () => {
    expect(rotaDoRascunho("c1")).toBe("/app/campaigns/c1/edit");
    expect(rotaDoDetalhe("c1")).toBe("/app/campaigns?campanha=c1");
    expect(abasVisiveis("manager")).toEqual(["whatsapp"]);
    expect(abasVisiveis("admin")).toEqual(["whatsapp", "prospeccao"]);
    expect(abaDaUrl("prospeccao", "admin")).toBe("prospeccao");
    expect(abaDaUrl("prospeccao", "manager")).toBe("whatsapp");
    expect(abaDaUrl("xyz", "admin")).toBe("whatsapp");
    expect(rotaDaAba("whatsapp")).toBe("/app/campaigns");
    expect(rotaDaAba("prospeccao")).toBe("/app/campaigns?aba=prospeccao");
  });
});
