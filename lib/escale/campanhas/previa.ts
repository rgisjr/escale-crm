import type { MensagemDaCampanha, MensagemDeModelo } from "./assistente";
import { rotuloDoToken } from "@/lib/variaveis/catalogo";
import { tokenDoCampoAntigo } from "@/lib/variaveis/mapeamento";

import { CAMPOS_BASICOS } from "./modelo";

/**
 * A PRÉVIA DA MENSAGEM (fork Escale, Fase 8B; 09-025): o texto em partes, com
 * as variáveis de campo do CRM como chip ("Primeiro nome") e o valor fixo como
 * texto. Puro: o celular só desenha.
 */
export type ParteDaPrevia = { tipo: "texto"; texto: string } | { tipo: "variavel"; rotulo: string };
export interface CampoPersonalizado {
  campo: string;
  rotulo: string;
}

export function rotuloDoCampo(campo: string, personalizados: readonly CampoPersonalizado[]): string {
  // Frente V: o token da lista única (`[CONTACT.FIRST_NAME]`, `[DEAL.GANCHO]`).
  if (campo.startsWith("[")) {
    const personalizado = personalizados.find((c) => tokenDoCampoAntigo(c.campo) === campo);
    return personalizado?.rotulo ?? rotuloDoToken(campo)?.rotulo ?? campo;
  }
  const basico = CAMPOS_BASICOS.find((c) => c.campo === campo);
  if (basico) return basico.rotulo;
  return personalizados.find((c) => c.campo === campo)?.rotulo ?? campo.split(".").pop() ?? campo;
}

const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}|(\[[A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)+\])/g;

function emPartes(texto: string, parte: (token: string, literal: string) => ParteDaPrevia): ParteDaPrevia[] {
  const saida: ParteDaPrevia[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(TOKEN)) {
    if (m.index > ultimo) saida.push({ tipo: "texto", texto: texto.slice(ultimo, m.index) });
    saida.push(parte(m[1] ?? m[2]!, m[0]));
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) saida.push({ tipo: "texto", texto: texto.slice(ultimo) });
  return saida;
}

/** Texto livre: `{{nome}}`, `{{contato.cidade}}` viram chips; o resto fica texto. */
export const partesDoTexto = (texto: string, personalizados: readonly CampoPersonalizado[]): ParteDaPrevia[] =>
  emPartes(texto, (token) => ({ tipo: "variavel", rotulo: rotuloDoCampo(token, personalizados) }));

/** Modelo: `{{n}}` com campo vira chip; com valor fixo, texto; sem variável, o `{{n}}` literal. */
export const partesDoModelo = (m: MensagemDeModelo, personalizados: readonly CampoPersonalizado[]): ParteDaPrevia[] =>
  emPartes(m.corpo, (token, literal) => {
    const v = m.variaveis[token];
    if (!v) return { tipo: "texto", texto: literal };
    if (v.fonte === "fixo") return { tipo: "texto", texto: v.valor };
    return { tipo: "variavel", rotulo: rotuloDoCampo(v.campo, personalizados) };
  });

/** A prévia da mensagem do passo 1 e do 4; `null` enquanto não há o que mostrar. */
export function partesDaMensagem(m: MensagemDaCampanha, personalizados: readonly CampoPersonalizado[]): ParteDaPrevia[] | null {
  if (m.tipo === "texto") return m.texto.trim() ? partesDoTexto(m.texto, personalizados) : null;
  return m.nome ? partesDoModelo(m, personalizados) : null;
}
