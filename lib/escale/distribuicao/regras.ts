/**
 * A DISTRIBUIÇÃO DE DONO DA ORIGEM (fork Escale, Fase 1K, D13; código `Is` da Clint).
 *
 * Regras puras da tela: o percentual como a pessoa digita (vírgula, N10), a
 * divisão igual quando alguém entra ou sai, a validação do Salvar, o bloqueio
 * da lista de pessoas da 1J (Q9) e as versões do histórico da configuração.
 * Quem escolhe o dono de cada negócio é o banco (`fn_escale_reparte_dono_da_origem`).
 */
import type { Role } from "@/lib/auth/types";
import { temAcessoAOrigem } from "@/lib/escale/acesso/regras";

export const DISTRIBUICAO_MAX = 50;
/** A janela "Histórico de distribuições" pagina de 6 em 6 (Clint). */
export const POR_PAGINA_DAS_DISTRIBUICOES = 6;
/** Mudanças do mesmo autor com até 2 s de diferença são uma versão só (Clint `Ms`). */
export const JANELA_DA_VERSAO_MS = 2000;

export const EVENTOS_DA_DISTRIBUICAO = [
  "percentual_alterado",
  "pessoa_entrou",
  "pessoa_saiu",
  "contagem_reiniciada",
] as const;
export type EventoDaDistribuicao = (typeof EVENTOS_DA_DISTRIBUICAO)[number];

/** Uma pessoa da distribuição como o servidor devolve. */
export interface PessoaNaDistribuicao {
  userId: string;
  percentual: number;
  contador: number;
  /** O papel na organização (admin passa por cima da lista de pessoas, 1J). */
  papel: string | null;
}

/**
 * Uma linha no rascunho: o percentual é o texto do campo. O contador fica de
 * fora (a tela o lê da origem): o reset não pode sujar o rascunho.
 */
export interface LinhaDaDistribuicao {
  userId: string;
  percentual: string;
  papel: string | null;
}

export interface AlteracaoDaDistribuicao {
  id: string;
  evento: EventoDaDistribuicao;
  pessoaId: string | null;
  percentualAntes: number | null;
  percentualDepois: number | null;
  autorId: string | null;
  em: string;
}

export interface VersaoDaDistribuicao {
  autorId: string | null;
  em: string;
  itens: AlteracaoDaDistribuicao[];
}

export interface PedidoDaDistribuicao {
  pessoas: Array<{ user_id: string; percentual: number }>;
  reiniciar: boolean;
}

export const ERRO_DA_SOMA = "Verificar o total das porcentagens, deve somar 100%.";
export const ERRO_DO_ZERO = "Verificar se as porcentagens são maiores que 0%.";

/** "33,33" ou "33.33" → 33.33; vazio → null; o resto → NaN. */
export function percentualDaTela(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (limpo === "") return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(limpo)) return Number.NaN;
  return Number(limpo);
}

/** 33.33 → "33,33"; 100 → "100" (formato brasileiro). */
export function textoDoPercentual(n: number): string {
  return String(Number(n.toFixed(2))).replace(".", ",");
}

export function linhasDaTela(pessoas: readonly PessoaNaDistribuicao[]): LinhaDaDistribuicao[] {
  return pessoas.map((p) => ({
    userId: p.userId,
    percentual: textoDoPercentual(p.percentual),
    papel: p.papel,
  }));
}

/** Entrou ou saiu alguém: todos com 100/n, duas casas (Clint). */
export function dividirIgual(linhas: readonly LinhaDaDistribuicao[]): LinhaDaDistribuicao[] {
  if (linhas.length === 0) return [];
  const cada = textoDoPercentual(Number((100 / linhas.length).toFixed(2)));
  return linhas.map((l) => ({ ...l, percentual: cada }));
}

/** O texto que trava o Salvar, ou null (Clint: todos acima de 0; soma arredondada 100; lista vazia passa). */
export function erroDaDistribuicao(linhas: readonly LinhaDaDistribuicao[]): string | null {
  if (linhas.length === 0) return null;
  const valores = linhas.map((l) => percentualDaTela(l.percentual));
  if (valores.some((v) => v === null || Number.isNaN(v) || v <= 0)) return ERRO_DO_ZERO;
  if (valores.some((v) => (v ?? 0) > 100)) return ERRO_DA_SOMA;
  const soma = valores.reduce<number>((s, v) => s + (v ?? 0), 0);
  return Number(soma.toFixed(0)) === 100 ? null : ERRO_DA_SOMA;
}

