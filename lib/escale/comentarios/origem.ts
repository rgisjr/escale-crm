import type { PlataformaDeComentario } from "./constantes";

/** FORK ESCALE · Fase 10C: o que a ficha do contato mostra de cada comentário. */
export interface ComentarioDoContato {
  /** Id do disparo. */
  id: string;
  plataforma: PlataformaDeComentario;
  texto: string;
  /** ISO. */
  comentadoEm: string;
  repetido: boolean;
  publicacao: { id: string; legenda: string | null; miniatura: string | null; link: string | null };
  automacao: { id: string; nome: string };
}

export interface ComentariosDoContato {
  /** O disparo mais antigo (D2); null = o contato não veio de comentário. */
  origem: ComentarioDoContato | null;
  /** Os 10 mais recentes (inclui a origem, se estiver entre eles). */
  recentes: ComentarioDoContato[];
  total: number;
}

export const COMENTARIOS_RECENTES_NA_FICHA = 10;

const HOSTS_DA_PUBLICACAO = ["instagram.com", "facebook.com", "fb.com"] as const;
const TAMANHO_MAXIMO_DA_URL = 2000;
const TAMANHO_MAXIMO_DA_LEGENDA = 300;

/** D7: só `https:` de Instagram/Facebook (ou subdomínio). Qualquer outra coisa vira null. */
export function linkDaPublicacao(link: string | null | undefined): string | null {
  if (!link || link.length > TAMANHO_MAXIMO_DA_URL) return null;
  try {
    const url = new URL(link);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const confiavel = HOSTS_DA_PUBLICACAO.some((h) => host === h || host.endsWith(`.${h}`));
    return confiavel ? link : null;
  } catch {
    return null;
  }
}

/** D7: só `https:`, até 2.000 caracteres (as miniaturas vêm de CDN da Meta, com host variável). */
export function miniaturaSegura(url: string | null | undefined): string | null {
  if (!url || url.length > TAMANHO_MAXIMO_DA_URL) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** D1: as colunas da 9802 a partir do `publicacao` do payload do evento. */
export function colunasDaPublicacao(publicacao: {
  legenda: string | null;
  miniatura: string | null;
  link: string | null;
}): {
  publicacao_legenda: string | null;
  publicacao_miniatura: string | null;
  publicacao_link: string | null;
} {
  const legenda = publicacao.legenda?.trim() ?? "";
  return {
    publicacao_legenda: legenda === "" ? null : legenda.slice(0, TAMANHO_MAXIMO_DA_LEGENDA),
    publicacao_miniatura: miniaturaSegura(publicacao.miniatura),
    publicacao_link: linkDaPublicacao(publicacao.link),
  };
}
