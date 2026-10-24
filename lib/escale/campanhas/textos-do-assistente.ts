import { TEXTO_DA_EXCLUSAO, type MotivoDeExclusao } from "@/lib/campanhas/tipos";

import { dataEHoraBr, numeroBr } from "./apresentacao";
import type { QuandoEnviar } from "./assistente";

/** OS TEXTOS DO PASSO 4 (fork Escale, Fase 8B; 09-044). Em português; a tela traduz. */
export const quandoNoResumo = (q: QuandoEnviar, fuso?: string): string =>
  q.modo === "agora" ? "Envio imediato" : dataEHoraBr(q.em, fuso);

export const textoDoMotivo = (motivo: string): string =>
  (TEXTO_DA_EXCLUSAO as Record<string, string>)[motivo as MotivoDeExclusao] ?? motivo;

export const enviarPara = (n: number): string =>
  n === 1 ? "1 contato selecionado" : `${numeroBr(n)} contatos selecionados`;
