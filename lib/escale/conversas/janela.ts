import type { EstadoDaJanela } from "@/lib/channels/janela";
import { fonteDeTemplates } from "@/lib/channels/templates-fonte";

type T = (texto: string) => string;
const dois = (n: number) => String(n).padStart(2, "0");

/** "23:36" no WhatsApp (hh:mm restantes); "6d 23h 56m" fora dele (c02, c48). */
export function formatarRestante(ms: number, curto: boolean): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  if (curto) return `${dois(Math.floor(min / 60))}:${dois(min % 60)}`;
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

export type TomDoSelo = "aberta" | "fechada" | "aguardando";

export function seloDaJanela(
  estado: EstadoDaJanela,
  provider: string | null | undefined,
  aguardandoTemplate: boolean,
  t: T,
): { texto: string; tom: TomDoSelo } | null {
  if (estado.tipo === "sem_restricao") return null;
  if (estado.tipo === "aberta") {
    return {
      texto: formatarRestante(estado.restanteMs, fonteDeTemplates(provider) !== null),
      tom: "aberta",
    };
  }
  return aguardandoTemplate
    ? { texto: t("Aguardando abrir janela"), tom: "aguardando" }
    : { texto: t("Janela encerrada"), tom: "fechada" };
}

export type ModoDoCompositor = "livre" | "so_modelo" | "outro_modelo" | "aguardando_contato";

export function modoDoCompositor(e: {
  estado: EstadoDaJanela;
  provider: string | null | undefined;
  ultimaFoiTemplate: boolean;
}): ModoDoCompositor {
  if (e.estado.tipo !== "fechada") return "livre";
  if (fonteDeTemplates(e.provider) === null) return "aguardando_contato";
  return e.ultimaFoiTemplate ? "outro_modelo" : "so_modelo";
}
