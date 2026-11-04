import { describe, expect, it } from "vitest";

import { desenhoDaRegra, triggerConfigDaTela, type RegraGravada } from "@/lib/automation/desenho-da-regra";
import { configInicialDaMensagemEnviada } from "@/lib/automation/mensagem-enviada";
import { GATILHO_DE_COMENTARIO } from "@/lib/escale/comentarios/constantes";
import {
  caminhosDasPublicacoes,
  comConfigPropria,
  configInicialDoComentario,
  resumoDosCaminhos,
  telaInicialDoGatilho,
} from "@/lib/escale/comentarios/tela";
import { configDoComentarioSchema, type CaminhoDoGatilho, type ConfigDoComentario } from "@/lib/escale/comentarios/schema";

/** Fase 10B: as puras da casca para o gatilho de comentário. */
const pub = (id: string) => ({ id, legenda: null, miniatura: null, tipo: null });
const caminho = (id: string, ids: string[]): CaminhoDoGatilho => ({
  id,
  publicacoes: ids.map(pub),
  filtro: { modo: "qualquer" },
  resposta: null,
});

const gravada = (config: ConfigDoComentario): RegraGravada => ({
  trigger_event: GATILHO_DE_COMENTARIO,
  trigger_config: config,
  conditions: [],
  actions: [],
});

describe("telaInicialDoGatilho", () => {
  it("comment.received já nasce com a configuração inicial", () => {
    expect(telaInicialDoGatilho(GATILHO_DE_COMENTARIO).configPropria).toEqual(configInicialDoComentario());
  });
  it("outro evento fica sem configPropria", () => {
    expect(telaInicialDoGatilho("lead.won").configPropria).toBeUndefined();
  });
});

describe("comConfigPropria", () => {
  const config: ConfigDoComentario = {
    channel_session_id: "11111111-1111-4111-8111-111111111111",
    escopo: "especificos",
    caminhos: [caminho("caminho-1", ["179"])],
  };

  it("põe o trigger_config gravado no nó do gatilho, sem mudar a entrada", () => {
    const regra = gravada(config);
    const desenho = Object.freeze(desenhoDaRegra(regra)) as ReturnType<typeof desenhoDaRegra>;
    const novo = comConfigPropria(desenho, regra);
    const gatilho = novo.caixas.find((c) => c.id === "gatilho");
    expect(gatilho?.data.kind === "gatilho" && gatilho.data.tela.configPropria).toEqual(configDoComentarioSchema.parse(config));
    const original = desenho.caixas.find((c) => c.id === "gatilho");
    expect(original?.data.kind === "gatilho" && original.data.tela.configPropria).toBeUndefined();
  });
  it("regra de outro gatilho passa direto", () => {
    const regra: RegraGravada = { ...gravada(config), trigger_event: "lead.won", trigger_config: null };
    const desenho = desenhoDaRegra(regra);
    expect(comConfigPropria(desenho, regra)).toBe(desenho);
  });
  it("o corpo salvo sem mexer manda o mesmo trigger_config", () => {
    const regra = gravada(config);
    const novo = comConfigPropria(desenhoDaRegra(regra), regra);
    const gatilho = novo.caixas.find((c) => c.id === "gatilho");
    expect(gatilho?.data.kind === "gatilho" && triggerConfigDaTela(GATILHO_DE_COMENTARIO, gatilho.data.tela, regra)).toEqual(
      configDoComentarioSchema.parse(config),
    );
  });
});

describe("caminhosDasPublicacoes", () => {
  const tres = [pub("1"), pub("2"), pub("3")];
  it("um caminho por publicação, pulando ids que já existem", () => {
    const novos = caminhosDasPublicacoes([caminho("caminho-2", ["9"])], tres, false);
    expect(novos.map((c) => c.id)).toEqual(["caminho-2", "caminho-1", "caminho-3", "caminho-4"]);
    expect(novos[1]?.publicacoes.map((p) => p.id)).toEqual(["1"]);
  });
  it("agrupar põe todas num caminho só", () => {
    const novos = caminhosDasPublicacoes([], tres, true);
    expect(novos).toHaveLength(1);
    expect(novos[0]?.publicacoes).toHaveLength(3);
    expect(novos[0]?.id).toBe("caminho-1");
  });
  it("não muta a lista de entrada", () => {
    const existentes = Object.freeze([caminho("caminho-1", ["9"])]);
    expect(() => caminhosDasPublicacoes(existentes, tres, false)).not.toThrow();
  });
});

describe("resumoDosCaminhos", () => {
  it("conta publicações e caminhos", () => {
    const config: ConfigDoComentario = {
      channel_session_id: "x",
      escopo: "especificos",
      caminhos: [caminho("a", ["1", "2"]), caminho("b", ["3"])],
    };
    expect(resumoDosCaminhos(config)).toEqual({ publicacoes: 3, caminhos: 2 });
  });
});

describe("FORK ESCALE · gatilho Equipe envia uma mensagem", () => {
  it("nasce com a configuração inicial", () => {
    expect(telaInicialDoGatilho("message.sent").configPropria).toEqual(configInicialDaMensagemEnviada());
  });
  it("regra antiga abre convertida e salva sem mexer no formato novo, que o motor lê igual", () => {
    const regra: RegraGravada = {
      trigger_event: "message.sent",
      trigger_config: { palavra_chave: "Põe estes dados", modo: "contem" },
      conditions: [],
      actions: [],
    };
    const novo = comConfigPropria(desenhoDaRegra(regra), regra);
    const gatilho = novo.caixas.find((c) => c.id === "gatilho");
    const config = gatilho?.data.kind === "gatilho" ? triggerConfigDaTela("message.sent", gatilho.data.tela, regra) : null;
    expect(config).toEqual({
      channel_session_id: "",
      filtro: { modo: "palavras", condicoes: [{ operador: "contem", valor: "Põe estes dados" }], combinar: "qualquer" },
      em_grupos: false,
      agendadas: true,
    });
  });
});
