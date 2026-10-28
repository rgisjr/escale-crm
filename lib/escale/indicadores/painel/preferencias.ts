/** O que o painel guarda no navegador (Fase 7C): o filtro por painel e o "Atualizar a cada". Nunca lança. */
import { filtroDoPainelSchema, type FiltroDoPainel } from "../pergunta";
import { FILTRO_PADRAO } from "./filtro";

export const CHAVE_DO_FILTRO = (painelId: string): string => `escale:indicadores:filtro:${painelId}`;
export const CHAVE_DO_INTERVALO = "escale:indicadores:atualizar-a-cada";
/** Minutos; `null` = Desativado. */
export const INTERVALOS = [null, 15, 30, 60, 120, 1440] as const;
export type Intervalo = (typeof INTERVALOS)[number];

export type EstadoGuardado = { versao: 1; filtro: FiltroDoPainel; filtroSalvoId: string | null; faixaAberta: boolean };

/** O estado de quem nunca mexeu: o primeiro render do cliente (igual ao do servidor) e o que vale se o navegador falhar. */
export const ESTADO_PADRAO: EstadoGuardado = { versao: 1, filtro: FILTRO_PADRAO, filtroSalvoId: null, faixaAberta: false };
const padrao = (): EstadoGuardado => ESTADO_PADRAO;

function armazenamentoDoNavegador(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function lerEstado(painelId: string, armazenamento: Storage | null = armazenamentoDoNavegador()): EstadoGuardado {
  try {
    const texto = armazenamento?.getItem(CHAVE_DO_FILTRO(painelId));
    if (!texto) return padrao();
    const bruto = JSON.parse(texto) as Partial<EstadoGuardado>;
    const filtro = filtroDoPainelSchema.safeParse(bruto.filtro);
    if (bruto.versao !== 1 || !filtro.success) return padrao();
    return {
      versao: 1,
      filtro: filtro.data,
      filtroSalvoId: typeof bruto.filtroSalvoId === "string" ? bruto.filtroSalvoId : null,
      faixaAberta: bruto.faixaAberta === true,
    };
  } catch {
    return padrao();
  }
}

export function gravarEstado(
  painelId: string,
  estado: EstadoGuardado,
  armazenamento: Storage | null = armazenamentoDoNavegador(),
): void {
  try {
    armazenamento?.setItem(CHAVE_DO_FILTRO(painelId), JSON.stringify(estado));
  } catch {
    // Sem armazenamento (janela privada, cota cheia): a tela segue sem lembrar.
  }
}

export function lerIntervalo(armazenamento: Storage | null = armazenamentoDoNavegador()): Intervalo {
  try {
    const n = Number(armazenamento?.getItem(CHAVE_DO_INTERVALO));
    return (INTERVALOS as readonly (number | null)[]).includes(n) && n !== 0 ? (n as Intervalo) : null;
  } catch {
    return null;
  }
}

export function gravarIntervalo(v: Intervalo, armazenamento: Storage | null = armazenamentoDoNavegador()): void {
  try {
    armazenamento?.setItem(CHAVE_DO_INTERVALO, String(v ?? 0));
  } catch {
    // Igual ao filtro: não lembrar não derruba o painel.
  }
}
