import { describe, expect, it } from "vitest";

import type { Desenho, TelaDoGatilho } from "@/lib/automation/desenho-da-regra";
import { dadosDoGrupo } from "@/lib/escale/automacoes/fluxo/grupos";
import {
  acoesDeCadaPasso,
  cartaoDasCondicoes,
  cartoesDoPainel,
  cartoesDoPasso,
  desdeDoPeriodo,
  opcoesDosEventos,
  podeReenviar,
  primeiroPassoComProblema,
  selecionadosIniciais,
} from "@/lib/escale/automacoes/insights/regras";
import { filtroDasExecucoesSchema, pedidoDeExecucoes } from "@/lib/escale/automacoes/insights/schema";
import type { ResumoDaAutomacao } from "@/lib/escale/automacoes/insights/tipos";

const TELA: TelaDoGatilho = {
  fonte: null,
  data: { pipeline_id: "", campo: "", dias: "" },
  tempo: { dias: "", direcao: "qualquer", proteger_pela_agenda: false },
};

const RESUMO: ResumoDaAutomacao = {
  total: 9602,
  sucesso: 9000,
  parcial: 2,
  falhou: 8,
  adiado: 592,
  ultima: "2026-09-10T15:40:00Z",
  passos: [
    { indice: 0, tipo: "send_whatsapp_message", sucesso: 7, erro: 2, esperando: 1 },
    { indice: 1, tipo: "call_webhook", sucesso: 5, erro: 3, esperando: 0 },
    { indice: 1, tipo: "add_tag", sucesso: 4, erro: 1, esperando: 0 },
  ],
};

describe("desdeDoPeriodo", () => {
  const agora = new Date("2026-10-31T12:00:00Z");
  it("conta para trás em dias e devolve null em 'tudo'", () => {
    expect(desdeDoPeriodo("7d", agora)).toBe("2026-10-24T12:00:00.000Z");
    expect(desdeDoPeriodo("30d", agora)).toBe("2026-10-01T12:00:00.000Z");
    expect(desdeDoPeriodo("tudo", agora)).toBeNull();
  });
});

describe("cartoesDoPainel", () => {
  it("segue a ordem e soma falhou + parcial em Com erro", () => {
    const c = cartoesDoPainel(RESUMO, "America/Sao_Paulo");
    expect(c.map((x) => x.rotulo)).toEqual(["Execuções", "Sucesso", "Com erro", "Esperando", "Última execução"]);
    expect(c.map((x) => x.valor)).toEqual([9602, 9000, 10, 592, "10/09/2026 12:40"]);
    expect(c[0]!.filtro).toEqual({ origem: "painel", situacoes: ["success", "partial", "failed", "adiado"] });
    expect(c[1]!.filtro).toEqual({ origem: "painel", situacoes: ["success"] });
    expect(c[2]!.filtro).toEqual({ origem: "painel", situacoes: ["failed", "partial"] });
    expect(c[3]!.filtro).toEqual({ origem: "painel", situacoes: ["adiado"] });
    expect(c[4]!.filtro).toBeNull();
  });

  it("sem execução, a última é um traço", () => {
    expect(cartoesDoPainel({ ...RESUMO, ultima: null }, "America/Sao_Paulo")[4]!.valor).toBe("—");
  });
});

describe("cartoesDoPasso", () => {
  const whats = [{ indice: 0, tipo: "send_whatsapp_message" }];

  it("envio: Enviados, Esperando e Erro no envio", () => {
    const c = cartoesDoPasso(RESUMO, whats, "send_whatsapp_message");
    expect(c.map((x) => [x.rotulo, x.valor])).toEqual([
      ["Enviados", 7],
      ["Esperando", 1],
      ["Erro no envio", 2],
    ]);
    expect(c[2]!.filtro).toEqual({ origem: "passo", acoes: whats, tipoDoCartao: "send_whatsapp_message", resultados: ["erro"] });
  });

  it("webhook: Acionaram soma tudo e Webhook falhou", () => {
    const c = cartoesDoPasso(RESUMO, [{ indice: 1, tipo: "call_webhook" }], "call_webhook");
    expect(c.map((x) => [x.rotulo, x.valor])).toEqual([
      ["Acionaram", 8],
      ["Webhook falhou", 3],
    ]);
  });

  it("outros tipos: Acionaram e Com erro; o tipo diferente no mesmo índice não soma", () => {
    const c = cartoesDoPasso(RESUMO, [{ indice: 1, tipo: "add_tag" }], "add_tag");
    expect(c.map((x) => [x.rotulo, x.valor])).toEqual([
      ["Acionaram", 5],
      ["Com erro", 1],
    ]);
    expect(cartoesDoPasso(RESUMO, [{ indice: 1, tipo: "xyz" }], "xyz").map((x) => x.valor)).toEqual([0, 0]);
  });

  it("passo 'Ações' com várias ações soma as linhas de cada uma", () => {
    const grupo = [
      { indice: 1, tipo: "call_webhook" },
      { indice: 1, tipo: "add_tag" },
    ];
    expect(cartoesDoPasso(RESUMO, grupo, "grupo_de_acoes").map((x) => x.valor)).toEqual([13, 4]);
  });
});

