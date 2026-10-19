import { describe, expect, it } from "vitest";

import {
  CAMPOS_DO_CARTAO_PADRAO,
  camposDisponiveis,
  ehCamposPadrao,
  lerCamposDoCartao,
} from "@/lib/escale/conversas/campos-do-cartao";
import {
  aguardandoHa,
  horaDaLinha,
  inicialDoAtendente,
  previaDaLinha,
  ultimaFoiNossa,
} from "@/lib/escale/conversas/linha";
import { gravarModoEspiao, lerModoEspiao } from "@/lib/escale/conversas/modo-espiao";
import { agruparDispositivos, bolinhaDoDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { ORDEM_PADRAO, ordemDaUrl } from "@/lib/escale/conversas/ordem";
import {
  STATUS_ABERTOS,
  emEspera,
  estaAberta,
  filtrosDoPreset,
  presetDaUrl,
} from "@/lib/escale/conversas/presets";
import { lerSecoes, secoesParaMostrar } from "@/lib/escale/conversas/secoes";
import {
  VISUALIZACAO_PADRAO,
  camposAtivos,
  corDaEspera,
  ehVisualizacaoPadrao,
  lerVisualizacao,
  limiteEmMs,
  podeLigar,
  textoDaEspera,
} from "@/lib/escale/conversas/visualizacao";

const t = (s: string) => s;
const AGORA = new Date("2026-10-18T15:00:00-03:00");
const H = 60 * 60 * 1000;

describe("presets (A4, seção 6 do PRD)", () => {
  it("cada preset vira o filtro do mapa de status", () => {
    expect(filtrosDoPreset("todos")).toEqual({});
    expect(filtrosDoPreset("nao_lidas")).toEqual({ unread: true });
    expect(filtrosDoPreset("meus_em_aberto")).toEqual({
      assigned_to: "me",
      status: STATUS_ABERTOS,
      snoozed: false,
    });
    expect(filtrosDoPreset("em_aberto")).toEqual({ status: STATUS_ABERTOS, snoozed: false });
    expect(filtrosDoPreset("em_espera")).toEqual({ status: STATUS_ABERTOS, snoozed: true });
    expect(filtrosDoPreset("fechadas")).toEqual({ status: ["closed", "resolved"] });
  });

  it("a URL só aceita preset que existe; o resto vira Todos", () => {
    expect(presetDaUrl("em_espera")).toBe("em_espera");
    expect(presetDaUrl("inventado")).toBe("todos");
    expect(presetDaUrl(null)).toBe("todos");
    expect(ordemDaUrl("espera")).toBe("espera");
    expect(ordemDaUrl("x")).toBe(ORDEM_PADRAO);
  });

  it("em espera = snooze vigente; aberta pelo mapa", () => {
    expect(emEspera({ snooze_until: "2026-10-18T19:00:00Z" }, AGORA)).toBe(true);
    expect(emEspera({ snooze_until: "2026-10-18T17:00:00Z" }, AGORA)).toBe(false);
    expect(emEspera({ snooze_until: null }, AGORA)).toBe(false);
    expect(estaAberta("claimed")).toBe(true);
    expect(estaAberta("closed")).toBe(false);
  });
});

describe("a linha da fila (A7)", () => {
  it("hora hoje, 'Ontem' e a data dd/mm/aaaa", () => {
    expect(horaDaLinha("2026-10-18T14:52:00-03:00", AGORA, t)).toBe("14:52");
    expect(horaDaLinha("2026-10-17T23:10:00-03:00", AGORA, t)).toBe("Ontem");
    expect(horaDaLinha("2026-10-01T10:00:00-03:00", AGORA, t)).toBe("01/10/2026");
    expect(horaDaLinha(null, AGORA, t)).toBe("");
  });

  it("✓✓ quando a última foi nossa; tempo sem resposta só quando o cliente espera", () => {
    expect(
      ultimaFoiNossa({
        last_inbound_at: "2026-10-18T10:00:00Z",
        last_outbound_at: "2026-10-18T11:00:00Z",
      }),
    ).toBe(true);
    expect(
      ultimaFoiNossa({
        last_inbound_at: "2026-10-18T12:00:00Z",
        last_outbound_at: "2026-10-18T11:00:00Z",
      }),
    ).toBe(false);
    const espera = aguardandoHa(
      {
        status: "open",
        last_inbound_at: "2026-10-18T16:00:00Z",
        last_outbound_at: "2026-10-18T15:00:00Z",
      },
      AGORA,
    );
    expect(espera).toBe(2 * H);
    expect(
      aguardandoHa(
        {
          status: "open",
          last_inbound_at: "2026-10-18T15:00:00Z",
          last_outbound_at: "2026-10-18T16:00:00Z",
        },
        AGORA,
      ),
    ).toBeNull();
    expect(
      aguardandoHa(
        { status: "closed", last_inbound_at: "2026-10-18T16:00:00Z", last_outbound_at: null },
        AGORA,
      ),
    ).toBeNull();
  });

  it("prévia e inicial", () => {
    expect(previaDaLinha({ last_message_preview: "  Boa tarde  " }, t)).toBe("Boa tarde");
    expect(previaDaLinha({ last_message_preview: null }, t)).toBe("Sem mensagens");
    expect(inicialDoAtendente("camilly victória")).toBe("C");
    expect(inicialDoAtendente(null)).toBe("");
  });
});

describe("Personalizar visualização (A8)", () => {
  it("padrão: Atendente e Permissão de chamada, 1h amarelo, 4h vermelho", () => {
    expect(camposAtivos(VISUALIZACAO_PADRAO)).toBe(2);
    expect(VISUALIZACAO_PADRAO.campos.atendente).toBe(true);
    expect(VISUALIZACAO_PADRAO.campos.permissaoDeChamada).toBe(true);
    expect(limiteEmMs(VISUALIZACAO_PADRAO.limites.amarelo)).toBe(1 * H);
    expect(limiteEmMs(VISUALIZACAO_PADRAO.limites.vermelho)).toBe(4 * H);
    expect(ehVisualizacaoPadrao(VISUALIZACAO_PADRAO)).toBe(true);
  });

  it("no máximo 5 ligados: o sexto não liga, um ligado pode desligar", () => {
    const cinco = lerVisualizacao({
      ...VISUALIZACAO_PADRAO,
      campos: {
        ...VISUALIZACAO_PADRAO.campos,
        setor: true,
        tempoSemResposta: true,
        mensagensAgendadas: true,
      },
    });
    expect(camposAtivos(cinco)).toBe(5);
    expect(podeLigar(cinco, "tags")).toBe(false);
    expect(podeLigar(cinco, "setor")).toBe(true);
    expect(podeLigar(VISUALIZACAO_PADRAO, "tags")).toBe(true);
    expect(ehVisualizacaoPadrao(cinco)).toBe(false);
  });

  it("fora da forma vale o padrão; os limites em minutos/horas/dias", () => {
    expect(lerVisualizacao({ campos: 1 })).toEqual(VISUALIZACAO_PADRAO);
    expect(lerVisualizacao(null)).toEqual(VISUALIZACAO_PADRAO);
    expect(limiteEmMs({ valor: 30, unidade: "minutos" })).toBe(30 * 60 * 1000);
    expect(limiteEmMs({ valor: 2, unidade: "dias" })).toBe(48 * H);
  });

  it("a cor da espera segue os limites; o texto é curto como o da Clint", () => {
    expect(corDaEspera(10 * 60 * 1000, VISUALIZACAO_PADRAO)).toBe("cinza");
    expect(corDaEspera(1 * H, VISUALIZACAO_PADRAO)).toBe("amarelo");
    expect(corDaEspera(5 * H, VISUALIZACAO_PADRAO)).toBe("vermelho");
    expect(textoDaEspera(30 * 1000, t)).toBe("agora");
    expect(textoDaEspera(3 * 60 * 1000, t)).toBe("3 min");
    expect(textoDaEspera(3 * H, t)).toBe("3h");
    expect(textoDaEspera(8 * 24 * H, t)).toBe("8d");
  });
});

describe("seções e campos do cartão (D5, D7)", () => {
  it("sem negócio, Atividades e Negócio somem mesmo ligadas", () => {
    expect(secoesParaMostrar(lerSecoes(null), true)).toEqual([
      "atividades",
      "contato",
      "negocio",
      "empresa",
      "notas",
      "anexos",
      "historico",
      "conversas",
    ]);
    expect(secoesParaMostrar(lerSecoes({ notas: false }), false)).toEqual([
      "contato",
      "empresa",
      "anexos",
      "historico",
      "conversas",
    ]);
  });

  it("os campos do cartão: padrão, leitura tolerante e os disponíveis da origem", () => {
    expect(CAMPOS_DO_CARTAO_PADRAO).toEqual(["origem", "etapa", "dono", "valor", "status"]);
    expect(lerCamposDoCartao(["status", "crm:sdr", 1])).toEqual(["status", "crm:sdr"]);
    expect(lerCamposDoCartao("x")).toEqual(CAMPOS_DO_CARTAO_PADRAO);
    expect(ehCamposPadrao(["origem", "etapa", "dono", "valor", "status"])).toBe(true);
    expect(ehCamposPadrao(["status"])).toBe(false);
    const disponiveis = camposDisponiveis([{ key: "sdr", label: "sdr" }], t);
    expect(disponiveis.map((c) => c.chave)).toEqual([
      "origem",
      "etapa",
      "dono",
      "valor",
      "status",
      "crm:sdr",
    ]);
    expect(disponiveis[5]).toMatchObject({ rotulo: "sdr", grupo: "crm" });
  });
});

describe("modo espião e dispositivos", () => {
  it("a marca vive na sessão e sobrevive a leitura ruim", () => {
    const guardado = new Map<string, string>();
    const storage = {
      getItem: (k: string) => guardado.get(k) ?? null,
      setItem: (k: string, v: string) => void guardado.set(k, v),
      removeItem: (k: string) => void guardado.delete(k),
    };
    expect(lerModoEspiao(storage)).toBe(false);
    gravarModoEspiao(storage, true);
    expect(lerModoEspiao(storage)).toBe(true);
    gravarModoEspiao(storage, false);
    expect(lerModoEspiao(storage)).toBe(false);
    expect(lerModoEspiao(null)).toBe(false);
  });

  it("os dispositivos agrupam por tipo, na ordem da Clint, e a bolinha segue o estado", () => {
    const grupos = agruparDispositivos([
      {
        id: "1",
        provider: "meta_cloud",
        status: "WORKING",
        display_name: "Suporte",
        phone_number: "+5562999990000",
      },
      {
        id: "2",
        provider: "waha",
        status: "STOPPED",
        display_name: "Sara",
        phone_number: "+5511953042230",
      },
      {
        id: "3",
        provider: "zernio_social",
        status: "WORKING",
        display_name: "@loja",
        phone_number: null,
      },
    ]);
    expect(grupos.map((g) => g.grupo)).toEqual(["whatsapp", "whatsapp_oficial", "instagram"]);
    expect(grupos[0]!.canais.map((c) => c.id)).toEqual(["2"]);
    expect(bolinhaDoDispositivo("WORKING")).toBe("verde");
    expect(bolinhaDoDispositivo("STOPPED")).toBe("vermelha");
  });
});
