/**
 * Cada operador do filtro vira um fragmento SQL com parâmetros (Fase 7A). Nenhum valor do
 * cliente entra no texto: tudo vai por `$n`, e o `like` escapa `%`, `_` e `\`.
 */
import type { TipoDeDimensao } from "../catalogo/tipos";
import type { Condicao } from "../pergunta";
import { ErroDoMotor } from "./erros";

/** Os parâmetros da consulta: `$1` = organização e `$2` = fuso já vêm reservados. */
export class Parametros {
  private readonly lista: unknown[];

  constructor(orgId: string, fuso: string) {
    this.lista = [orgId, fuso];
  }

  add(valor: unknown): string {
    this.lista.push(valor);
    return `$${this.lista.length}`;
  }

  get valores(): unknown[] {
    return [...this.lista];
  }
}

const escaparLike = (texto: string): string => texto.replace(/[\\%_]/g, (c) => `\\${c}`);
const comoLista = (valor: Condicao["valor"]): string[] =>
  (Array.isArray(valor) ? valor : [valor]).map((v) => String(v ?? ""));
const invalido = (c: Condicao, tipo: TipoDeDimensao): never => {
  throw new ErroDoMotor("pergunta_invalida", `Operador ${c.op} não serve para ${tipo}.`);
};

const CAST: Record<Exclude<TipoDeDimensao, "texto">, string> = { numero: "numeric", data: "date", booleano: "boolean" };

/** `expr` já deve estar em `::text` quando a chave é uuid (o chamador decide). */
export function condicaoSql(expr: string, tipo: TipoDeDimensao, c: Condicao, p: Parametros): string {
  const { op } = c;
  if (op === "vazio") return tipo === "texto" ? `(${expr} is null or ${expr}::text = '')` : `${expr} is null`;
  if (op === "nao_vazio") return tipo === "texto" ? `(${expr} is not null and ${expr}::text <> '')` : `${expr} is not null`;

  if (tipo === "texto") return condicaoDeTexto(expr, c, p);
  if (tipo === "booleano") {
    if (op !== "igual_a" && op !== "diferente_de") return invalido(c, tipo);
    const valor = `${p.add(String(Array.isArray(c.valor) ? c.valor[0] : c.valor))}::boolean`;
    return op === "igual_a" ? `${expr} = ${valor}` : `coalesce(${expr}, false) <> ${valor}`;
  }

  const alvo = tipo === "data" ? `${expr}::date` : expr;
  const tipoSql = CAST[tipo];
  switch (op) {
    case "igual_a":
      return Array.isArray(c.valor)
        ? `${alvo} = any(${p.add(c.valor.map(String))}::${tipoSql}[])`
        : `${alvo} = ${p.add(String(c.valor))}::${tipoSql}`;
    case "diferente_de":
      return `(${expr} is null or ${alvo} <> ${p.add(String(Array.isArray(c.valor) ? c.valor[0] : c.valor))}::${tipoSql})`;
    case "maior_que":
      return `${alvo} > ${p.add(String(c.valor))}::${tipoSql}`;
    case "maior_ou_igual_a":
      return `${alvo} >= ${p.add(String(c.valor))}::${tipoSql}`;
    case "menor_que":
      return `${alvo} < ${p.add(String(c.valor))}::${tipoSql}`;
    case "menor_ou_igual_a":
      return `${alvo} <= ${p.add(String(c.valor))}::${tipoSql}`;
    default:
      return invalido(c, tipo);
  }
}

function condicaoDeTexto(expr: string, c: Condicao, p: Parametros): string {
  const texto = comoLista(c.valor);
  const like = (padrao: string) => `${expr} ilike ${p.add(padrao)} escape '\\'`;
  switch (c.op) {
    case "igual_a":
      return Array.isArray(c.valor) ? `${expr} = any(${p.add(texto)}::text[])` : `${expr} = ${p.add(texto[0])}`;
    case "diferente_de":
      return `(${expr} is null or ${expr} <> all(${p.add(texto)}::text[]))`;
    case "contem":
      return like(`%${escaparLike(texto[0])}%`);
    case "nao_contem":
      return `(${expr} is null or not (${like(`%${escaparLike(texto[0])}%`)}))`;
    case "comeca_com":
      return like(`${escaparLike(texto[0])}%`);
    case "termina_com":
      return like(`%${escaparLike(texto[0])}`);
    default:
      return invalido(c, "texto");
  }
}

export interface TagsDoPainel {
  modo: "qualquer_tag" | "sem_tag" | "lista";
  valores: string[];
  operador: "e" | "ou";
}

/** Filtro de tags do painel sobre a coluna `text[]` do assunto; `null` = nada a filtrar. */
export function tagsSql(coluna: string, tags: TagsDoPainel, p: Parametros): string | null {
  if (tags.modo === "qualquer_tag") return `coalesce(cardinality(${coluna}), 0) > 0`;
  if (tags.modo === "sem_tag") return `coalesce(cardinality(${coluna}), 0) = 0`;
  if (tags.valores.length === 0) return null;
  const operador = tags.operador === "e" ? "@>" : "&&";
  return `${coluna} ${operador} ${p.add(tags.valores)}::text[]`;
}

/** Valor de um campo personalizado como texto, número ou data, a chave sempre em parâmetro. */
export function campoPersonalizadoSql(json: string, chave: string, tipo: TipoDeDimensao, p: Parametros): string {
  const bruto = `(${json} ->> ${p.add(chave)})`;
  if (tipo === "numero") {
    const limpo = `regexp_replace(case when position(',' in ${bruto}) > 0 then replace(replace(${bruto}, '.', ''), ',', '.') else ${bruto} end, '[^0-9.-]', '', 'g')`;
    return `(case when ${limpo} ~ '^-?[0-9]+(\\.[0-9]+)?$' then ${limpo}::numeric end)`;
  }
  if (tipo === "data") return `(case when ${bruto} ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])' then left(${bruto}, 10)::date end)`;
  if (tipo === "booleano") return `(case when ${bruto} in ('true','false') then ${bruto}::boolean end)`;
  return bruto;
}