describe("condições, eventos e problema", () => {
  it("'Passaram' é o total com a dica", () => {
    const c = cartaoDasCondicoes(RESUMO);
    expect(c).toMatchObject({ rotulo: "Passaram", valor: 9602, filtro: { origem: "condicoes" } });
    expect(c.dica).toContain("Quem não passou não fica registrado");
  });

  it("opções do Eventos nas três origens", () => {
    expect(opcoesDosEventos({ origem: "painel", situacoes: [] }).map((o) => o.rotulo)).toEqual([
      "Sucesso",
      "Parcial",
      "Falhou",
      "Aguardando envio",
    ]);
    const passo = (tipo: string) =>
      opcoesDosEventos({ origem: "passo", acoes: [], tipoDoCartao: tipo, resultados: [] }).map((o) => o.rotulo);
    expect(passo("send_email")).toEqual(["Enviados", "Esperando", "Erro no envio"]);
    expect(passo("call_webhook")).toEqual(["Concluídos", "Esperando", "Webhook falhou"]);
    expect(passo("add_tag")).toEqual(["Concluídos", "Esperando", "Com erro"]);
    expect(opcoesDosEventos({ origem: "condicoes" })).toEqual([]);
  });

  it("selecionadosIniciais vem do cartão clicado", () => {
    expect(selecionadosIniciais({ origem: "painel", situacoes: ["success"] })).toEqual(["success"]);
    expect(selecionadosIniciais({ origem: "passo", acoes: [], tipoDoCartao: "x", resultados: ["erro"] })).toEqual(["erro"]);
  });

  it("primeiroPassoComProblema e podeReenviar", () => {
    const ok = { type: "a", status: "success" as const };
    expect(primeiroPassoComProblema([ok, { type: "b", status: "skipped" }, { type: "c", status: "failed" }])?.indice).toBe(1);
    expect(primeiroPassoComProblema([ok, ok])).toBeNull();
    const hook = { type: "call_webhook", status: "failed" as const };
    expect(podeReenviar({ eventoId: "e1", resultados: [hook] })).toBe(true);
    expect(podeReenviar({ eventoId: null, resultados: [hook] })).toBe(false);
    expect(podeReenviar({ eventoId: "e1", resultados: [{ ...hook, status: "success" }] })).toBe(false);
    expect(podeReenviar({ eventoId: "e1", resultados: [{ type: "send_email", status: "failed" }] })).toBe(false);
  });
});

describe("acoesDeCadaPasso", () => {
  it("conta a fila do motor, expandindo o passo 'Ações'", () => {
    const desenho: Desenho = {
      caixas: [
        { id: "gatilho", type: "gatilho", position: { x: 0, y: 0 }, data: { kind: "gatilho", evento: "lead.created", tela: TELA } },
        { id: "acao-1", type: "acao", position: { x: 0, y: 0 }, data: { kind: "acao", acao: { type: "send_whatsapp_message", config: {} } } },
        {
          id: "acao-2",
          type: "acao",
          position: { x: 0, y: 0 },
          data: dadosDoGrupo([
            { type: "add_tag", config: {} },
            { type: "call_webhook", config: {} },
          ]),
        },
      ],
      ligacoes: [
        { id: "l1", source: "gatilho", target: "acao-1" },
        { id: "l2", source: "acao-1", target: "acao-2" },
      ],
    };
    const mapa = acoesDeCadaPasso(desenho);
    expect(mapa.get("acao-1")).toEqual([{ indice: 0, tipo: "send_whatsapp_message" }]);
    expect(mapa.get("acao-2")).toEqual([
      { indice: 1, tipo: "add_tag" },
      { indice: 2, tipo: "call_webhook" },
    ]);
  });
});

describe("schema da query", () => {
  it("período ausente vira 30d e pagina vira 1", () => {
    expect(filtroDasExecucoesSchema.parse({})).toMatchObject({ periodo: "30d", pagina: 1 });
  });
  it("recusa lista desconhecida, chave estranha e busca grande", () => {
    expect(filtroDasExecucoesSchema.safeParse({ situacoes: "ok" }).success).toBe(false);
    expect(filtroDasExecucoesSchema.safeParse({ resultados: "sucesso,xx" }).success).toBe(false);
    expect(filtroDasExecucoesSchema.safeParse({ passos: "1" }).success).toBe(false);
    expect(filtroDasExecucoesSchema.safeParse({ foo: "1" }).success).toBe(false);
    expect(filtroDasExecucoesSchema.safeParse({ busca: "x".repeat(81) }).success).toBe(false);
  });
  it("monta o pedido com passos indice:tipo", () => {
    const f = filtroDasExecucoesSchema.parse({ passos: "1:call_webhook,2:add_tag", resultados: "erro", pagina: "3", busca: " ana " });
    const p = pedidoDeExecucoes(f, new Date("2026-10-31T12:00:00Z"), 10, 20);
    expect(p).toMatchObject({
      acoes: [
        { indice: 1, tipo: "call_webhook" },
        { indice: 2, tipo: "add_tag" },
      ],
      resultados: ["erro"],
      situacoes: null,
      busca: "ana",
      limite: 10,
      deslocamento: 20,
      desde: "2026-10-01T12:00:00.000Z",
    });
  });
});
