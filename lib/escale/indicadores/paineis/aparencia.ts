/**
 * A APARÊNCIA DE UM PAINEL (fork Escale, Fase 7B): cor e ícone do quadrado.
 * Paleta e ícones copiados do `IconPicker` da Clint, na ordem dela. A 2ª cor
 * (o roxo da Clint) é a marca da organização, gravada como `marca`.
 */
export const CORES_DO_PAINEL = [
  "#3D3A6C", "marca", "#B4ADFF", "#D96CFF", "#263AF1", "#83B4FF", "#48DEA8", "#5BFFC4",
  "#B5846F", "#FF4062", "#FFA7A7", "#FFA959", "#FFDFC1", "#FFE073", "#B9F26B", "#9D9D9D",
  "#CECECF", "#E6E6E6", "#3B7E85", "#60C6D0", "#DCE4FF", "#E9F4FF",
] as const;
export type CorDoPainel = (typeof CORES_DO_PAINEL)[number];
export const COR_PADRAO: CorDoPainel = "marca";

export const ICONES_DO_PAINEL = [
  "bookmark", "heart", "star", "user", "shopping-cart", "clock", "settings", "map", "camera",
  "music", "film", "book", "phone", "mail", "globe", "monitor", "search", "pen-tool", "calendar",
  "download", "upload", "gift", "wifi", "battery-charging", "bell", "thumbs-up", "smile",
  "briefcase", "bar-chart", "compass", "layers", "git-branch", "linkedin", "facebook", "instagram",
  "youtube", "tool", "mic", "coffee", "cast", "award", "alert-circle",
] as const;
export const SEM_ICONE = "nenhum" as const;
export type IconeDoPainel = (typeof ICONES_DO_PAINEL)[number] | typeof SEM_ICONE;
export const ICONE_PADRAO: IconeDoPainel = "briefcase";

/** Nome em português de cada ícone (chave do dicionário, para o `aria-label`). */
export const NOMES_DOS_ICONES: Record<IconeDoPainel, string> = {
  bookmark: "Marcador",
  heart: "Coração",
  star: "Estrela",
  user: "Pessoa",
  "shopping-cart": "Carrinho",
  clock: "Relógio",
  settings: "Engrenagem",
  map: "Mapa",
  camera: "Câmera",
  music: "Música",
  film: "Filme",
  book: "Livro",
  phone: "Telefone",
  mail: "Envelope",
  globe: "Globo",
  monitor: "Monitor",
  search: "Lupa",
  "pen-tool": "Caneta",
  calendar: "Calendário",
  download: "Baixar",
  upload: "Enviar",
  gift: "Presente",
  wifi: "Wi-Fi",
  "battery-charging": "Bateria carregando",
  bell: "Sino",
  "thumbs-up": "Curtir",
  smile: "Sorriso",
  briefcase: "Maleta",
  "bar-chart": "Gráfico de barras",
  compass: "Bússola",
  layers: "Camadas",
  "git-branch": "Ramificação",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tool: "Ferramenta",
  mic: "Microfone",
  coffee: "Café",
  cast: "Transmitir",
  award: "Medalha",
  "alert-circle": "Alerta",
  nenhum: "Sem ícone",
};

const CORES = new Set<string>(CORES_DO_PAINEL);
const ICONES = new Set<string>([...ICONES_DO_PAINEL, SEM_ICONE]);

export function ehCorDoPainel(v: unknown): v is CorDoPainel {
  return typeof v === "string" && CORES.has(v);
}

export function ehIconeDoPainel(v: unknown): v is IconeDoPainel {
  return typeof v === "string" && ICONES.has(v);
}

/** Cor gravada → CSS. `marca` usa a cor da organização; cor fora da paleta (dado antigo) cai na marca. */
export function corDoPainel(cor: string): string {
  return cor !== "marca" && ehCorDoPainel(cor) ? cor : "var(--color-casca-marca)";
}

/** As iniciais do "sem ícone": a 1ª letra das 2 primeiras palavras, maiúsculas. */
export function iniciaisDoPainel(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palavra) => palavra.charAt(0).toUpperCase())
    .join("");
}
