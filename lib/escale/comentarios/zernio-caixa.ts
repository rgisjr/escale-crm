import type { AutorDoComentario, PublicacaoDaCaixa } from "./caixa";
import { COMENTARIOS_POR_PAGINA, PUBLICACOES_POR_PAGINA, type OrdemDaCaixa } from "./constantes";
import { linkDaPublicacao, miniaturaSegura } from "./origem";
import { pedir, type RespostaDoZernio } from "./zernio";

/**
 * FORK ESCALE · Fase 10A: a leitura de comentários do Zernio para a caixa. O contrato (SDK 0.0.1300)
 * é frágil e não foi provado com a chave de produção: os leitores aceitam as variantes dos nomes
 * (plano 10A, seção 2.3) e nunca lançam. A prova real fica para a bateria.
 */
export interface PaginaDoZernio<T> {
  itens: T[];
  proximo: string | null;
}

export interface ComentarioDoZernio {
  id: string;
  texto: string;
  comentadoEm: string;
  autor: AutorDoComentario;
  oculto: boolean;
  curtido: boolean | null;
  curtidas: number | null;
  respostas: ComentarioDoZernio[];
}

const objeto = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const texto = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const numero = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const booleano = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const primeiro = <T>(...valores: Array<T | null | undefined>): T | null => valores.find((v) => v != null) ?? null;

/** O cursor: `pagination.nextCursor` (com `hasMore` false → null) ou `nextCursor`. */
function cursorDaPagina(dados: unknown): string | null {
  const raiz = objeto(dados);
  const paginacao = objeto(raiz.pagination);
  if (paginacao.hasMore === false) return null;
  return texto(paginacao.nextCursor) ?? texto(raiz.nextCursor);
}

/** A lista vem em `data` ou na chave de cada recurso. */
function listaDe(dados: unknown, chave: "posts" | "comments"): unknown[] {
  const raiz = objeto(dados);
  for (const candidato of [raiz.data, raiz[chave], objeto(raiz.data)[chave]]) {
    if (Array.isArray(candidato)) return candidato;
  }
  return [];
}

export function lerPublicacoes(dados: unknown): PaginaDoZernio<PublicacaoDaCaixa> {
  const itens = listaDe(dados, "posts").flatMap((bruto): PublicacaoDaCaixa[] => {
    const p = objeto(bruto);
    const id = texto(p.id);
    if (!id) return [];
    return [
      {
        id,
        legenda: primeiro(texto(p.content), texto(p.message)),
        miniatura: miniaturaSegura(primeiro(texto(p.picture), texto(p.thumbnailUrl), texto(p.imageUrl))),
        link: linkDaPublicacao(texto(p.permalink)),
        tipo: primeiro(texto(p.mediaType), texto(p.type)),
        publicadaEm: primeiro(texto(p.createdTime), texto(p.createdAt)),
        ultimoComentarioEm: primeiro(texto(p.lastCommentTime), texto(p.lastCommentAt)),
        comentarios: numero(p.commentCount),
        semResposta: primeiro(numero(p.unansweredCount), numero(p.unrepliedCount)),
      },
    ];
  });
  return { itens, proximo: cursorDaPagina(dados) };
}

function lerAutor(bruto: unknown, contaId: string): AutorDoComentario | null {
  const a = objeto(bruto);
  const id = texto(a.id);
  if (!id) return null;
  const foto = texto(a.picture);
  return {
    id,
    usuario: primeiro(texto(a.username), texto(a.userName)),
    nome: texto(a.name),
    foto: foto?.startsWith("https:") ? foto : null,
    daPropriaConta: primeiro(booleano(a.isOwner), booleano(a.isOwnAccount)) ?? id === contaId,
  };
}

function lerUmComentario(bruto: unknown, contaId: string, nivel: number): ComentarioDoZernio | null {
  const c = objeto(bruto);
  const id = texto(c.id);
  const autor = lerAutor(c.from ?? c.author, contaId);
  if (!id || !autor) return null;
  const respostasBrutas = Array.isArray(c.replies) ? c.replies : objeto(c.replies).data;
  const respostas =
    nivel < 1 && Array.isArray(respostasBrutas)
      ? respostasBrutas.flatMap((r): ComentarioDoZernio[] => {
          const lida = lerUmComentario(r, contaId, nivel + 1);
          return lida ? [lida] : [];
        })
      : [];
  return {
    id,
    texto: primeiro(texto(c.message), texto(c.text)) ?? "",
    comentadoEm: primeiro(texto(c.createdTime), texto(c.createdAt)) ?? "",
    autor,
    oculto: primeiro(booleano(c.isHidden), booleano(c.hidden)) ?? false,
    curtido: primeiro(booleano(c.isLiked), booleano(c.liked)),
    curtidas: numero(c.likeCount),
    respostas,
  };
}

export function lerComentarios(dados: unknown, contaId: string): PaginaDoZernio<ComentarioDoZernio> {
  const itens = listaDe(dados, "comments").flatMap((bruto): ComentarioDoZernio[] => {
    const lido = lerUmComentario(bruto, contaId, 0);
    return lido ? [lido] : [];
  });
  return { itens, proximo: cursorDaPagina(dados) };
}

/** GET inbox/comments?accountId=&limit=&cursor=&since=&sortBy= — as publicações da conta com comentários. */
export async function listarPublicacoesComComentarios(
  chave: string,
  e: { accountId: string; cursor: string | null; desde: string | null; ordem: OrdemDaCaixa },
): Promise<RespostaDoZernio<PaginaDoZernio<PublicacaoDaCaixa>>> {
  const query = new URLSearchParams({ accountId: e.accountId, limit: String(PUBLICACOES_POR_PAGINA) });
  if (e.cursor) query.set("cursor", e.cursor);
  if (e.desde) query.set("since", e.desde);
  query.set("sortBy", e.ordem === "mais_comentarios" ? "comments" : "date");
  const r = await pedir<unknown>(chave, `inbox/comments?${query.toString()}`, "GET");
  return r.ok ? { ok: true, dados: lerPublicacoes(r.dados) } : r;
}

/** GET inbox/comments/{postId}?accountId=&limit=&cursor= — os comentários (com respostas) de uma publicação. */
export async function listarComentarios(
  chave: string,
  e: { accountId: string; postId: string; cursor: string | null },
): Promise<RespostaDoZernio<PaginaDoZernio<ComentarioDoZernio>>> {
  const query = new URLSearchParams({ accountId: e.accountId, limit: String(COMENTARIOS_POR_PAGINA) });
  if (e.cursor) query.set("cursor", e.cursor);
  const r = await pedir<unknown>(chave, `inbox/comments/${encodeURIComponent(e.postId)}?${query.toString()}`, "GET");
  return r.ok ? { ok: true, dados: lerComentarios(r.dados, e.accountId) } : r;
}
