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

/** R15 (provisório): degradê da marca até verde; a última etapa é sempre verde. */
export function coresDoFunil(n: number): string[] {
  if (n <= 1) return [VERDE_DO_FUNIL];
  return Array.from({ length: n }, (_, i) =>
    i === n - 1
      ? VERDE_DO_FUNIL
      : `color-mix(in oklab, var(--color-casca-marca) ${Math.round(100 - (i * 100) / (n - 1))}%, ${VERDE_DO_FUNIL})`,
  );
}
