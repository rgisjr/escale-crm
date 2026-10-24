import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

/**
 * AS FORMAS DA LISTA DE CAMPANHAS DA CASCA (fork Escale, Fase 8A). O servidor
 * (`banco.ts`) monta, a rota devolve e a tela lê — um tipo só dos dois lados.
 */

/** As contagens de uma campanha (ou a soma do resumo), por carimbo cumulativo (9301, N6). */
export interface ContagemDaLinha {
  /** Elegíveis do snapshot: a base de todo percentual da lista. */
  adicionados: number;
  /** Saíram (sem os que falharam). */
  enviados: number;
  entregues: number;
  /** Leram ou responderam. */
  lidos: number;
  /** Falharam no envio. */
  erros: number;
}

export interface LinhaDeCampanha extends ContagemDaLinha {
  id: string;
  nome: string;
  status: StatusDaCampanha;
  /** O número principal (`channel_session_id`). */
  numeroId: string;
  /** Linhas do snapshot, elegíveis ou não ("N Solicitados"). */
  solicitados: number;
  agendadaPara: string | null;
  iniciadaEm: string | null;
  criadaEm: string;
}

export interface PaginaDeCampanhas {
  linhas: LinhaDeCampanha[];
  total: number;
  pagina: number;
  porPagina: number;
}

export type ResumoDasCampanhas = ContagemDaLinha;
