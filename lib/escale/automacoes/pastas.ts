/** As 8 cores do editor de pasta da Clint, na ordem dela (Q7). `marca` é o purple. */
export const CORES_DA_PASTA = ["marca", "blue", "teal", "green", "amber", "red", "pink", "gray"] as const;
export type CorDaPasta = (typeof CORES_DA_PASTA)[number];
export const COR_PADRAO_DA_PASTA: CorDaPasta = "gray";

/** Os 8 ícones, na ordem da Clint. */
export const ICONES_DA_PASTA = ["folder", "tag", "star", "bell", "send", "cart", "calendar", "flag"] as const;
export type IconeDaPasta = (typeof ICONES_DA_PASTA)[number];
export const ICONE_PADRAO_DA_PASTA: IconeDaPasta = "folder";

/**
 * Cor gravada → CSS. Os tons são os `.solid` do Chakra v3 que a Clint usa (amber é
 * o 500 do Tailwind, que o Chakra não tem). `gray` é o `bg.muted` da Clint, a raia
 * da casca. Conferir com 07-007 na bateria; valor fora da lista cai no cinza.
 */
const CSS_DA_COR: Record<CorDaPasta, string> = {
  marca: "var(--color-casca-marca)",
  blue: "#2563EB",
  teal: "#0D9488",
  green: "#16A34A",
  amber: "#F59E0B",
  red: "#DC2626",
  pink: "#DB2777",
  gray: "var(--color-casca-raia)",
};

export function ehCorDaPasta(v: unknown): v is CorDaPasta {
  return typeof v === "string" && (CORES_DA_PASTA as readonly string[]).includes(v);
}
export function ehIconeDaPasta(v: unknown): v is IconeDaPasta {
  return typeof v === "string" && (ICONES_DA_PASTA as readonly string[]).includes(v);
}
export function corDaPasta(cor: string): string {
  return ehCorDaPasta(cor) ? CSS_DA_COR[cor] : CSS_DA_COR.gray;
}
/** O ícone no trilho é pintado na cor; o cinza (fundo claro) vira o cinza do texto. */
export function corDoIconeDaPasta(cor: string): string {
  return cor === "gray" || !ehCorDaPasta(cor) ? "var(--color-casca-suave)" : CSS_DA_COR[cor];
}

/** Nomes em português para `aria-label` (passam por `t()`). */
export const NOME_DA_COR: Record<CorDaPasta, string> = {
  marca: "Cor da marca",
  blue: "Azul",
  teal: "Verde-azulado",
  green: "Verde",
  amber: "Âmbar",
  red: "Vermelho",
  pink: "Rosa",
  gray: "Cinza",
};
export const NOME_DO_ICONE: Record<IconeDaPasta, string> = {
  folder: "Pasta",
  tag: "Etiqueta",
  star: "Estrela",
  bell: "Sino",
  send: "Avião de papel",
  cart: "Carrinho",
  calendar: "Calendário",
  flag: "Bandeira",
};
