/** Cache em memória de 60 s por pessoa e pergunta (Fase 7A). Não atravessa processos: é um alívio, não uma garantia. */
import { createHash } from "node:crypto";

export const TEMPO_DO_CACHE_MS = 60_000;
export const ENTRADAS_MAX = 500;

interface Entrada {
  expiraEm: number;
  valor: Promise<unknown>;
}

const ENTRADAS = new Map<string, Entrada>();

function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  if (valor && typeof valor === "object") {
    const chaves = Object.keys(valor).sort();
    return `{${chaves.map((k) => `${JSON.stringify(k)}:${canonico((valor as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(valor) ?? "null";
}

/** `hash(org, usuário, pergunta, painel)`: outra pessoa ou outra pergunta nunca reaproveita a resposta. */
export function chaveDoCache(orgId: string, userId: string, pergunta: unknown, painel: unknown): string {
  return createHash("sha256").update(canonico([orgId, userId, pergunta, painel ?? null])).digest("hex");
}

export async function comCache<T>(
  chave: string,
  ttlMs: number,
  fn: () => Promise<T>,
  agora: () => number = Date.now,
): Promise<T> {
  const existente = ENTRADAS.get(chave);
  if (existente && existente.expiraEm > agora()) return existente.valor as Promise<T>;
  const valor = fn();
  ENTRADAS.delete(chave);
  ENTRADAS.set(chave, { expiraEm: agora() + ttlMs, valor });
  if (ENTRADAS.size > ENTRADAS_MAX) ENTRADAS.delete(ENTRADAS.keys().next().value as string);
  // Falha não fica guardada: a próxima tentativa refaz.
  valor.catch(() => {
    if (ENTRADAS.get(chave)?.valor === valor) ENTRADAS.delete(chave);
  });
  return valor;
}

export function limparCache(): void {
  ENTRADAS.clear();
}
