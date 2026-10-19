import { lerEstadoDoCanal } from "@/lib/channels/estado";

import { grupoDoDispositivo, type GrupoDeDispositivo } from "./nova-conversa";
import type { Papel } from "./permissoes";

/**
 * "CONFIGURAÇÃO DE CANAIS" DA CASCA (fork Escale, Fase 3C; E2; c98, c99). Os
 * cartões por canal, o status da pílula e quem está em cada dispositivo — os
 * responsáveis por canal do original (0228): `legacy_unconfigured` quer dizer
 * "todos os atendentes".
 */
export const SLUG_DO_CANAL: Readonly<Record<GrupoDeDispositivo, string>> = {
  whatsapp: "whatsapp",
  whatsapp_oficial: "whatsapp-oficial",
  instagram: "instagram",
};

export function canalDoSlug(slug: string): GrupoDeDispositivo | null {
  const achado = (Object.entries(SLUG_DO_CANAL) as Array<[GrupoDeDispositivo, string]>).find(
    ([, s]) => s === slug,
  );
  return achado ? achado[0] : null;
}

export const CARTOES_DE_CANAL: ReadonlyArray<{
  canal: GrupoDeDispositivo;
  nome: string;
  oficial: boolean;
}> = [
  { canal: "whatsapp_oficial", nome: "WhatsApp", oficial: true },
  { canal: "whatsapp", nome: "WhatsApp", oficial: false },
  { canal: "instagram", nome: "Instagram", oficial: false },
];

export { grupoDoDispositivo };

export const statusDoDispositivo = (status: string): "conectado" | "desconectado" =>
  lerEstadoDoCanal(status).utilizavel ? "conectado" : "desconectado";

export interface CanalDoRoteamento {
  id: string;
  user_ids: string[];
  mode: "legacy_unconfigured" | "restricted" | "restricted_empty";
}

export const quemEstaNoDispositivo = (
  canal: CanalDoRoteamento,
  elegiveis: readonly string[],
): string[] =>
  canal.mode === "legacy_unconfigured"
    ? [...elegiveis]
    : canal.user_ids.filter((u) => elegiveis.includes(u));

/** A lista nova do canal depois de ligar/desligar uma pessoa (o PATCH do original troca a lista inteira). */
export function ligarNoDispositivo(
  canal: CanalDoRoteamento,
  elegiveis: readonly string[],
  userId: string,
  ligado: boolean,
): string[] {
  const atuais = quemEstaNoDispositivo(canal, elegiveis);
  const sem = atuais.filter((u) => u !== userId);
  return ligado ? elegiveis.filter((u) => u === userId || sem.includes(u)) : sem;
}

export const ativarTodosNoDispositivo = (elegiveis: readonly string[]): string[] => [...elegiveis];

/** Os dispositivos de uma pessoa (a coluna DISPOSITIVO de c40 e a aba Contas e dispositivos). Admin: todos. */
export function dispositivosDoUsuario(
  userId: string,
  papel: Papel,
  canais: readonly CanalDoRoteamento[],
  elegiveis: readonly string[],
): string[] {
  if (papel === "admin") return canais.map((c) => c.id);
  return canais
    .filter((c) => quemEstaNoDispositivo(c, elegiveis).includes(userId))
    .map((c) => c.id);
}
