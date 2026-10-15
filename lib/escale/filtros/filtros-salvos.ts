import { mesmosFiltros, type FiltrosDoQuadro } from "./tipos";

/**
 * FILTROS SALVOS DO QUADRO (fork Escale, Fase 1D). Cada pessoa salva os filtros
 * de uma origem ou de uma visualização; marca "compartilhar" para quem vê o alvo
 * (decisão de 15/10). Quem vê o compartilhado é a RLS que decide (migration 9004).
 */
export const FILTROS_SALVOS_MAX = 20;
export const NOME_DO_FILTRO_MAX = 60;

export interface AlvoDoFiltro {
  tipo: "origem" | "visualizacao";
  id: string;
}

export interface FiltroSalvo {
  id: string;
  nome: string;
  compartilhado: boolean;
  /** É de quem está olhando: só esse pode mudar ou excluir. */
  meu: boolean;
  criterios: FiltrosDoQuadro;
}

export function validarNomeDoFiltro(bruto: string): { ok: true; nome: string } | { ok: false; erro: string } {
  const nome = bruto.trim();
  if (!nome) return { ok: false, erro: "Dê um nome ao filtro." };
  if (nome.length > NOME_DO_FILTRO_MAX) return { ok: false, erro: "O nome do filtro pode ter até 60 caracteres." };
  return { ok: true, nome };
}

const chaveDoNome = (nome: string) => nome.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Entre os MEUS filtros do alvo, sem olhar caixa nem acento. */
export function nomeRepetido(nome: string, meus: ReadonlyArray<Pick<FiltroSalvo, "id" | "nome">>, ignorarId?: string): boolean {
  const alvo = chaveDoNome(nome);
  return meus.some((f) => f.id !== ignorarId && chaveDoNome(f.nome) === alvo);
}

export function separarFiltrosSalvos(lista: readonly FiltroSalvo[]): { meus: FiltroSalvo[]; compartilhados: FiltroSalvo[] } {
  const porNome = (a: FiltroSalvo, b: FiltroSalvo) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
  return {
    meus: lista.filter((f) => f.meu).sort(porNome),
    compartilhados: lista.filter((f) => !f.meu).sort(porNome),
  };
}

/** O filtro aplicado foi mexido depois de aplicado? */
export const filtroAlterado = (salvo: Pick<FiltroSalvo, "criterios">, atuais: FiltrosDoQuadro) =>
  !mesmosFiltros(salvo.criterios, atuais);

export const parametroDoAlvo = (alvo: AlvoDoFiltro) => (alvo.tipo === "origem" ? "origem" : "visualizacao");
