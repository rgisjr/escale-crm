import { describe, expect, it } from "vitest";

import { desenhoDaRegra, validarDesenho, type AcaoDaRegra, type RegraGravada } from "@/lib/automation/desenho-da-regra";
import {
  PROBLEMA_DO_GRUPO_VAZIO,
  TIPO_DO_GRUPO,
  achatar,
  acoesDoGrupo,
  agrupar,
  contarAcoes,
  dadosDoGrupo,
  ehGrupo,
  gruposVazios,
  idNaTela,
  novoGrupo,
} from "@/lib/escale/automacoes/fluxo/grupos";

/**
 * O passo "Ações" da Clint tem várias ações dentro; o motor tem uma ação por passo. O
 * agrupamento é só de tela, e o corpo gravado tem de sair igual ao de sempre.
 */
const U1 = "11111111-1111-4111-8111-111111111111";
const tag = (t: string): AcaoDaRegra => ({ type: "add_tag", config: { tags: [t] } });
const zap: AcaoDaRegra = { type: "send_whatsapp_message", config: { channel_session_id: U1, template: "Oi" } };

function regra(actions: AcaoDaRegra[]): RegraGravada {
  return { trigger_event: "contact.tag_added", trigger_config: {}, conditions: [], actions };
}
const tipos = (d: ReturnType<typeof desenhoDaRegra>) => d.caixas.map((c) => (c.data.kind === "acao" ? c.data.acao.type : c.data.kind));

describe("agrupar", () => {
  it("ações seguidas do mesmo tipo viram um passo; WhatsApp segue como passo próprio", () => {
    const tela = agrupar(desenhoDaRegra(regra([tag("a"), tag("b"), zap, tag("c")])));
    expect(tipos(tela)).toEqual(["gatilho", TIPO_DO_GRUPO, "send_whatsapp_message", TIPO_DO_GRUPO]);
    expect(tela.caixas.map((c) => c.id)).toEqual(["gatilho", "acao-1", "acao-3", "acao-4"]);
    expect(acoesDoGrupo(tela.caixas[1]!.data)).toEqual([tag("a"), tag("b")]);
    expect(tela.ligacoes.map((l) => [l.source, l.target])).toEqual([
      ["gatilho", "acao-1"],
      ["acao-1", "acao-3"],
      ["acao-3", "acao-4"],
    ]);
  });

  it("a regra sem ação nenhuma não ganha passo", () => {
    expect(tipos(agrupar(desenhoDaRegra(regra([]))))).toEqual(["gatilho"]);
  });
});

describe("achatar", () => {
  it("volta a ser uma caixa por ação, na ordem, ligadas em fila", () => {
    const original = [tag("a"), tag("b"), zap, tag("c")];
    const plano = achatar(agrupar(desenhoDaRegra(regra(original))));
    expect(plano.caixas.map((c) => c.id)).toEqual(["gatilho", "acao-1__0", "acao-1__1", "acao-3", "acao-4__0"]);
    const ligacoes = plano.ligacoes.map((l) => [l.source, l.target]);
    expect(ligacoes).toContainEqual(["acao-1__0", "acao-1__1"]);
    expect(ligacoes).toContainEqual(["acao-1__1", "acao-3"]);
    expect(ligacoes).toContainEqual(["acao-3", "acao-4__0"]);
    expect(ligacoes).toContainEqual(["gatilho", "acao-1__0"]);
  });

  it("o passo vazio some e a fila se fecha por cima dele", () => {
    const tela = agrupar(desenhoDaRegra(regra([tag("a"), zap])));
    const comVazio = {
      caixas: [...tela.caixas, novoGrupo("acao-9", { x: 0, y: 0 })],
      ligacoes: [
        { id: "l1", source: "gatilho", target: "acao-1" },
        { id: "l2", source: "acao-1", target: "acao-9" },
        { id: "l3", source: "acao-9", target: "acao-2" },
      ],
    };
    const plano = achatar(comVazio);
    expect(plano.caixas.map((c) => c.id)).toEqual(["gatilho", "acao-1__0", "acao-2"]);
    expect(plano.ligacoes.map((l) => [l.source, l.target])).toContainEqual(["acao-1__0", "acao-2"]);
  });

  it("o corpo gravado é o MESMO da regra, para qualquer mistura de passos", () => {
    const casos = [[tag("a")], [tag("a"), tag("b"), tag("c")], [zap, tag("a")], [tag("a"), zap, tag("b"), zap], [zap, zap]];
    for (const actions of casos) {
      const r = regra(actions);
      const direto = validarDesenho({ nome: "x", desenho: desenhoDaRegra(r), regraGravada: r });
      const viaGrupos = validarDesenho({ nome: "x", desenho: achatar(agrupar(desenhoDaRegra(r))), regraGravada: r });
      expect(viaGrupos.ok, JSON.stringify(viaGrupos.problemas)).toBe(true);
      expect(viaGrupos.corpo).toEqual(direto.corpo);
      expect(viaGrupos.corpo.actions).toEqual(actions);
    }
  });
});

describe("peças do grupo", () => {
  it("ehGrupo, acoesDoGrupo, dadosDoGrupo e a contagem", () => {
    const g = novoGrupo("acao-1", { x: 0, y: 0 }, [tag("a"), tag("b")]);
    expect(ehGrupo(g.data)).toBe(true);
    expect(ehGrupo({ kind: "acao", acao: tag("a") })).toBe(false);
    expect(ehGrupo({ kind: "condicoes", linhas: [] })).toBe(false);
    expect(dadosDoGrupo([tag("a")])).toEqual({ kind: "acao", acao: { type: TIPO_DO_GRUPO, config: { acoes: [tag("a")] } } });
    expect(acoesDoGrupo({ kind: "acao", acao: { type: TIPO_DO_GRUPO, config: { acoes: "torto" } } })).toEqual([]);
    const desenho = { caixas: [g, novoGrupo("acao-2", { x: 0, y: 0 }), { id: "acao-3", type: "acao" as const, position: { x: 0, y: 0 }, data: { kind: "acao" as const, acao: zap } }], ligacoes: [] };
    expect(contarAcoes(desenho)).toBe(3);
    expect(gruposVazios(desenho).map((c) => c.id)).toEqual(["acao-2"]);
    expect(PROBLEMA_DO_GRUPO_VAZIO).toMatch(/pelo menos uma ação/);
  });

  it("idNaTela devolve o passo a que a ação do desenho achatado pertence", () => {
    expect(idNaTela("acao-1__2")).toBe("acao-1");
    expect(idNaTela("acao-3")).toBe("acao-3");
    expect(idNaTela("gatilho")).toBe("gatilho");
  });
});
