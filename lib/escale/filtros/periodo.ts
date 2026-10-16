import { enxugar, normalizarStatus, type FiltrosDoQuadro, type StatusDoNegocio } from "./tipos";

/**
 * O FILTRO "DATA" DA CLINT (fork Escale, Casca V4; print do usuário de 15/10,
 * `docs/escale/clint/prints-do-usuario/2026-10-15-filtro-data-aberto.png`).
 *
 * Um período por vez, do tipo da aba do calendário: criação (`criadoEm`), ganho
 * (`ganhoEm`) e perda (`perdidoEm`). O quarto tipo da Clint (a aba do relógio,
 * `scheduled_at` no bundle) não tem equivalente nosso: a aba fica desligada.
 *
 * A forma é a mesma de `Periodo` (`components/escale/ui/CalendarioDePeriodo`),
 * escrita aqui para a regra continuar pura e testável sem tela.
 */
export type TipoDoPeriodo = "criacao" | "ganho" | "perda" | "agendado";

export interface PeriodoDoFiltro {
  tipo: TipoDoPeriodo;
  /** AAAA-MM-DD */
  de?: string;
  /** AAAA-MM-DD */
  ate?: string;
}

export const TIPOS_DE_DATA_DISPONIVEIS = [
  "criacao",
  "ganho",
  "perda",
] as const satisfies readonly TipoDoPeriodo[];
type TipoDisponivel = (typeof TIPOS_DE_DATA_DISPONIVEIS)[number];

const disponivel = (tipo: TipoDoPeriodo): tipo is TipoDisponivel =>
  (TIPOS_DE_DATA_DISPONIVEIS as readonly string[]).includes(tipo);

/** Ganho e perda só existem com o status deles no quadro (decisão D3). */
const STATUS_DO_TIPO: Partial<Record<TipoDisponivel, StatusDoNegocio>> = {
  ganho: "won",
  perda: "lost",
};

function diasDe(
  f: FiltrosDoQuadro,
  tipo: TipoDisponivel,
): { de?: string; ate?: string } | undefined {
  if (tipo === "criacao") return f.criadoEm;
  if (tipo === "ganho") return f.ganhoEm;
  return f.perdidoEm;
}

/** O período aplicado agora, ou `null` quando o Data não filtra nada. */
export function periodoDosFiltros(f: FiltrosDoQuadro): PeriodoDoFiltro | null {
  for (const tipo of TIPOS_DE_DATA_DISPONIVEIS) {
    const p = diasDe(f, tipo);
    if (p && (p.de || p.ate))
      return { tipo, ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) };
  }
  return null;
}

/**
 * Os filtros com o período `p` no lugar de qualquer outro. Sem datas (ou com o
 * tipo desligado), o Data sai. Ganho e perda acrescentam o status deles.
 */
export function comPeriodo(f: FiltrosDoQuadro, p: PeriodoDoFiltro): FiltrosDoQuadro {
  const semData: Partial<FiltrosDoQuadro> = { ...f };
  delete semData.criadoEm;
  delete semData.ganhoEm;
  delete semData.perdidoEm;
  if (!disponivel(p.tipo) || (!p.de && !p.ate)) return enxugar({ ...semData, status: f.status });
  const dias = { ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) };
  const pedido = STATUS_DO_TIPO[p.tipo];
  const proximo: FiltrosDoQuadro = {
    ...semData,
    status: pedido ? normalizarStatus([...f.status, pedido]) : f.status,
  };
  if (p.tipo === "criacao") proximo.criadoEm = dias;
  else if (p.tipo === "ganho") proximo.ganhoEm = dias;
  else proximo.perdidoEm = dias;
  return enxugar(proximo);
}

/** "15/10/2026" → "2026-10-15". Texto que não é uma data de verdade → `null`. */
export function isoDaDataBr(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const dd = m[1]!;
  const mm = m[2]!;
  const aaaa = m[3]!;
  const d = new Date(Number(aaaa), Number(mm) - 1, Number(dd));
  if (
    d.getFullYear() !== Number(aaaa) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  )
    return null;
  return `${aaaa}-${mm}-${dd}`;
}

/** "2026-10-15" → "15/10/2026"; vazio ou fora do formato → "". */
export function dataBrDoIso(iso: string | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  return m ? `${m[3]!}/${m[2]!}/${m[1]!}` : "";
}
