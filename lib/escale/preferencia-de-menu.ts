/**
 * A CHAVE DA CASCA NOVA (fork Escale): menu no topo + tema Escale, por pessoa.
 *
 * Mora num cookie, como "recolher a barra lateral" (`app/actions/shell/toggleSidebar.ts`):
 * cada pessoa liga para si, sem banco e sem mexer nas preferências de interface da
 * organização. Quando a casca nova for aprovada, trocar `MENU_PADRAO` para `"topo"`
 * liga para todo mundo (quem gravou `lateral` continua na lateral).
 */
export type PreferenciaDeMenu = "lateral" | "topo";

export const COOKIE_DO_MENU = "escale_menu";

export const MENU_PADRAO: PreferenciaDeMenu = "lateral";

export function lerPreferenciaDeMenu(valor: string | null | undefined): PreferenciaDeMenu {
  return valor === "topo" || valor === "lateral" ? valor : MENU_PADRAO;
}

/** Só volta para dentro do app: `/app` ou `/app/...`. O resto cai em `/app`. */
export function destinoSeguro(voltar: string | null): string {
  if (!voltar) return "/app";
  if (voltar.includes("\\") || voltar.startsWith("//")) return "/app";
  if (temSegmentoDeTravessia(voltar)) return "/app";
  if (voltar === "/app" || voltar.startsWith("/app/") || voltar.startsWith("/app?")) return voltar;
  return "/app";
}

/** Detecta `..` como segmento de caminho inteiro (não "contém dois pontos"). */
function temSegmentoDeTravessia(caminho: string): boolean {
  const semQuery = caminho.split(/[?#]/, 1)[0] ?? caminho;
  return semQuery.split("/").includes("..");
}

export function caminhoDaChave(usar: PreferenciaDeMenu, voltar: string): string {
  return `/app/escale/menu?usar=${usar}&voltar=${encodeURIComponent(voltar)}`;
}