export function pedidoDaDistribuicao(
  linhas: readonly LinhaDaDistribuicao[],
  reiniciar: boolean,
): PedidoDaDistribuicao {
  return {
    pessoas: linhas.map((l) => ({
      user_id: l.userId,
      percentual: percentualDaTela(l.percentual) ?? 0,
    })),
    reiniciar,
  };
}

/**
 * Q9 da 1J: quem está na distribuição, não é admin e ficaria sem acesso à
 * origem com estas listas (a da origem; vazia, a do grupo; as duas vazias, todos).
 */
export function distribuidosForaDaLista({
  linhas,
  pessoas,
  pessoasDoGrupo,
}: {
  linhas: readonly LinhaDaDistribuicao[];
  pessoas: readonly string[];
  pessoasDoGrupo: readonly string[];
}): string[] {
  return linhas
    .filter(
      (l) =>
        !temAcessoAOrigem({
          papel: (l.papel ?? "agent") as Role,
          userId: l.userId,
          pessoas,
          pessoasDoGrupo,
        }),
    )
    .map((l) => l.userId);
}

/** O texto da Clint (`Ps`), com `{usuarios}` para os nomes. Quem mostra passa por `t()` e troca o marcador. */
export function textoDoBloqueio(quantos: number, segueOGrupo: boolean): string {
  if (segueOGrupo) {
    return quantos === 1
      ? "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e este usuário que recebe negócios por distribuição não está nelas: {usuarios}. Remova-o da distribuição ou mantenha uma lista própria que o inclua."
      : "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e estes usuários que recebem negócios por distribuição não estão nelas: {usuarios}. Remova-os da distribuição ou mantenha uma lista própria que os inclua.";
  }
  return quantos === 1
    ? "Não é possível salvar. Este usuário recebe negócios por distribuição nesta origem e não está na lista: {usuarios}. Inclua-o na lista de permissões ou remova-o da distribuição."
    : "Não é possível salvar. Estes usuários recebem negócios por distribuição nesta origem e não estão na lista: {usuarios}. Inclua-os na lista de permissões ou remova-os da distribuição.";
}

/** As versões da gaveta do relógio: da mais nova para a mais velha; o mesmo autor em até 2 s é uma versão. */
export function versoesDaDistribuicao(
  alteracoes: readonly AlteracaoDaDistribuicao[],
): VersaoDaDistribuicao[] {
  const ordenadas = [...alteracoes].sort((a, b) => Date.parse(b.em) - Date.parse(a.em));
  return ordenadas.reduce<VersaoDaDistribuicao[]>((versoes, a) => {
    const ultima = versoes.at(-1);
    const ultimoItem = ultima?.itens.at(-1);
    const junta =
      ultima !== undefined &&
      ultimoItem !== undefined &&
      ultima.autorId === a.autorId &&
      Date.parse(ultimoItem.em) - Date.parse(a.em) <= JANELA_DA_VERSAO_MS;
    if (!junta || !ultima) return [...versoes, { autorId: a.autorId, em: a.em, itens: [a] }];
    return [...versoes.slice(0, -1), { ...ultima, itens: [...ultima.itens, a] }];
  }, []);
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** "18/10/2026" (dia/mês/ano, hora local). */
export function dataBr(iso: string): string {
  const d = new Date(iso);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "09:05" (24 h, hora local). */
export function horaBr(iso: string): string {
  const d = new Date(iso);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

/** "há 5 minutos" / "hace 5 minutos": o "Atualizado há …" da Clint, no idioma da tela. */
export function tempoRelativo(iso: string, agoraMs: number, tagDeIdioma: string): string {
  const rtf = new Intl.RelativeTimeFormat(tagDeIdioma, { numeric: "auto" });
  const segundos = Math.round((Date.parse(iso) - agoraMs) / 1000);
  const abs = Math.abs(segundos);
  if (abs < 60) return rtf.format(segundos, "second");
  if (abs < 3600) return rtf.format(Math.round(segundos / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(segundos / 3600), "hour");
  if (abs < 30 * 86_400) return rtf.format(Math.round(segundos / 86_400), "day");
  return rtf.format(Math.round(segundos / (30 * 86_400)), "month");
}
