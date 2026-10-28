/** Atalhos para declarar o catálogo sem repetir a forma dos objetos (Fase 7A). */
import type {
  CampoDeTempo,
  ColunaDoDetalhamento,
  Dimensao,
  Medida,
  Unidade,
} from "./tipos";

interface ExtraDaMedida {
  apelidos?: readonly string[];
  perguntas?: readonly string[];
  antesDeUsar?: string;
  moeda?: boolean;
  precisa?: readonly string[];
}

const MARCA_DO_FILTRO = "filter (where ";
/** Durações que listam registros mesmo sendo médias de intervalo (T8). */
const DURACOES_COM_DETALHE: ReadonlySet<string> = new Set(["negocio.ciclo_de_venda", "negocio.tempo_ate_perda"]);

/** O predicado do único `filter (where …)` do SQL (parênteses balanceados), ou `null`. */
export function predicadoDoFiltro(sql: string): string | null {
  const inicio = sql.indexOf(MARCA_DO_FILTRO);
  if (inicio < 0 || sql.indexOf(MARCA_DO_FILTRO, inicio + 1) >= 0) return null;
  const comeco = inicio + MARCA_DO_FILTRO.length;
  let fundo = 1;
  for (let i = comeco; i < sql.length; i++) {
    if (sql[i] === "(") fundo++;
    else if (sql[i] === ")" && --fundo === 0) return sql.slice(comeco, i);
  }
  return null;
}

/** Fase 7E (T8): taxas e médias de intervalo não têm detalhamento; o resto lista as linhas que a medida conta. */
function detalheDaMedida(id: string, unidade: Unidade, sql: string): Pick<Medida, "detalheSql" | "semDetalhe"> {
  const intervalo = unidade === "duracao" && /extract\(epoch/.test(sql) && !DURACOES_COM_DETALHE.has(id);
  if (unidade === "percentual" || intervalo) return { semDetalhe: true };
  const predicado = predicadoDoFiltro(sql);
  return predicado ? { detalheSql: predicado } : {};
}

/** Medida: o id recebe o prefixo do assunto; apelidos e perguntas têm padrão derivado do nome. */
export function medida(
  assunto: string,
  chave: string,
  nome: string,
  unidade: Unidade,
  sql: string,
  descricao: string,
  extra: ExtraDaMedida = {},
): Medida {
  const minusculo = nome.toLowerCase();
  const dinheiro = extra.moeda ?? /value_cents/.test(sql);
  return {
    id: `${assunto}.${chave}`,
    nome,
    unidade,
    sql,
    descricao,
    // O nome em minúsculas e a chave por extenso sempre valem como apelido, além dos escolhidos.
    apelidos: [...new Set([...(extra.apelidos ?? []), minusculo, chave.replace(/_/g, " ")])],
    perguntas: extra.perguntas ?? [`Qual é a ${minusculo}?`, `Como está a ${minusculo} no período?`],
    ...(extra.antesDeUsar ? { antesDeUsar: extra.antesDeUsar } : {}),
    ...(dinheiro ? { moeda: true } : {}),
    ...(extra.precisa ? { precisa: extra.precisa } : {}),
    ...detalheDaMedida(`${assunto}.${chave}`, unidade, sql),
  };
}

type ExtraDaDimensao = Partial<Omit<Dimensao, "id" | "nome" | "tipo" | "sql">>;

export function dimensao(
  assunto: string,
  chave: string,
  nome: string,
  tipo: Dimensao["tipo"],
  sql: string,
  extra: ExtraDaDimensao = {},
): Dimensao {
  return { id: `${assunto}.${chave}`, nome, tipo, sql, ...extra };
}

export function tempo(
  assunto: string,
  chave: string,
  nome: string,
  sql: string,
  extra: { padrao?: boolean; precisa?: readonly string[] } = {},
): CampoDeTempo {
  return { id: `${assunto}.${chave}`, nome, sql, ...extra };
}

export function coluna(
  chave: string,
  nome: string,
  sql: string,
  precisa?: readonly string[],
  extra: Pick<ColunaDoDetalhamento, "formato" | "tipo"> = {},
): ColunaDoDetalhamento {
  return { chave, nome, sql, ...(precisa ? { precisa } : {}), ...extra };
}

