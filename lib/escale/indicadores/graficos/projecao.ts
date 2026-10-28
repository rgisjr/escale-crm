/** Projeção do período (fork Escale, Fase 7E, T10 — regra provisória) — pura. */
import type { Unidade } from "../catalogo/tipos";
import type { Resultado } from "../motor/executar";
import type { Granularidade } from "../pergunta";

const DIA = 86_400_000;
const emUtc = (d: string): number => Date.parse(`${d}T00:00:00Z`);
const comoTexto = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const ehUtil = (ms: number): boolean => {
  const d = new Date(ms).getUTCDay();
  return d !== 0 && d !== 6;
};

/** Dias de segunda a sexta entre as datas, inclusivo (sem feriados). */
export function diasUteisEntre(de: string, ate: string): number {
  let n = 0;
  for (let ms = emUtc(de); ms <= emUtc(ate); ms += DIA) if (ehUtil(ms)) n++;
  return n;
}
const diasCorridos = (de: string, ate: string): number => Math.round((emUtc(ate) - emUtc(de)) / DIA) + 1;

/** Início do bucket que contém `dia` (semana começa na segunda, como o `date_trunc` do Postgres). */
function inicioDoBucket(dia: string, g: Granularidade): string {
  const ms = emUtc(dia);
  if (g === "semana") return comoTexto(ms - ((new Date(ms).getUTCDay() + 6) % 7) * DIA);
  if (g === "mes") return `${dia.slice(0, 8)}01`;
  return dia;
}
function proximoBucket(inicio: string, g: Granularidade): string {
  const d = new Date(emUtc(inicio));
  if (g === "semana") return comoTexto(d.getTime() + 7 * DIA);
  if (g === "mes") return comoTexto(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return comoTexto(d.getTime() + DIA);
}

export type Projecao = { total: number; porBucket: number; buckets: Array<{ t: string; valor: number }> };

/**
 * Projeção de um indicador acumulável (contagem ou valor). Sem tempo, sem período, fora do período
 * ou com unidade que não soma (percentual, duração): `null`.
 */
export function projetar(
  r: Resultado,
  serie: { chave: string; unidade: Unidade },
  modo: "normal" | "dias_uteis",
  granularidade: Granularidade = "dia",
): Projecao | null {
  const p = r.periodo;
  if (!p || p.hoje > p.ate || p.hoje < p.de) return null;
  if (serie.unidade !== "contagem" && serie.unidade !== "valor") return null;
  if (!r.colunas.some((c) => c.papel === "tempo")) return null;
  const uteis = modo === "dias_uteis";
  const conta = (de: string, ate: string): number => (uteis ? diasUteisEntre(de, ate) : diasCorridos(de, ate));
  const decorridos = conta(p.de, p.hoje);
  if (decorridos <= 0) return null;
  const acumulado = r.linhas.reduce((n, l) => n + (Number(l[serie.chave]) || 0), 0);
  const ritmo = acumulado / decorridos;
  const buckets: Array<{ t: string; valor: number }> = [];
  if (p.hoje < p.ate && (granularidade === "dia" || granularidade === "semana" || granularidade === "mes")) {
    const amanha = comoTexto(emUtc(p.hoje) + DIA);
    for (let inicio = inicioDoBucket(amanha, granularidade); inicio <= p.ate; inicio = proximoBucket(inicio, granularidade)) {
      const de = inicio < amanha ? amanha : inicio;
      const fimDoBucket = comoTexto(emUtc(proximoBucket(inicio, granularidade)) - DIA);
      const ate = fimDoBucket > p.ate ? p.ate : fimDoBucket;
      buckets.push({ t: `${inicio}T00:00:00`, valor: ritmo * conta(de, ate) });
    }
  }
  return { total: ritmo * conta(p.de, p.ate), porBucket: ritmo, buckets };
}
