/** No máximo 3 consultas por pessoa ao mesmo tempo; até 10 esperando; a 14ª é recusada (Fase 7A). */
import { ErroDoMotor } from "./erros";

export const CONSULTAS_EM_PARALELO = 3;
export const CONSULTAS_NA_ESPERA = 10;

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
    return await fn();
  } finally {
    liberar(chave, estado);
  }
}
