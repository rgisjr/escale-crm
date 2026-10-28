/** Regras puras do indicador calculado no editor (fork Escale, Fase 7E, T4 e T22). */
import type { TipoDeGrafico } from "../graficos/tipos";
import type { Calculado, FormatoDoCalculado, Operacao } from "../pergunta";

export { calculadoSchema } from "../pergunta";

export const SIMBOLO_DA_OPERACAO: Record<Operacao, string> = { soma: "+", subtracao: "−", multiplicacao: "×", divisao: "÷" };
export const ROTULO_DA_OPERACAO: Record<Operacao, string> = {
  soma: "soma",
  subtracao: "subtração",
  multiplicacao: "multiplicação",
  divisao: "divisão",
};
export const ROTULO_DO_FORMATO: Record<FormatoDoCalculado, string> = { moeda: "Moeda", percentual: "Percentual", numero: "Número" };
export const FORMATOS_NA_ORDEM_DA_TELA: readonly FormatoDoCalculado[] = ["moeda", "percentual", "numero"];

/** Pizza e Donut só aceitam somar ou multiplicar: as fatias precisam ser partes do todo. */
export function operacoesDoTipo(tipo: TipoDeGrafico): readonly Operacao[] {
  return tipo === "pizza" || tipo === "donut" ? ["soma", "multiplicacao"] : ["soma", "subtracao", "multiplicacao", "divisao"];
}

/** "Percentual" só vale na divisão, porque mostra a razão entre os dois indicadores. */
export function formatosDaOperacao(op: Operacao): readonly FormatoDoCalculado[] {
  return op === "divisao" ? ["moeda", "percentual", "numero"] : ["moeda", "numero"];
}

/** "Negócio Quantidade ÷ Negócio Soma de valores · divisão". */
export function textoDaFormula(c: Pick<Calculado, "a" | "b" | "op">, nomeDe: (id: string) => string): string {
  return `${nomeDe(c.a)} ${SIMBOLO_DA_OPERACAO[c.op]} ${nomeDe(c.b)} · ${ROTULO_DA_OPERACAO[c.op]}`;
}

const semAcento = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** `calc:` + o nome sem acento em minúsculas (até 40), com sufixo numérico quando o id já existe. */
export function idDoCalculado(nome: string, existentes: readonly string[]): string {
  const base = semAcento(nome).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 36) || "calculado";
  let id = `calc:${base}`;
  for (let n = 2; existentes.includes(id); n++) id = `calc:${base}_${n}`;
  return id;
}

/** A operação serve ao tipo? (usada ao trocar de tipo com calculados já feitos.) */
export const calculadoServeAoTipo = (c: Pick<Calculado, "op">, tipo: TipoDeGrafico): boolean => operacoesDoTipo(tipo).includes(c.op);
