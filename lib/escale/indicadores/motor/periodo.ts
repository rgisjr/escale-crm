/** Atalhos de período resolvidos no servidor, no fuso da organização (Fase 7A). */
import type { Periodo } from "../pergunta";

export interface IntervaloDeDias {
  /** AAAA-MM-DD, inclusivo. */
  de: string;
  /** AAAA-MM-DD, inclusivo (o SQL usa o dia seguinte como limite exclusivo). */
  ate: string;
}

const DIA_EM_MS = 86_400_000;

/** O dia de `agora` no fuso, como AAAA-MM-DD. */
export function diaNoFuso(agora: Date, fuso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

const emUtc = (dia: string): Date => new Date(`${dia}T00:00:00Z`);
const comoTexto = (data: Date): string => data.toISOString().slice(0, 10);
const somar = (dia: string, dias: number): string => comoTexto(new Date(emUtc(dia).getTime() + dias * DIA_EM_MS));
const primeiroDoMes = (dia: string): string => `${dia.slice(0, 8)}01`;
/** A semana da casca vai de domingo a sábado (mesma regra de `lib/escale/ui/periodos`). */
const domingoDaSemana = (dia: string): string => somar(dia, -emUtc(dia).getUTCDay());
const ultimoDoMes = (dia: string): string => {
  const d = emUtc(dia);
  return comoTexto(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
};

/** `null` significa "tudo": sem limite de data. */
export function resolverPeriodo(p: Periodo, agora: Date, fuso: string): IntervaloDeDias | null {
  const hoje = diaNoFuso(agora, fuso);
  switch (p.atalho) {
    case "hoje":
      return { de: hoje, ate: hoje };
    case "ontem":
      return { de: somar(hoje, -1), ate: somar(hoje, -1) };
    case "7_dias":
      return { de: somar(hoje, -6), ate: hoje };
    case "15_dias":
      return { de: somar(hoje, -14), ate: hoje };
    case "1_mes":
      return { de: somar(hoje, -29), ate: hoje };
    case "esta_semana": {
      const domingo = domingoDaSemana(hoje);
      return { de: domingo, ate: somar(domingo, 6) };
    }
    case "semana_passada": {
      const domingo = domingoDaSemana(hoje);
      return { de: somar(domingo, -7), ate: somar(domingo, -1) };
    }
    case "este_mes":
      return { de: primeiroDoMes(hoje), ate: ultimoDoMes(hoje) };
    case "mes_passado": {
      const fimDoAnterior = somar(primeiroDoMes(hoje), -1);
      return { de: primeiroDoMes(fimDoAnterior), ate: fimDoAnterior };
    }
    case "este_ano":
      return { de: `${hoje.slice(0, 4)}-01-01`, ate: `${hoje.slice(0, 4)}-12-31` };
    case "tudo":
      return null;
    case "personalizado":
      return { de: p.de as string, ate: p.ate as string };
  }
}
