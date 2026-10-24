import { roleAtLeast, type Role } from "@/lib/auth/types";

/**
 * PARA ONDE A LISTA LEVA (fork Escale, Fase 8A; N2, N11). A 8B troca "nova" e
 * "rascunho" pelo assistente; a 8C troca o detalhe pela janela da Clint. Mudar
 * aqui muda a lista inteira.
 */
export const ROTA_DAS_CAMPANHAS = "/app/campaigns";
export const ROTA_DA_NOVA = "/app/campaigns/new";
export const ROTA_DA_CONFIGURACAO = "/app/campaigns/settings";
export const rotaDoRascunho = (id: string): string => `/app/campaigns/${id}/edit`;
export const rotaDoDetalhe = (id: string): string => `/app/campaigns/${id}`;

export type AbaDasCampanhas = "whatsapp" | "prospeccao";

export const ROTULO_DA_ABA: Record<AbaDasCampanhas, string> = {
  whatsapp: "WhatsApp",
  prospeccao: "Prospecção",
};

/** Prospecção só para admin (PRD seção 5); com uma aba só, a faixa some (a Clint). */
export const abasVisiveis = (papel: Role | null): AbaDasCampanhas[] =>
  roleAtLeast(papel, "admin") ? ["whatsapp", "prospeccao"] : ["whatsapp"];

export function abaDaUrl(valor: string | null | undefined, papel: Role | null): AbaDasCampanhas {
  return valor === "prospeccao" && roleAtLeast(papel, "admin") ? "prospeccao" : "whatsapp";
}

export const rotaDaAba = (aba: AbaDasCampanhas): string =>
  aba === "whatsapp" ? ROTA_DAS_CAMPANHAS : `${ROTA_DAS_CAMPANHAS}?aba=${aba}`;
