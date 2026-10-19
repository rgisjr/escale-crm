import { lerEstadoDoCanal } from "@/lib/channels/estado";

/**
 * "NOVA CONVERSA" (fork Escale, Fase 3A; A12, c86): os dispositivos agrupados
 * como a Clint (WHATSAPP, WHATSAPP OFICIAL, INSTAGRAM) e a bolinha de estado.
 */
export const GRUPOS_DE_DISPOSITIVO = ["whatsapp", "whatsapp_oficial", "instagram"] as const;
export type GrupoDeDispositivo = (typeof GRUPOS_DE_DISPOSITIVO)[number];

export const ROTULO_DO_GRUPO: Readonly<Record<GrupoDeDispositivo, string>> = {
  whatsapp: "WhatsApp",
  whatsapp_oficial: "WhatsApp Oficial",
  instagram: "Instagram",
};

export function grupoDoDispositivo(provider: string | null | undefined): GrupoDeDispositivo {
  if (provider === "meta_cloud") return "whatsapp_oficial";
  if (provider === "zernio_social") return "instagram";
  return "whatsapp";
}

export interface DispositivoLeve {
  id: string;
  provider?: string | null;
  status: string;
  display_name: string | null;
  phone_number: string | null;
}

export function agruparDispositivos<D extends DispositivoLeve>(
  canais: readonly D[],
): Array<{ grupo: GrupoDeDispositivo; canais: D[] }> {
  return GRUPOS_DE_DISPOSITIVO.map((grupo) => ({
    grupo,
    canais: canais.filter((c) => grupoDoDispositivo(c.provider) === grupo),
  })).filter((g) => g.canais.length > 0);
}

export const bolinhaDoDispositivo = (status: string): "verde" | "vermelha" =>
  lerEstadoDoCanal(status).utilizavel ? "verde" : "vermelha";
