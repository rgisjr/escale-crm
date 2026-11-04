/**
 * FORK ESCALE · 5D: os tipos do desenho em MODO FLUXO da tela de Automações (Atraso, condições em
 * grupos, saídas por botão e "Não respondeu"). São só tipos e funções puras: o desenho linear de hoje
 * (gatilho → condições → ações) não muda, e as caixas novas só aparecem quando alguém as usa.
 */
import type { CaixaDoDesenho, LinhaDeCondicao } from "@/lib/automation/desenho-da-regra";
import { passosSchema } from "@/lib/automation/envio-de-passos";
import type { JanelaDoAtraso } from "@/lib/followup/janela-do-atraso";

export type UnidadeDoAtraso = "segundos" | "minutos" | "horas" | "dias";
export type DadosDoAtraso = {
  kind: "atraso";
  quantidade: number;
  unidade: UnidadeDoAtraso;
  janela: JanelaDoAtraso | null;
};
export type GrupoDeCondicoes = { id: string; modo: "todas" | "qualquer"; linhas: LinhaDeCondicao[] };
export type TempoDeResposta = { quantidade: number; unidade: "minutos" | "horas" | "dias" } | null;

/** Saídas de um nó: "proximo" (Próximo passo), "botao:<id>", "nao_respondeu", "grupo:<id>", "nenhuma". */
export type SaidaDoNo = "proximo" | "nao_respondeu" | "nenhuma" | `botao:${string}` | `grupo:${string}`;
export const SAIDA_PADRAO: SaidaDoNo = "proximo";

export const ATRASO_MINIMO_MS = 30_000;
export const RECUSA_ATRASO_MINIMO = "O atraso mínimo é de 30 segundos.";
export const ATRASO_MAXIMO_MS = 90 * 86_400_000;
export const RECUSA_ATRASO_MAXIMO = "O atraso máximo é de 90 dias.";

const MS_DA_UNIDADE: Record<UnidadeDoAtraso, number> = {
  segundos: 1_000,
  minutos: 60_000,
  horas: 3_600_000,
  dias: 86_400_000,
};

export function msDoAtraso(d: Pick<DadosDoAtraso, "quantidade" | "unidade">): number {
  return MS_DA_UNIDADE[d.unidade] * d.quantidade;
}

/** O tempo de resposta em milissegundos (a espera do `match_reply`). */
export function msDoTempoDeResposta(t: NonNullable<TempoDeResposta>): number {
  return MS_DA_UNIDADE[t.unidade] * t.quantidade;
}

type ConfigDaMensagem = { passos?: unknown; tempo_de_resposta?: TempoDeResposta };

/** Botões (ou linhas de lista) do ÚLTIMO passo interativo da mensagem: [{ id, titulo }]. */
export function botoesDaMensagem(config: Record<string, unknown>): Array<{ id: string; titulo: string }> {
  const lidos = passosSchema.safeParse((config as ConfigDaMensagem).passos);
  if (!lidos.success) return [];
  const interativos = lidos.data.filter((p) => p.tipo === "interativo");
  const ultimo = interativos[interativos.length - 1];
  if (!ultimo || ultimo.tipo !== "interativo") return [];
  const i = ultimo.interativo;
  const lista = i.tipo === "botoes" ? i.botoes : i.linhas;
  return lista.map((b) => ({ id: b.id, titulo: b.titulo }));
}

export function temTempoDeResposta(config: Record<string, unknown>): boolean {
  const t = (config as ConfigDaMensagem).tempo_de_resposta;
  return t !== null && t !== undefined;
}

export function saidasDaCaixa(caixa: CaixaDoDesenho): SaidaDoNo[] {
  const d = caixa.data;
  if (d.kind === "condicoes") {
    if (!d.grupos) return ["proximo"];
    return [...d.grupos.map((g): SaidaDoNo => `grupo:${g.id}`), "nenhuma"];
  }
  if (d.kind === "acao" && d.acao.type === "send_whatsapp_message") {
    const saidas: SaidaDoNo[] = ["proximo", ...botoesDaMensagem(d.acao.config).map((b): SaidaDoNo => `botao:${b.id}`)];
    if (temTempoDeResposta(d.acao.config)) saidas.push("nao_respondeu");
    return saidas;
  }
  return ["proximo"];
}

/* ───────── constantes do compilador (compartilhadas com o descompilador) ───────── */

export const SUFIXO_DA_RESPOSTA = "__resposta";
export const ID_DO_FIM = "fim";
export const ESPERA_SEM_LIMITE_MS = 7 * 86_400_000;
export const LIMITE_DE_NOS = 60;
export const LIMITE_DE_ARESTAS = 120;
export const RECUSA_TAMANHO_MAXIMO = "A automação passou do tamanho máximo (60 passos).";
export const PASSO_SO_NO_MODO_REGRA =
  "Este passo não pode vir depois de um Atraso, de uma Condição com ramos ou de uma resposta do contato.";
export const RECUSA_CANAL_FIXO = "No fluxo, a mensagem sai pelo número da conversa.";
