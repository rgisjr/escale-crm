/**
 * AS CONFIGURAÇÕES DA ORIGEM QUE SÃO DO FORK (Escale, Fase 1F, igual à Clint).
 *
 * Moram no MESMO `crm_pipelines.settings` do original, em chaves `escale_*`.
 * O writer do original (`updatePipelineConfig`) troca só as chaves que conhece
 * e preserva o resto. Toda leitura é TOLERANTE: lixo vira "sem configuração".
 */
import type { VisibilityMode } from "@/lib/auth/types";
import { normalizarTag } from "@/lib/contacts/tag-normalizada";
import { pessoasDaOrigem, visualizacaoDaOrigem } from "@/lib/escale/acesso/regras";
import { MOEDAS_SERVIDAS, type MoedaServida } from "@/lib/money";

import { lerAlerta, type AlertaDeTempo } from "./alerta";

export const CHAVE_DA_MOEDA = "escale_moeda";
export const CHAVE_DAS_TAGS = "escale_tags_padrao";
export const CHAVE_DOS_INATIVOS = "escale_motivos_inativos";
export const CHAVE_DO_AO_SAIR = "escale_ao_sair";
export const CHAVE_DO_ALERTA = "escale_alerta_tempo";

export const TAGS_PADRAO_MAX = 10;
/** A etiqueta que a agenda põe e tira sozinha (`fn_recalcular_cliente_do_contato`). */
export const TAG_DO_SISTEMA = "cliente";
/** "Todas as etapas" da Clint (`component.RequiredFields.allStages`), guardado como na Clint. */
export const TODAS_AS_ETAPAS = "all";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ehUuid = (texto: string) => UUID.test(texto);

export interface ConfiguracoesDoFork {
  moeda: MoedaServida | null;
  tagsPadrao: string[];
  motivosInativos: string[];
  /** Campo → etapas do "Ao sair" (`["all"]` = todas as abertas). Só na tela. */
  aoSair: Record<string, string[]>;
  alerta: AlertaDeTempo;
  /** A regra de quem vê os negócios DESTA origem (1J); `null` = segue a organização. */
  visualizacao: VisibilityMode | null;
  /** Quem tem acesso à origem (1J); vazia = segue a lista do grupo, ou sem restrição. */
  pessoas: string[];
}

export function comoRecord(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

export function textos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === "string") : [];
}

export function moedaDaOrigem(settings: unknown): MoedaServida | null {
  const bruta = comoRecord(settings)[CHAVE_DA_MOEDA];
  return typeof bruta === "string" && (MOEDAS_SERVIDAS as readonly string[]).includes(bruta)
    ? (bruta as MoedaServida)
    : null;
}

export function normalizarTagsPadrao(cruas: readonly string[]): string[] {
  const vistas = new Set<string>();
  for (const cru of cruas) {
    const tag = normalizarTag(cru);
    if (tag.length === 0 || tag === TAG_DO_SISTEMA) continue;
    vistas.add(tag);
  }
  return [...vistas].slice(0, TAGS_PADRAO_MAX);
}

function lerAoSair(valor: unknown): Record<string, string[]> {
  const saida: Record<string, string[]> = {};
  for (const [campo, etapas] of Object.entries(comoRecord(valor))) {
    const lidas = textos(etapas);
    const ids = lidas.includes(TODAS_AS_ETAPAS)
      ? [TODAS_AS_ETAPAS]
      : [...new Set(lidas.filter(ehUuid))];
    if (ids.length > 0) saida[campo] = ids;
  }
  return saida;
}

export function lerConfiguracoesDoFork(settings: unknown): ConfiguracoesDoFork {
  const s = comoRecord(settings);
  return {
    moeda: moedaDaOrigem(s),
    tagsPadrao: normalizarTagsPadrao(textos(s[CHAVE_DAS_TAGS])),
    motivosInativos: textos(s[CHAVE_DOS_INATIVOS]),
    aoSair: lerAoSair(s[CHAVE_DO_AO_SAIR]),
    alerta: lerAlerta(s[CHAVE_DO_ALERTA]),
    visualizacao: visualizacaoDaOrigem(s),
    pessoas: pessoasDaOrigem(s),
  };
}
