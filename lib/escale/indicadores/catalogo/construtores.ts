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

export function coluna(chave: string, nome: string, sql: string, precisa?: readonly string[]): ColunaDoDetalhamento {
  return { chave, nome, sql, ...(precisa ? { precisa } : {}) };
}

/** `left join` de perfil de usuário por uma coluna da base. */
export const juntarPerfil = (alias: string, coluna_: string): string =>
  `left join public.profiles ${alias} on ${alias}.id = ${coluna_}`;
