import type { ModeloDoSistema } from "../tipos";
import { atendimentos } from "./atendimentos";
import { campanhasDeWhatsapp } from "./campanhas-de-whatsapp";
import { conversaoDeVendas } from "./conversao-de-vendas";
import { produtividadePorUsuario } from "./produtividade-por-usuario";

/** Os 4 modelos da Escale, em código (U1): um modelo novo ou corrigido é um commit. */
export const MODELOS_DO_SISTEMA: readonly ModeloDoSistema[] = [conversaoDeVendas, atendimentos, produtividadePorUsuario, campanhasDeWhatsapp];

export function modeloDoSistema(id: string): ModeloDoSistema | null {
  return MODELOS_DO_SISTEMA.find((m) => m.id === id) ?? null;
}
