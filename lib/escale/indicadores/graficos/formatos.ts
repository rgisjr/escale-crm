/** Formatos brasileiros dos gráficos (regra 5 do CLAUDE.md): "1.541", "2,33%", "R$ 325.264,14", "357,8 mil". */
import type { Unidade } from "../catalogo/tipos";
import type { Granularidade } from "../pergunta";

const NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const COMPACTO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function formatarDuracao(segundos: number): string {
  const total = Math.floor(Math.max(0, segundos));
  if (total < 1) return "0s";
  const partes: Array<[number, string]> = [
    [Math.floor(total / 86_400), "d"],
    [Math.floor((total % 86_400) / 3_600), "h"],
    [Math.floor((total % 3_600) / 60), "m"],
    [total % 60, "s"],
  ];
  const primeira = partes.findIndex(([n]) => n > 0);
  return partes
    .slice(primeira)
    .map(([n, u]) => `${n}${u}`)
    .join(" ");
}

export function formatarValor(v: number | null, unidade: Unidade): string {
  if (v === null || !Number.isFinite(v)) return "—";
  switch (unidade) {
    case "contagem":
      return NUMERO.format(v);
    case "valor":
      return REAIS.format(v);
    case "percentual":
      return v > 0 && v < 1 ? "<1%" : `${NUMERO.format(v)}%`;
    case "duracao":
      return formatarDuracao(v);
  }
}

/** Eixo de valores compacto: "357,8 mil", "1,2 mi"; abaixo de mil, sem casas. */
export function formatarEixo(v: number, unidade: Unidade): string {
  if (unidade === "duracao") return v < 3_600 ? `${Math.round(v / 60)}m` : `${Math.round(v / 3_600)}h`;
  if (unidade === "percentual") return `${NUMERO.format(v)}%`;
  const abs = Math.abs(v);
  const compacto =
    abs >= 1e9
      ? `${COMPACTO.format(v / 1e9)} bi`
      : abs >= 1e6
        ? `${COMPACTO.format(v / 1e6)} mi`
        : abs >= 1e3
          ? `${COMPACTO.format(v / 1e3)} mil`
          : String(Math.round(v));
  return unidade === "valor" ? `R$ ${compacto}` : compacto;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Rótulo do ponto de tempo no eixo (R11). `iso` é o texto do motor (`2026-10-03T14:00:00`, sem fuso):
 * lido pelas partes do texto, nunca por `Date`, para o navegador não deslocar o horário.
 */
export function rotuloDoTempo(iso: string, granularidade: Granularidade | undefined, variosDias: boolean): string {
  const [ano = "", mes = "01", dia = "01"] = iso.slice(0, 10).split("-");
  const hora = iso.slice(11, 13);
  const diaMes = `${dia}/${mes}`;
  switch (granularidade) {
    case "hora":
      return variosDias ? `${diaMes} ${hora}h` : `${hora}h`;
    case "mes":
      return `${MESES[Number(mes) - 1] ?? mes}/${ano}`;
    case "trimestre":
      return `${Math.floor((Number(mes) - 1) / 3) + 1}º tri/${ano}`;
    case "ano":
      return ano;
    default:
      return diaMes;
  }
}

const PERCENTUAL = (casas: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Fase 7E: "+12,5%", "−3,2%", "0%". */
export function formatarVariacao(pct: number): string {
  if (pct === 0) return "0%";
  const texto = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Math.abs(pct));
  return `${pct > 0 ? "+" : "−"}${texto}%`;
}

/** Fase 7E: compacto "1,2 mil", "R$ 1,2 mi" (o formato dos números do funil). */
export function formatarCompacto(v: number, unidade: Unidade = "contagem"): string {
  return formatarEixo(v, unidade);
}

/** Fase 7E: percentual com `casas` decimais fixas ("39%", "39,4%", "39,41%"). */
export function formatarPercentual(v: number, casas = 0): string {
  return `${PERCENTUAL(casas).format(v)}%`;
}
