/** No máximo 3 consultas de gráfico ao mesmo tempo na aba (Fase 7C, R9): o servidor aceita 3 + 10 esperando por pessoa. */
const VAGAS = 3;
let emExecucao = 0;
const espera: Array<() => void> = [];

function soltar(): void {
  const proximo = espera.shift();
  if (proximo) proximo();
  else emExecucao -= 1;
}

export async function comVagaNoNavegador<T>(fn: () => Promise<T>): Promise<T> {
  if (emExecucao >= VAGAS) await new Promise<void>((liberar) => espera.push(liberar));
  else emExecucao += 1;
  try {
    return await fn();
  } finally {
    soltar();
  }
}

/** Só para testes. */
export function _zerarFila(): void {
  emExecucao = 0;
  espera.length = 0;
}
