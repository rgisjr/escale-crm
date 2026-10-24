import { modeloDaCampanha as modeloDaMensagem } from "@/lib/escale/campanhas/modelo";

import type { ModeloDaCampanha } from "./tipos";

/**
 * A MENSAGEM NA PRÉVIA DO CELULAR (fork Escale, Fase 8C; N7; 009, 010). As
 * variáveis do renderizador do original viram chip; raiz desconhecida fica
 * literal, como no envio. O modelo da Meta vem da `escale_mensagem` da 8B, lido
 * num lugar só.
 */
const TOKEN = /\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\s*\}\}/g;

export type ParteDaMensagem =
  | { tipo: "texto"; texto: string }
  | { tipo: "variavel"; chave: string; rotulo: string; traduzivel: boolean };

const ROTULO_DA_VARIAVEL: Readonly<Record<string, string>> = {
  nome: "Nome",
  primeiro_nome: "Primeiro nome",
  saudacao: "Saudação",
};

function rotuloDaVariavel(chave: string): { rotulo: string; traduzivel: boolean } | null {
  if (Object.hasOwn(ROTULO_DA_VARIAVEL, chave))
    return { rotulo: ROTULO_DA_VARIAVEL[chave]!, traduzivel: true };
  if (/^\d+$/.test(chave)) return { rotulo: `{{${chave}}}`, traduzivel: false };
  const [raiz, ...resto] = chave.split(".");
  if ((raiz === "lead" || raiz === "contato") && resto.length > 0) {
    return { rotulo: resto[resto.length - 1]!.replace(/_/g, " "), traduzivel: false };
  }
  return null;
}

export function partesDaMensagem(texto: string | null): ParteDaMensagem[] {
  if (!texto) return [];
  const partes: ParteDaMensagem[] = [];
  const somarTexto = (s: string) => {
    if (!s) return;
    const ultima = partes[partes.length - 1];
    if (ultima?.tipo === "texto")
      partes[partes.length - 1] = { tipo: "texto", texto: ultima.texto + s };
    else partes.push({ tipo: "texto", texto: s });
  };
  let cursor = 0;
  for (const m of texto.matchAll(TOKEN)) {
    const inicio = m.index ?? 0;
    somarTexto(texto.slice(cursor, inicio));
    const r = rotuloDaVariavel(m[1]!);
    if (r) partes.push({ tipo: "variavel", chave: m[1]!, ...r });
    else somarTexto(m[0]);
    cursor = inicio + m[0].length;
  }
  somarTexto(texto.slice(cursor));
  return partes;
}

/**
 * O modelo da Meta que a 8B grava em `campaigns.escale_mensagem` (um lugar só:
 * `modeloDaCampanha` da 8B). Texto livre e campanha do original: `null`.
 */
export function modeloDaCampanha(
  linha: Readonly<{ escale_mensagem?: unknown }>,
): ModeloDaCampanha | null {
  const m = modeloDaMensagem(linha.escale_mensagem);
  if (!m) return null;
  return { nome: m.nome, idioma: m.idioma, categoria: m.categoria };
}

export const ROTULO_DA_CATEGORIA: Readonly<Record<string, string>> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidade",
  AUTHENTICATION: "Autenticação",
};

/** "pt_BR" → "BR" (o selo do 010); "en" → "EN". */
export function siglaDoIdioma(idioma: string | null): string | null {
  if (!idioma) return null;
  return (idioma.split(/[_-]/)[1] ?? idioma).toUpperCase();
}
