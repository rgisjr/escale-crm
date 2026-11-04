// @vitest-environment node
import { describe, expect, it } from "vitest";

import { passosSchema } from "@/lib/automation/envio-de-passos";
import {
  configDosItens,
  itensDaConfig,
  novoIdDeBotao,
  problemaDaSequencia,
  recusaDeAdicionar,
  type ItemDaSequencia,
} from "@/lib/escale/automacoes/fluxo/sequencia";

const texto = (t: string, botoes: string[] = []): ItemDaSequencia => ({ chave: `k-${t}`, tipo: "texto", texto: t, botoes: botoes.map((b, i) => ({ id: `b-${i + 1}`, titulo: b })) });
const midia = (asset: string): ItemDaSequencia => ({ chave: `m-${asset}`, tipo: "midia", asset, legenda: "" });
const pausa = (segundos: number): ItemDaSequencia => ({ chave: `p-${segundos}`, tipo: "pausa", segundos });

describe("a sequência da mensagem", () => {
  it("um texto só continua `template` (o formato de sempre)", () => {
    expect(configDosItens({ channel_session_id: "conversation" }, [texto("Oi")], null)).toEqual({ channel_session_id: "conversation", template: "Oi" });
  });

  it("o Datacrazy na tela: áudio, pausa 4, texto com 9 botões (lista), pausa 4, áudio", () => {
    const nove = Array.from({ length: 9 }, (_, i) => `Opção ${i + 1}`);
    const itens = [midia("var:bv1"), pausa(4), texto("Aonde?", nove), pausa(4), midia("var:bv2")];
    const config = configDosItens({}, itens, null);
    const passos = passosSchema.parse(config.passos);
    expect(passos).toHaveLength(5);
    expect(passos[2]).toMatchObject({ tipo: "interativo", interativo: { tipo: "lista", botaoDaLista: "Ver opções" } });
    expect(problemaDaSequencia(itens, null)).toBeNull();
  });

  it("até 3 botões são botões; 'não respondeu' grava o tempo e força passos", () => {
    const config = configDosItens({}, [texto("Oi", ["Sim", "Não"])], { quantidade: 15, unidade: "minutos" });
    expect(config).toMatchObject({ tempo_de_resposta: { quantidade: 15, unidade: "minutos" } });
    expect(passosSchema.parse(config.passos)[0]).toMatchObject({ interativo: { tipo: "botoes" } });
    expect(configDosItens({}, [texto("Oi")], { quantidade: 1, unidade: "minutos" })).toHaveProperty("passos");
  });

  it("lê de volta o que gravou", () => {
    const itens = [texto("Oi", ["Sim"]), pausa(2), midia("var:x")];
    const volta = itensDaConfig(configDosItens({}, [itens[0]!, pausa(2), texto("fim")], null));
    expect(volta.map((i) => i.tipo)).toEqual(["texto", "pausa", "texto"]);
    expect(volta[0]).toMatchObject({ botoes: [{ id: "b-1", titulo: "Sim" }] });
    expect(itensDaConfig({ template: "A" })[0]).toMatchObject({ tipo: "texto", texto: "A" });
  });

  it("a pausa não vai no começo, nem duas seguidas, nem no fim", () => {
    expect(recusaDeAdicionar([], "pausa")).toBe("O primeiro item da lista não pode ser um atraso.");
    expect(recusaDeAdicionar([texto("a"), pausa(2)], "pausa")).toBe("Não é possível adicionar mais delay entre as mensagens.");
    expect(recusaDeAdicionar([texto("a")], "pausa")).toBeNull();
    expect(problemaDaSequencia([texto("a"), pausa(2)], null)).toBe("O último item da lista não pode ser um atraso.");
  });

  it("recusa botão grande, botão vazio, texto vazio e tempo de resposta zerado", () => {
    expect(problemaDaSequencia([texto("a", ["x".repeat(21)])], null)).toBe("O texto do botão deve ter no máximo 20 caracteres");
    expect(problemaDaSequencia([texto("a", [""])], null)).toBe("Dê um texto a cada botão");
    expect(problemaDaSequencia([texto("  ")], null)).toBe("Escreva a mensagem");
    expect(problemaDaSequencia([texto("a")], { quantidade: 0, unidade: "minutos" })).toBe("O tempo mínimo de resposta é de 1 minuto.");
  });

  it("o id de botão novo não repete nenhum da mensagem", () => {
    expect(novoIdDeBotao([texto("a", ["x", "y"])])).toBe("b-3");
  });
});
