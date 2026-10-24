import { TEXTO_DA_EXCLUSAO } from "@/lib/campanhas/tipos";
import type { Traduzir } from "@/lib/escale/campanhas/apresentacao";

import type { SituacaoDoDestinatario } from "./tipos";

/**
 * O QUE CADA CÓDIGO DE ERRO QUER DIZER (fork Escale, Fase 8C; C5; 013). Os
 * números são da API oficial da Meta (o ack grava em `messages.error_code`, e o
 * trigger da 0375 leva a `last_error_code`); `send_failed` e `send_exception`
 * são da rodada do original. Código desconhecido aparece como está.
 */
export const SEM_CODIGO = "sem_codigo";

export const TEXTO_DO_MOTIVO: Readonly<Record<string, string>> = {
  "130429": "Limite de envio do número atingido",
  "130472": "O número do usuário faz parte de um experimento da Meta",
  "131026": "Destinatário incapaz de receber a mensagem",
  "131031": "Conta da Meta bloqueada",
  "131042": "Problema de pagamento na conta da Meta",
  "131047": "Mais de 24 horas desde a última mensagem do contato",
  "131048": "Limite de envio por denúncia de spam atingido",
  "131049": "Meta optou por não entregar",
  "131050": "O contato parou de receber mensagens de marketing",
  "132000": "As variáveis não conferem com o modelo",
  "132001": "O modelo não existe nesse idioma",
  "132012": "As variáveis não conferem com o modelo",
  "132015": "Modelo pausado pela Meta",
  "132016": "Modelo desativado pela Meta",
  send_failed: "O canal recusou o envio",
  send_exception: "Erro interno no envio",
  [SEM_CODIGO]: "Sem detalhe do erro registrado",
};

export function textoDoMotivo(codigo: string | null, t: Traduzir): string {
  const chave = codigo ?? SEM_CODIGO;
  if (Object.hasOwn(TEXTO_DO_MOTIVO, chave)) return t(TEXTO_DO_MOTIVO[chave]!);
  return t("Erro do canal: {codigo}").replace("{codigo}", chave);
}

export function textoDaExclusao(codigo: string | null, t: Traduzir): string {
  if (!codigo) return t("Fora da lista");
  const textos = TEXTO_DA_EXCLUSAO as Readonly<Record<string, string>>;
  return Object.hasOwn(textos, codigo) ? t(textos[codigo]!) : codigo;
}

/** O motivo que a linha mostra (coluna "Motivo", dica do selo e .CSV). */
export function textoDoMotivoDaLinha(
  situacao: SituacaoDoDestinatario,
  motivo: string | null,
  t: Traduzir,
): string | null {
  if (situacao === "erro") return textoDoMotivo(motivo, t);
  if (situacao === "fora_da_lista") return textoDaExclusao(motivo, t);
  return null;
}
