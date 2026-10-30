import { describe, expect, it } from "vitest";

import type { ActionType } from "@/app/app/webhooks/_components/labels";
import { PROBLEMAS, type CaixaDoDesenho, type Desenho } from "@/lib/automation/desenho-da-regra";
import { copiaDaCaixa, retratoDoFluxo, toastDaRecusa } from "@/lib/escale/automacoes/fluxo/estado";
import {
  FONTES_DOS_GATILHOS,
  fonteDoEvento,
  opcaoDoEvento,
  precisaDeFormulario,
} from "@/lib/escale/automacoes/fluxo/gatilhos";
import {
  ALTURA_ESTIMADA_DO_NO,
  ESPACO_ENTRE_NOS,
  LARGURA_DO_NO,
  organizarNaHorizontal,
} from "@/lib/escale/automacoes/fluxo/layout";
import { ABAS_DAS_ACOES, ITENS_DA_PALETA, filtrarPaleta, tipoDoNo } from "@/lib/escale/automacoes/fluxo/paleta";
import { TRIGGER_EVENTS } from "@/lib/schemas/webhooks";

/**
 * Fase 5B: as regras puras do fluxo da casca — a arrumação da esquerda para a
 * direita, o catálogo dos gatilhos, a paleta, o modal "Ações" e o estado.
 */
const id = (s: string) => s;

function caixa(idDaCaixa: string, data: CaixaDoDesenho["data"]): CaixaDoDesenho {
  return Object.freeze({ id: idDaCaixa, type: data.kind, position: { x: 9, y: 9 }, data }) as CaixaDoDesenho;
}
const gatilho = caixa("gatilho", {
  kind: "gatilho",
  evento: "contact.tag_added",
  tela: {
    fonte: null,
    data: { pipeline_id: "", campo: "", dias: "7" },
    tempo: { dias: "7", direcao: "da_equipe", proteger_pela_agenda: false },
  },
});
const condicoes = caixa("condicoes", {
  kind: "condicoes",
  linhas: [{ field: "contact.tags", op: "contains", value: "vip" }],
});
const acao = (n: number) => caixa(`acao-${n}`, { kind: "acao", acao: { type: "add_tag", config: { tags: ["x"] } } });
const ligacao = (n: number, source: string, target: string) => ({ id: `ligacao-${n}`, source, target });

const FILA: Desenho = {
  caixas: [gatilho, condicoes, acao(1), acao(2)],
  ligacoes: [ligacao(1, "gatilho", "condicoes"), ligacao(2, "condicoes", "acao-1"), ligacao(3, "acao-1", "acao-2")],
};

describe("organizarNaHorizontal", () => {
  it("põe a fila numa linha, 352 + 120 px por passo", () => {
    const r = organizarNaHorizontal(FILA);
    expect(LARGURA_DO_NO + ESPACO_ENTRE_NOS).toBe(472);
    expect(r.caixas.map((c) => c.position)).toEqual([
      { x: 0, y: 0 },
      { x: 472, y: 0 },
      { x: 944, y: 0 },
      { x: 1416, y: 0 },
    ]);
    expect(r.ligacoes).toEqual(FILA.ligacoes);
  });

  it("o que está fora da fila vai para uma linha embaixo (estimativa ou medida)", () => {
    const solta: Desenho = { caixas: [...FILA.caixas, acao(3)], ligacoes: FILA.ligacoes };
    expect(organizarNaHorizontal(solta).caixas[4]!.position).toEqual({ x: 0, y: ALTURA_ESTIMADA_DO_NO + 160 });
    expect(organizarNaHorizontal(solta).caixas[4]!.position.y).toBe(340);
    const medida = organizarNaHorizontal(solta, new Map([["gatilho", 300]]));
    expect(medida.caixas[4]!.position).toEqual({ x: 0, y: 460 });
  });

  it("não mexe na entrada", () => {
    organizarNaHorizontal(FILA);
    expect(FILA.caixas[1]!.position).toEqual({ x: 9, y: 9 });
  });
});

describe("gatilhos", () => {
  it("cada TRIGGER_EVENT aparece uma vez, nas 5 fontes em ordem", () => {
    const eventos = FONTES_DOS_GATILHOS.flatMap((f) => f.opcoes.map((o) => o.evento));
    expect([...eventos].sort()).toEqual([...TRIGGER_EVENTS].sort());
    expect(new Set(eventos).size).toBe(eventos.length);
    expect(FONTES_DOS_GATILHOS.map((f) => f.fonte)).toEqual(["negocios", "contatos", "mensagens", "agenda", "datas"]);
  });

  it("fonteDoEvento, opcaoDoEvento e precisaDeFormulario", () => {
    expect(fonteDoEvento("appointment.cancelled")).toBe("agenda");
    expect(fonteDoEvento("x")).toBe("negocios");
    expect(fonteDoEvento("")).toBe("negocios");
    expect(opcaoDoEvento("contact.tag_added")?.titulo).toBe("Tag adicionada ao contato");
    expect(opcaoDoEvento("nada")).toBeNull();
    const comFormulario = TRIGGER_EVENTS.filter((e) => precisaDeFormulario(e));
    expect([...comFormulario].sort()).toEqual([
      "lead.created",
      "lead.date_field_due",
      "lead.silent_for",
      "lead.stage_stale",
    ]);
  });
});

