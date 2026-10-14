/**
 * PREFERÊNCIAS DO PAINEL ORIGENS (fork Escale, Fase 1B), por pessoa e por
 * navegador: painel recolhido, lista recolhida, grupos ocultos e o último funil
 * aberto (que o "Negócios" do menu do topo abre).
 *
 * Moram em cookies httpOnly, como "recolher a barra lateral"
 * (`app/actions/shell/toggleSidebar.ts`): o servidor lê e manda como prop — o
 * primeiro render já sai certo, sem `useState` lendo o navegador (ver
 * `tests/unit/hidratacao-useState-nao-le-o-navegador.test.ts`). Quem grava é a
 * Server Action `app/actions/escale/origens.ts`, que passa TUDO por
 * `cookieDaPreferencia` antes.
 */
export const COOKIE_ULTIMO_FUNIL = "escale_ultimo_funil";
export const COOKIE_PAINEL = "escale_origens_painel";
export const COOKIE_LISTA = "escale_origens_lista";
export const COOKIE_OCULTOS = "escale_origens_ocultos";

/** Teto de grupos ocultos guardados: o cookie não cresce sem limite. */
export const OCULTOS_MAX = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PreferenciasDoPainel {
  painelAberto: boolean;
  listaAberta: boolean;
  ocultos: string[];
}

export type PreferenciaDeOrigens =
  | { nome: "painel"; valor: "aberto" | "fechado" }
  | { nome: "lista"; valor: "aberta" | "fechada" }
  | { nome: "ocultos"; valor: string[] }
  | { nome: "ultimo_funil"; valor: string };

export function lerUuid(valor: string | null | undefined): string | null {
  return typeof valor === "string" && UUID.test(valor) ? valor : null;
}

function soUuids(lista: readonly unknown[]): string[] {
  const vistos = new Set<string>();
  for (const item of lista) {
    if (typeof item === "string" && UUID.test(item)) vistos.add(item);
    if (vistos.size === OCULTOS_MAX) break;
  }
  return [...vistos];
}

export function lerOcultos(valor: string | null | undefined): string[] {
  return valor ? soUuids(valor.split(",")) : [];
}

export function lerPreferenciasDoPainel(ler: (nome: string) => string | undefined): PreferenciasDoPainel {
  return {
    painelAberto: ler(COOKIE_PAINEL) !== "fechado",
    listaAberta: ler(COOKIE_LISTA) !== "fechada",
    ocultos: lerOcultos(ler(COOKIE_OCULTOS)),
  };
}

/** Valida o pedido que veio do navegador e diz qual cookie gravar, ou `null`. */
export function cookieDaPreferencia(pedido: unknown): { cookie: string; valor: string } | null {
  if (typeof pedido !== "object" || pedido === null) return null;
  const { nome, valor } = pedido as { nome?: unknown; valor?: unknown };
  if (nome === "painel" && (valor === "aberto" || valor === "fechado")) return { cookie: COOKIE_PAINEL, valor };
  if (nome === "lista" && (valor === "aberta" || valor === "fechada")) return { cookie: COOKIE_LISTA, valor };
  if (nome === "ocultos" && Array.isArray(valor)) return { cookie: COOKIE_OCULTOS, valor: soUuids(valor).join(",") };
  if (nome === "ultimo_funil") {
    const id = lerUuid(typeof valor === "string" ? valor : null);
    return id ? { cookie: COOKIE_ULTIMO_FUNIL, valor: id } : null;
  }
  return null;
}
