/** No máximo 3 consultas por pessoa ao mesmo tempo; até 10 esperando; a 14ª é recusada (Fase 7A). */
import { ErroDoMotor } from "./erros";

export const CONSULTAS_EM_PARALELO = 3;
export const CONSULTAS_NA_ESPERA = 10;
/** Teto do processo (revisão da frente 7): o pool é dividido com a IA e o banco Free tem pouca memória. */
export const CONSULTAS_GLOBAIS_EM_PARALELO = 4;
export const CONSULTAS_GLOBAIS_NA_ESPERA = 30;

const global: Estado = { ativos: 0, espera: [] };

interface Estado {
  ativos: number;
  espera: (() => void)[];
}

const POR_CHAVE = new Map<string, Estado>();

function liberar(chave: string, estado: Estado): void {
  const proxima = estado.espera.shift();
  if (proxima) {
    proxima(); // a vaga passa direto para quem esperava
    return;
  }
  estado.ativos -= 1;
  if (estado.ativos === 0) POR_CHAVE.delete(chave);
}

async function entrarNoGlobal(): Promise<void> {
  if (global.ativos < CONSULTAS_GLOBAIS_EM_PARALELO) {
    global.ativos += 1;
    return;
  }
  if (global.espera.length >= CONSULTAS_GLOBAIS_NA_ESPERA) throw new ErroDoMotor("fila_cheia");
  await new Promise<void>((retomar) => global.espera.push(retomar));
}

function sairDoGlobal(): void {
  const proxima = global.espera.shift();
  if (proxima) proxima();
  else global.ativos -= 1;
}

export async function comVaga<T>(chave: string, fn: () => Promise<T>): Promise<T> {
  const estado = POR_CHAVE.get(chave) ?? { ativos: 0, espera: [] };
  POR_CHAVE.set(chave, estado);
  if (estado.ativos < CONSULTAS_EM_PARALELO) {
    estado.ativos += 1;
  } else if (estado.espera.length >= CONSULTAS_NA_ESPERA) {
    throw new ErroDoMotor("fila_cheia");
  } else {
    await new Promise<void>((retomar) => estado.espera.push(retomar));
  }
  try {
    await entrarNoGlobal();
    try {
      return await fn();
    } finally {
      sairDoGlobal();
    }
  } finally {
    liberar(chave, estado);
  }
}
