import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

/**
 * PERÍODOS DO CALENDÁRIO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * Funções puras. A data viaja como `AAAA-MM-DD`, montada com o calendário
 * LOCAL — nunca `toISOString()`, que converte para UTC e, em São Paulo, vira
 * o dia seguinte depois das 21h. Na tela ela aparece como `dd/mm/aaaa`.
 *
 * A semana começa no domingo, como no calendário da Clint
 * (DOM SEG TER QUA QUI SEX SÁB). "Essa semana", "Esse mês" e "Esse ano" vão
 * do primeiro ao último dia inteiro — a Clint não mostra se param em hoje
 * (print pendente, nº 24 do plano-índice).
 */

export type AtalhoDePeriodo =
  | "hoje"
  | "ontem"
  | "essa-semana"
  | "semana-passada"
  | "esse-mes"
  | "mes-passado"
  | "esse-ano";

/** Na ordem da lista da Clint. */
export const ATALHOS_DE_PERIODO: readonly AtalhoDePeriodo[] = [
  "hoje",
  "ontem",
  "essa-semana",
  "semana-passada",
  "esse-mes",
  "mes-passado",
  "esse-ano",
];

const SEMANA_NO_DOMINGO = { weekStartsOn: 0 } as const;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isoDaData(data: Date): string {
  return format(data, "yyyy-MM-dd");
}

export function dataDoIso(iso: string): Date {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`data fora do formato AAAA-MM-DD: ${iso}`);
  const data = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isoDaData(data) !== iso) throw new Error(`data que não existe: ${iso}`);
  return data;
}

export function formatarDataBr(iso: string): string {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`data fora do formato AAAA-MM-DD: ${iso}`);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function intervalo(de: Date, ate: Date): { de: string; ate: string } {
  return { de: isoDaData(de), ate: isoDaData(ate) };
}

export function periodoDoAtalho(atalho: AtalhoDePeriodo, hoje: Date): { de: string; ate: string } {
  switch (atalho) {
    case "hoje":
      return intervalo(hoje, hoje);
    case "ontem": {
      const ontem = subDays(hoje, 1);
      return intervalo(ontem, ontem);
    }
    case "essa-semana":
      return intervalo(startOfWeek(hoje, SEMANA_NO_DOMINGO), endOfWeek(hoje, SEMANA_NO_DOMINGO));
    case "semana-passada": {
      const passada = subWeeks(hoje, 1);
      return intervalo(startOfWeek(passada, SEMANA_NO_DOMINGO), endOfWeek(passada, SEMANA_NO_DOMINGO));
    }
    case "esse-mes":
      return intervalo(startOfMonth(hoje), endOfMonth(hoje));
    case "mes-passado": {
      const passado = subMonths(hoje, 1);
      return intervalo(startOfMonth(passado), endOfMonth(passado));
    }
    case "esse-ano":
      return intervalo(startOfYear(hoje), endOfYear(hoje));
  }
}

/** O atalho cujo período é exatamente este — ou nenhum. */
export function atalhoDoPeriodo(de: string, ate: string, hoje: Date): AtalhoDePeriodo | null {
  return (
    ATALHOS_DE_PERIODO.find((atalho) => {
      const p = periodoDoAtalho(atalho, hoje);
      return p.de === de && p.ate === ate;
    }) ?? null
  );
}

/** Semanas inteiras, de domingo a sábado, cobrindo o mês. `doMes` marca os dias dele. */
export function diasDoMes(ano: number, mes0: number): { iso: string; doMes: boolean }[] {
  const primeiro = new Date(ano, mes0, 1);
  const fim = endOfWeek(endOfMonth(primeiro), SEMANA_NO_DOMINGO);
  const dias: { iso: string; doMes: boolean }[] = [];
  for (let dia = startOfWeek(primeiro, SEMANA_NO_DOMINGO); dia <= fim; dia = addDays(dia, 1)) {
    dias.push({ iso: isoDaData(dia), doMes: dia.getMonth() === primeiro.getMonth() });
  }
  return dias;
}

export function mesVizinho(ano: number, mes0: number, passo: number): { ano: number; mes0: number } {
  const data = new Date(ano, mes0 + passo, 1);
  return { ano: data.getFullYear(), mes0: data.getMonth() };
}

/** Os dois cliques do calendário, em qualquer ordem. `AAAA-MM-DD` compara como texto. */
export function ordenarIntervalo(a: string, b: string): { de: string; ate: string } {
  return a <= b ? { de: a, ate: b } : { de: b, ate: a };
}

/** Entre os extremos, sem eles (os extremos têm pintura própria). */
export function dentroDoIntervalo(iso: string, de: string | undefined, ate: string | undefined): boolean {
  if (!de || !ate) return false;
  return iso > de && iso < ate;
}
