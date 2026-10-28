/** As cores das séries (R12): 3 da marca Escale IA e as 27 seguintes da Clint, na ordem. */
export const CORES_DAS_SERIES = [
  "var(--color-casca-marca)",
  "color-mix(in oklab, var(--color-casca-marca) 62%, white)",
  "color-mix(in oklab, var(--color-casca-marca) 26%, white)",
  "#4D74FF",
  "#43BBFF",
  "#94CBFF",
  "#73B8D6",
  "#94ABFF",
  "#4D7FC9",
  "#3A22CD",
  "#2F4AA7",
  "#D592FF",
  "#DF5EFF",
  "#FF8AE5",
  "#FEBDFF",
  "#FFBDBD",
  "#FF9696",
  "#FF6565",
  "#FF8540",
  "#FFA573",
  "#FFCC9D",
  "#D3D3C3",
  "#B6C7C3",
  "#98EAD7",
  "#4BDEBC",
  "#0C9B7A",
  "#2995AC",
  "#44D3F2",
  "#97C7FF",
  "#ABAFCF",
] as const;

export const corDaSerie = (i: number): string => CORES_DAS_SERIES[i % CORES_DAS_SERIES.length] ?? "#4D74FF";

const VERDE_DO_FUNIL = "#16A34A";

/** Fase 7E (T11): o verde da meta (GOAL da Clint), um por meta em rodízio. */
export const CORES_DA_META = ["#22C55E", "#16A34A", "#15803D", "#14532D"] as const;
export const corDaMeta = (i: number): string => CORES_DA_META[i % CORES_DA_META.length] ?? "#22C55E";

/** Fase 7E (T12, provisório): a paleta "uma cor por etapa", lida de 10-044 no olho. */
export const PALETA_POR_ETAPA = ["#5B4FE9", "#6D28D9", "#7C3AED", "#2563EB", "#0E7490", "#0D9488", "#059669", "#16A34A"] as const;

/** T12: `iguais` = marca em todas; `degrade` = o da 7C (marca → verde); `por_etapa` = a paleta em rodízio; a última pode ficar verde. */
export function coresDoFunil(n: number, modo: "iguais" | "degrade" | "por_etapa" = "degrade", ultimaEmVerde = false): string[] {
  if (n <= 0) return [];
  const base = Array.from({ length: n }, (_, i): string => {
    if (modo === "iguais") return "var(--color-casca-marca)";
    if (modo === "por_etapa") return PALETA_POR_ETAPA[i % PALETA_POR_ETAPA.length] ?? "#5B4FE9";
    if (n === 1) return VERDE_DO_FUNIL;
    return i === n - 1
      ? VERDE_DO_FUNIL
      : `color-mix(in oklab, var(--color-casca-marca) ${Math.round(100 - (i * 100) / (n - 1))}%, ${VERDE_DO_FUNIL})`;
  });
  return ultimaEmVerde ? [...base.slice(0, -1), VERDE_DO_FUNIL] : base;
}

const CORES_DO_AVATAR = ["#F5B8C8", "#B8D4F5", "#C3E8C5", "#F5E1A8", "#D4C3F0", "#F5CBA7", "#A8E0E0", "#E0C3D9"] as const;
/** Fase 7E (provisório): uma de 8 cores pastel estável pelo nome. */
export function corDoAvatar(nome: string): string {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES_DO_AVATAR[h % CORES_DO_AVATAR.length] ?? "#B8D4F5";
}

/** Fase 7E (T18): `casca-raia` no nível 0 e a marca em 25/50/75/100% nos níveis 1–4. */
export function escalaDoHeatmap(nivel: 0 | 1 | 2 | 3 | 4): string {
  if (nivel === 0) return "var(--color-casca-raia)";
  return `color-mix(in oklab, var(--color-casca-marca) ${nivel * 25}%, white)`;
}
