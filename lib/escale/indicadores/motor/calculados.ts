/**
 * Indicador calculado (A op B) como coluna agregada (fork Escale, Fase 7E, T4). O nome do
 * calculado nunca entra no SQL: o alias é posicional (`c0`) e os operandos são ids do catálogo
 * trocados pelos fragmentos constantes.
 */
import type { Unidade } from "../catalogo/tipos";
import type { Calculado, Operacao } from "../pergunta";

const SIMBOLO: Record<Exclude<Operacao, "divisao">, string> = { soma: "+", subtracao: "-", multiplicacao: "*" };

/** `((A) op (B))`; divisão protegida por `nullif`, e o formato percentual multiplica por 100. */
export function sqlDoCalculado(c: Calculado, sqlDaMedida: (id: string) => string): string {
  const a = `(${sqlDaMedida(c.a)})`;
  const b = `(${sqlDaMedida(c.b)})`;
  if (c.op !== "divisao") return `(${a} ${SIMBOLO[c.op]} ${b})`;
  return c.formato === "percentual" ? `(100.0 * ${a} / nullif(${b}, 0))` : `(${a} / nullif(${b}, 0))`;
}

export function unidadeDoCalculado(c: Calculado): Unidade {
  if (c.formato === "moeda") return "valor";
  return c.formato === "percentual" ? "percentual" : "contagem";
}
