/**
 * FORK ESCALE · 5D: o modelo de EDIÇÃO da mensagem do WhatsApp em sequência (07-027): uma lista de itens
 * (texto com botões, mídia, pausa) que a tela edita e que volta a ser `passos` (ou `template`, quando é um
 * texto só) ao salvar. Puro: sem React, sem rede.
 */
import { passosSchema, RECUSA_PAUSA_NO_COMECO, RECUSA_PAUSA_SEGUIDA, type PassoDeEnvio } from "@/lib/automation/envio-de-passos";
import type { TempoDeResposta } from "@/lib/escale/automacoes/fluxo/caixas";

export const MAXIMO_DE_BOTOES = 10;
export const MAXIMO_DE_BOTOES_SEM_LISTA = 3;
export const TAMANHO_DO_BOTAO = 20;
export const MAXIMO_DE_ITENS = 8;
export const AVISO_DA_LISTA = "Com mais de 3 opções, a mensagem vai como lista.";
export const RECUSA_BOTAO_GRANDE = "O texto do botão deve ter no máximo 20 caracteres";
export const RECUSA_PAUSA_NO_FIM = "O último item da lista não pode ser um atraso.";
export const RECUSA_TEMPO_DE_RESPOSTA = "O tempo mínimo de resposta é de 1 minuto.";
export const BOTAO_DA_LISTA = "Ver opções";

export type BotaoDoItem = { id: string; titulo: string };
export type ItemDaSequencia =
  | { chave: string; tipo: "texto"; texto: string; botoes: BotaoDoItem[] }
  | { chave: string; tipo: "midia"; asset: string; legenda: string }
  | { chave: string; tipo: "pausa"; segundos: number };
export type TipoDeItem = ItemDaSequencia["tipo"];

let contador = 0;
/** Chave estável de cada item na tela (não vai para a regra). */
export const novaChave = (): string => `item-${(contador += 1)}`;

export function itensDaConfig(config: Record<string, unknown>): ItemDaSequencia[] {
  const lidos = passosSchema.safeParse(config.passos);
  if (lidos.success) return lidos.data.map(itemDoPasso);
  const texto = typeof config.template === "string" ? config.template : "";
  return [{ chave: novaChave(), tipo: "texto", texto, botoes: [] }];
}

function itemDoPasso(p: PassoDeEnvio): ItemDaSequencia {
  if (p.tipo === "texto") return { chave: novaChave(), tipo: "texto", texto: p.texto, botoes: [] };
  if (p.tipo === "midia") return { chave: novaChave(), tipo: "midia", asset: p.asset, legenda: p.legenda ?? "" };
  if (p.tipo === "pausa") return { chave: novaChave(), tipo: "pausa", segundos: p.segundos };
  const i = p.interativo;
  const lista = i.tipo === "botoes" ? i.botoes : i.linhas;
  return { chave: novaChave(), tipo: "texto", texto: i.corpo, botoes: lista.map((b) => ({ id: b.id, titulo: b.titulo })) };
}

/** Os passos que o item vira: botões até 3 são botões; acima disso, lista. */
export function passosDosItens(itens: readonly ItemDaSequencia[]): unknown[] {
  return itens.map((item) => {
    if (item.tipo === "pausa") return { tipo: "pausa", segundos: item.segundos };
    if (item.tipo === "midia") return { tipo: "midia", asset: item.asset, ...(item.legenda.trim() ? { legenda: item.legenda } : {}) };
    if (item.botoes.length === 0) return { tipo: "texto", texto: item.texto };
    const botoes = item.botoes.map((b) => ({ id: b.id, titulo: b.titulo }));
    return {
      tipo: "interativo",
      interativo:
        botoes.length > MAXIMO_DE_BOTOES_SEM_LISTA
          ? { tipo: "lista", corpo: item.texto, botaoDaLista: BOTAO_DA_LISTA, linhas: botoes }
          : { tipo: "botoes", corpo: item.texto, botoes },
    };
  });
}

/**
 * A config que volta para a caixa: um texto só, sem botões e sem tempo de resposta, continua `template` (o
 * formato de sempre, que o modo regra entende); o resto vai em `passos`.
 */
export function configDosItens(
  config: Record<string, unknown>,
  itens: readonly ItemDaSequencia[],
  tempo: TempoDeResposta,
): Record<string, unknown> {
  const { template: _t, passos: _p, tempo_de_resposta: _r, ...resto } = config;
  const so = itens.length === 1 ? itens[0]! : null;
  if (so && so.tipo === "texto" && so.botoes.length === 0 && !tempo) return { ...resto, template: so.texto };
  return { ...resto, passos: passosDosItens(itens), ...(tempo ? { tempo_de_resposta: tempo } : {}) };
}

/** O motivo de NÃO poder adicionar o tipo ao fim da lista, ou `null` quando pode. */
export function recusaDeAdicionar(itens: readonly ItemDaSequencia[], tipo: TipoDeItem): string | null {
  if (itens.length >= MAXIMO_DE_ITENS) return "Uma mensagem tem no máximo 8 itens.";
  if (tipo !== "pausa") return null;
  if (itens.length === 0) return RECUSA_PAUSA_NO_COMECO;
  if (itens[itens.length - 1]!.tipo === "pausa") return RECUSA_PAUSA_SEGUIDA;
  return null;
}

export function novoItem(tipo: TipoDeItem): ItemDaSequencia {
  if (tipo === "texto") return { chave: novaChave(), tipo, texto: "", botoes: [] };
  if (tipo === "midia") return { chave: novaChave(), tipo, asset: "", legenda: "" };
  return { chave: novaChave(), tipo, segundos: 4 };
}

/** O que impede salvar a sequência, na frase da pessoa; `null` quando está pronta. */
export function problemaDaSequencia(itens: readonly ItemDaSequencia[], tempo: TempoDeResposta): string | null {
  if (itens.length === 0) return "Escreva a mensagem";
  if (itens[itens.length - 1]!.tipo === "pausa") return RECUSA_PAUSA_NO_FIM;
  for (const item of itens) {
    if (item.tipo === "texto" && item.texto.trim() === "") return "Escreva a mensagem";
    if (item.tipo === "texto" && item.botoes.some((b) => b.titulo.trim() === "")) return "Dê um texto a cada botão";
    if (item.tipo === "texto" && item.botoes.some((b) => b.titulo.length > TAMANHO_DO_BOTAO)) return RECUSA_BOTAO_GRANDE;
    if (item.tipo === "midia" && item.asset === "") return "Escolha o arquivo";
  }
  if (tempo && !(tempo.quantidade >= 1)) return RECUSA_TEMPO_DE_RESPOSTA;
  const lidos = passosSchema.safeParse(passosDosItens(itens));
  return lidos.success ? null : (lidos.error.issues[0]?.message ?? "Revise a mensagem");
}

/** Um id de botão que não repete nenhum da mensagem inteira: a ligação do canvas guarda `botao:<id>`. */
export function novoIdDeBotao(itens: readonly ItemDaSequencia[]): string {
  const usados = itens.flatMap((i) => (i.tipo === "texto" ? i.botoes.map((b) => b.id) : []));
  let n = usados.length + 1;
  while (usados.includes(`b-${n}`)) n += 1;
  return `b-${n}`;
}
