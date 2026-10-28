/** Índice do catálogo de Indicadores (fork Escale, Fase 7A). */
import { ATIVIDADE } from "./assuntos/atividade";
import { CAMPANHA } from "./assuntos/campanha";
import { CONTATO } from "./assuntos/contato";
import { CONVERSA } from "./assuntos/conversa";
import { EMPRESA } from "./assuntos/empresa";
import { HISTORICO } from "./assuntos/historico-do-negocio";
import { LIGACAO } from "./assuntos/ligacao";
import { MENSAGEM } from "./assuntos/mensagem";
import { NEGOCIO } from "./assuntos/negocio";
import type { Assunto, Categoria, CampoDeTempo, Dimensao, Medida } from "./tipos";

export const CATALOGO: readonly Assunto[] = [
  NEGOCIO,
  HISTORICO,
  ATIVIDADE,
  CONVERSA,
  MENSAGEM,
  CONTATO,
  EMPRESA,
  LIGACAO,
  CAMPANHA,
];

const POR_ID = new Map(CATALOGO.map((a) => [a.id, a]));

/** O assunto de um id do catálogo (prefixo antes do ponto). Campo personalizado não tem assunto. */
export function assuntoDe(id: string): Assunto | null {
  if (id.startsWith("campo:")) return null;
  const ponto = id.indexOf(".");
  if (ponto < 1) return null;
  return POR_ID.get(id.slice(0, ponto)) ?? null;
}

export function medidaPorId(id: string): { assunto: Assunto; medida: Medida } | null {
  const assunto = assuntoDe(id);
  const medida = assunto?.medidas.find((m) => m.id === id);
  return assunto && medida ? { assunto, medida } : null;
}

export function dimensaoPorId(id: string): { assunto: Assunto; dimensao: Dimensao } | null {
  const assunto = assuntoDe(id);
  const dimensao = assunto?.dimensoes.find((d) => d.id === id);
  return assunto && dimensao ? { assunto, dimensao } : null;
}

export function tempoPorId(id: string): { assunto: Assunto; tempo: CampoDeTempo } | null {
  const assunto = assuntoDe(id);
  const tempo = assunto?.tempos.find((t) => t.id === id);
  return assunto && tempo ? { assunto, tempo } : null;
}

const normalizar = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export interface ResultadoDaBusca {
  assunto: Assunto;
  medidas: Medida[];
  dimensoes: Dimensao[];
}

/** Busca sem acento nem maiúscula por nome, apelido e pergunta (o popover "Adicionar Indicador"). */
export function buscar(termo: string): ResultadoDaBusca[] {
  const alvo = normalizar(termo.trim());
  if (!alvo) return [];
  const resultados: ResultadoDaBusca[] = [];
  for (const assunto of CATALOGO) {
    const medidas = assunto.medidas.filter((m) =>
      [m.nome, ...m.apelidos, ...m.perguntas].some((texto) => normalizar(texto).includes(alvo)),
    );
    const dimensoes = assunto.dimensoes.filter((d) => normalizar(d.nome).includes(alvo));
    if (medidas.length || dimensoes.length) resultados.push({ assunto, medidas, dimensoes });
  }
  return resultados;
}

export function porCategoria(categoria: Categoria | "todos"): readonly Assunto[] {
  return categoria === "todos" ? CATALOGO : CATALOGO.filter((a) => a.categoria === categoria);
}
