import type { MoedaServida } from "@/lib/money";

/**
 * A bandeira ao lado da moeda (P04: "Real (BRL)" com a bandeira). A Clint usa
 * imagem; aqui é SVG simples, porque a bandeira em emoji não aparece no Windows.
 */
export function BandeiraDaMoeda({ moeda }: { moeda: MoedaServida }) {
  const quadro = {
    width: 20,
    height: 14,
    viewBox: "0 0 20 14",
    "aria-hidden": true as const,
    className: "shrink-0 rounded-[2px]",
  };
  switch (moeda) {
    case "BRL":
      return (
        <svg {...quadro}>
          <rect width="20" height="14" fill="#009C3B" />
          <path d="M10 2 L18 7 L10 12 L2 7 Z" fill="#FFDF00" />
          <circle cx="10" cy="7" r="3" fill="#002776" />
        </svg>
      );
    case "USD":
      return (
        <svg {...quadro}>
          <rect width="20" height="14" fill="#fff" />
          {[0, 2, 4, 6, 8, 10, 12].map((y) => (
            <rect key={y} y={y} width="20" height="1" fill="#B22234" />
          ))}
          <rect width="9" height="7" fill="#3C3B6E" />
        </svg>
      );
    case "EUR":
      return (
        <svg {...quadro}>
          <rect width="20" height="14" fill="#003399" />
          <circle
            cx="10"
            cy="7"
            r="3.5"
            fill="none"
            stroke="#FFCC00"
            strokeWidth="1"
            strokeDasharray="1 1.2"
          />
        </svg>
      );
    case "MXN":
      return (
        <svg {...quadro}>
          <rect width="7" height="14" fill="#006847" />
          <rect x="7" width="6" height="14" fill="#fff" />
          <rect x="13" width="7" height="14" fill="#CE1126" />
          <circle cx="10" cy="7" r="1.5" fill="#8C5A2B" />
        </svg>
      );
    case "AOA":
      return (
        <svg {...quadro}>
          <rect width="20" height="7" fill="#CC092F" />
          <rect y="7" width="20" height="7" fill="#000" />
          <circle cx="10" cy="7" r="2" fill="none" stroke="#FFCB00" strokeWidth="1" />
        </svg>
      );
  }
}
