/** Os operadores do filtro do editor (fork Escale, Fase 7D): rótulos de 10-064 e o que cada tipo aceita. */
import { OPERADORES, operadorServe, type Operador } from "../pergunta";
import type { TipoDeDimensao } from "../catalogo/tipos";
import type { ItemDoCatalogo } from "./catalogo-da-tela";

export const ROTULO_DO_OPERADOR: Record<Operador, string> = {
  igual_a: "igual a",
  diferente_de: "diferente de",
  contem: "contém",
  nao_contem: "não contém",
  comeca_com: "começa com",
  termina_com: "termina com",
  maior_que: "maior que",
  maior_ou_igual_a: "maior ou igual a",
  menor_que: "menor que",
  menor_ou_igual_a: "menor ou igual a",
  nao_vazio: "não está vazio",
  vazio: "está vazio",
};

/** O que `validarPergunta` (7A) aceita para o tipo, na ordem dos rótulos. */
export function operadoresDoTipo(t: TipoDeDimensao): readonly Operador[] {
  return OPERADORES.filter((op) => operadorServe(t, op));
}

export const precisaDeValor = (op: Operador): boolean => op !== "vazio" && op !== "nao_vazio";
export const usaLista = (item: Pick<ItemDoCatalogo, "opcoes"> | undefined, op: Operador): boolean =>
  Boolean(item?.opcoes) && (op === "igual_a" || op === "diferente_de");

/** "1.234,5" → 1234.5 (mesma regra de `numeroDoValor` da lista de contatos). */
export function textoDoNumeroBr(v: string): number | null {
  const limpo = v.trim().replace(/[^\d,.-]/g, "");
  if (limpo === "" || limpo === "-") return null;
  const normal = limpo.includes(",") || /^-?\d{1,3}(\.\d{3})+$/.test(limpo) ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}
