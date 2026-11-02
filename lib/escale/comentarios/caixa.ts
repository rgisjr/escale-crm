import { dentroDoPrazo } from "./caminhos";
import type { FiltroDosComentarios, OrdemDaCaixa, PeriodoDaCaixa } from "./constantes";

/** FORK ESCALE · Fase 10A: tipos e regras puras da caixa de comentários (plano 10A, seção 1). */
export interface PublicacaoDaCaixa {
  /** O id que o Zernio usa em `inbox/comments/{postId}`. */
  id: string;
  legenda: string | null;
  /** Já filtrada por `miniaturaSegura`. */
  miniatura: string | null;
  /** Já filtrado por `linkDaPublicacao`. */
  link: string | null;
  tipo: string | null;
  /** ISO. */
  publicadaEm: string | null;
  /** ISO, quando o Zernio devolve. */
  ultimoComentarioEm: string | null;
  comentarios: number | null;
  /** D5: null = o Zernio não informa. */
  semResposta: number | null;
}

export interface AutorDoComentario {
  id: string;
  usuario: string | null;
  nome: string | null;
  /** Só `https:`. */
  foto: string | null;
  daPropriaConta: boolean;
}

export type MotivoDoDirectBloqueado = "prazo_vencido" | "ja_usado" | "da_propria_conta" | "conta_desconectada";

export type EstadoDoDirect = { liberado: true } | { liberado: false; motivo: MotivoDoDirectBloqueado };

export interface ComentarioDaCaixa {
  id: string;
  texto: string;
  /** ISO. */
  comentadoEm: string;
  autor: AutorDoComentario;
  oculto: boolean;
  /** A 10D usa; null = não informado. */
  curtido: boolean | null;
  curtidas: number | null;
  /** Um nível só (o Instagram não aninha mais que isso). */
  respostas: ComentarioDaCaixa[];
  /** D5. */
  respondido: boolean;
  /** D14. */
  contato: { id: string; nome: string } | null;
  /** D8. */
  direct: EstadoDoDirect;
}

/** D5. `acoesFeitas` = ids dos comentários com resposta `feito` do CRM. */
export function semResposta(
  c: Pick<ComentarioDaCaixa, "autor" | "respostas" | "id">,
  acoesFeitas: ReadonlySet<string>,
): boolean {
  if (c.autor.daPropriaConta) return false;
  if (acoesFeitas.has(c.id)) return false;
  return !c.respostas.some((r) => r.autor.daPropriaConta);
}

/** D8. `usados` = ids com direct já usado (9803 + disparos + privateReplyConsumed). */
export function estadoDoDirect(e: {
  comentario: Pick<ComentarioDaCaixa, "id" | "comentadoEm" | "autor">;
  usados: ReadonlySet<string>;
  contaConectada: boolean;
  agora: Date;
}): EstadoDoDirect {
  if (!e.contaConectada) return { liberado: false, motivo: "conta_desconectada" };
  if (e.comentario.autor.daPropriaConta) return { liberado: false, motivo: "da_propria_conta" };
  if (e.usados.has(e.comentario.id)) return { liberado: false, motivo: "ja_usado" };
  if (!dentroDoPrazo(e.comentario.comentadoEm, e.agora)) return { liberado: false, motivo: "prazo_vencido" };
  return { liberado: true };
}

/** Mesma normalização de `lib/escale/conversas/criacao-de-negocio.ts` (sem acento, sem caixa). */
const normalizar = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const casaComABusca = (c: ComentarioDaCaixa, busca: string): boolean => {
  const palheiro = normalizar(`${c.autor.usuario ? `@${c.autor.usuario}` : ""} ${c.autor.nome ?? ""} ${c.texto}`);
  return palheiro.includes(busca);
};

/** D6. Busca em `@usuario`, nome e texto (inclui as respostas). Não muta a entrada. */
export function filtrarComentarios(
  lista: readonly ComentarioDaCaixa[],
  filtro: FiltroDosComentarios,
  busca: string,
): ComentarioDaCaixa[] {
  const termo = normalizar(busca);
  return lista.filter((c) => {
    const passaNoFiltro =
      filtro === "todos" ||
      (filtro === "sem_resposta" && !c.autor.daPropriaConta && !c.respondido) ||
      (filtro === "respondidos" && !c.autor.daPropriaConta && c.respondido) ||
      (filtro === "ocultos" && c.oculto) ||
      (filtro === "contatos" && c.contato !== null);
    if (!passaNoFiltro) return false;
    if (termo === "") return true;
    return casaComABusca(c, termo) || c.respostas.some((r) => casaComABusca(r, termo));
  });
}

const quando = (iso: string | null): number => {
  const t = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
};

/** D6 (só quando o Zernio não ordena): recentes = `ultimoComentarioEm ?? publicadaEm` desc; mais_comentarios = `comentarios` desc, nulos no fim. */
export function ordenarPublicacoes(lista: readonly PublicacaoDaCaixa[], ordem: OrdemDaCaixa): PublicacaoDaCaixa[] {
  const copia = [...lista];
  if (ordem === "mais_comentarios") {
    return copia.sort((a, b) => {
      if (a.comentarios === null && b.comentarios === null) return 0;
      if (a.comentarios === null) return 1;
      if (b.comentarios === null) return -1;
      return b.comentarios - a.comentarios;
    });
  }
  return copia.sort(
    (a, b) => quando(b.ultimoComentarioEm ?? b.publicadaEm) - quando(a.ultimoComentarioEm ?? a.publicadaEm),
  );
}

const DIAS_DO_PERIODO: Record<Exclude<PeriodoDaCaixa, "tudo">, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** D6: `since` do período (ISO) ou null para "tudo". */
export function inicioDoPeriodo(periodo: PeriodoDaCaixa, agora: Date): string | null {
  if (periodo === "tudo") return null;
  return new Date(agora.getTime() - DIAS_DO_PERIODO[periodo] * 24 * 60 * 60 * 1000).toISOString();
}

/** A explicação que a tela mostra no botão desligado. */
export const EXPLICACAO_DO_DIRECT: Record<MotivoDoDirectBloqueado, string> = {
  prazo_vencido: "O Instagram só aceita o direct até 7 dias depois do comentário.",
  ja_usado: "Este comentário já recebeu um direct. O Instagram aceita um só por comentário.",
  da_propria_conta: "Este comentário é da própria conta.",
  conta_desconectada: "A conta está desconectada. Reconecte em Configurações › Canais.",
};