describe("paleta e modal Ações", () => {
  it("7 itens na ordem", () => {
    expect(ITENS_DA_PALETA.map((i) => i.passo)).toEqual([
      "gatilho",
      "send_whatsapp_message",
      "send_email",
      "acoes",
      "condicoes",
      "send_ai_message",
      "start_message_flow",
    ]);
  });

  it("a busca ignora acento e caixa, olha título e descrição, nunca a seção", () => {
    expect(filtrarPaleta("acoes", id).map((i) => i.passo)).toEqual(["acoes"]);
    expect(filtrarPaleta("FOLLOW", id).map((i) => i.passo)).toEqual(["start_message_flow"]);
    expect(filtrarPaleta("zzz", id)).toEqual([]);
    expect(filtrarPaleta("", id)).toHaveLength(7);
    expect(filtrarPaleta("  ", id)).toHaveLength(7);
    expect(filtrarPaleta("logica", id)).toEqual([]);
  });

  it("as abas do modal + os canais da paleta cobrem os 10 ActionType uma vez", () => {
    const doModal = ABAS_DAS_ACOES.flatMap((a) => a.cartoes.map((c) => c.tipo));
    const daPaleta = ITENS_DA_PALETA.map((i) => i.passo).filter(
      (p) => p !== "gatilho" && p !== "acoes" && p !== "condicoes",
    ) as unknown as ActionType[];
    const todos = [...doModal, ...daPaleta];
    expect(new Set(todos).size).toBe(10);
    expect(todos).toHaveLength(10);
    expect(ABAS_DAS_ACOES.map((a) => a.aba)).toEqual(["crm", "contatos", "integracoes"]);
  });

  it("tipoDoNo", () => {
    expect(tipoDoNo({ kind: "gatilho" })).toBe("gatilho");
    expect(tipoDoNo({ kind: "condicoes" })).toBe("condicoes");
    expect(tipoDoNo({ kind: "acao", acao: { type: "send_whatsapp_message" } })).toBe("whatsapp");
    expect(tipoDoNo({ kind: "acao", acao: { type: "send_email" } })).toBe("email");
    expect(tipoDoNo({ kind: "acao", acao: { type: "send_ai_message" } })).toBe("ia");
    expect(tipoDoNo({ kind: "acao", acao: { type: "start_message_flow" } })).toBe("ia");
    expect(tipoDoNo({ kind: "acao", acao: { type: "ai_decide" } })).toBe("ia");
    expect(tipoDoNo({ kind: "acao", acao: { type: "add_tag" } })).toBe("acoes");
    expect(tipoDoNo({ kind: "acao", acao: { type: "desconhecida" } })).toBe("acoes");
  });
});

describe("estado puro", () => {
  it("retratoDoFluxo ignora posição e vê nome, dados e ligações", () => {
    const base = retratoDoFluxo("A", FILA);
    const movido: Desenho = { ...FILA, caixas: FILA.caixas.map((c) => ({ ...c, position: { x: 1, y: 2 } })) };
    expect(retratoDoFluxo("A", movido)).toBe(base);
    expect(retratoDoFluxo("B", FILA)).not.toBe(base);
    const dado: Desenho = { ...FILA, caixas: FILA.caixas.map((c, i) => (i === 2 ? acao(9) : c)) };
    expect(retratoDoFluxo("A", dado)).not.toBe(base);
    const semLigacao: Desenho = { ...FILA, ligacoes: FILA.ligacoes.slice(0, 2) };
    expect(retratoDoFluxo("A", semLigacao)).not.toBe(base);
  });

  it("toastDaRecusa escolhe a frase da Clint pelo problema", () => {
    expect(toastDaRecusa([{ caixa: null, mensagem: PROBLEMAS.semGatilho }])).toBe(
      "É necessário configurar o gatilho para salvar a automação.",
    );
    expect(
      toastDaRecusa([
        { caixa: "gatilho", mensagem: PROBLEMAS.semEvento },
        { caixa: "gatilho", mensagem: PROBLEMAS.semAcao },
      ]),
    ).toBe("É necessário configurar o gatilho para salvar a automação.");
    expect(toastDaRecusa([{ caixa: "gatilho", mensagem: PROBLEMAS.semAcao }])).toBe(
      "Para salvar a automação, conecte pelo menos uma ação ao gatilho.",
    );
    expect(toastDaRecusa([{ caixa: "acao-1", mensagem: PROBLEMAS.acaoIncompleta }])).toBe(
      "A automação não foi salva. Corrija os pontos marcados nas caixas.",
    );
  });

  it("copiaDaCaixa troca o id, tira os problemas e não compartilha objeto", () => {
    const original: CaixaDoDesenho = {
      id: "acao-1",
      type: "acao",
      position: { x: 1, y: 1 },
      data: {
        kind: "acao",
        acao: { type: "add_tag", config: { tags: ["a"] } },
        problemas: [{ caixa: "acao-1", mensagem: "x" }],
      },
    };
    const copia = copiaDaCaixa(original, "acao-7");
    expect(copia.id).toBe("acao-7");
    expect(copia.data).toEqual({ kind: "acao", acao: { type: "add_tag", config: { tags: ["a"] } } });
    if (copia.data.kind === "acao") (copia.data.acao.config.tags as string[]).push("b");
    expect((original.data as unknown as { acao: { config: { tags: string[] } } }).acao.config.tags).toEqual(["a"]);
  });
});
