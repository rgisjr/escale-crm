/**
 * `fetch` com tempo máximo, para os lugares da casca que não passam pelo
 * `apiClient` (Frente F, 29/10/2026).
 *
 * Em 29/10 "Adicionar campo" ficou preso sem fim porque o POST era um `fetch`
 * cru e o banco (plano Free, 426 MB, swap em uso) demorou mais que a paciência
 * da pessoa. O mesmo `fetch` cru existia em Empresas (ficha, lista, empresa do
 * contato, Nova empresa), Modelos da conta e no CSV do detalhamento. Este helper
 * é o único jeito de pedir à rede fora do `apiClient`: 20 s para escrita, 10 s
 * para leitura, erro tipado para a tela mostrar a mensagem certa.
 *
 * ⚠️ O servidor NÃO cancela nada quando o cliente desiste (lição do
 * `lib/api/client.ts`): uma escrita pode completar depois do corte. A mensagem
 * manda conferir a lista, e as janelas de criação não fecham sozinhas ao
 * estourar.
 */
export const TEMPO_MAXIMO_DA_ESCRITA_MS = 20_000;
export const TEMPO_MAXIMO_DA_LEITURA_MS = 10_000;
export const MENSAGEM_DE_TEMPO_ESGOTADO = "Demorou demais. Confira a lista e tente de novo.";

export class ErroDeTempoEsgotado extends Error {
  readonly tempoEsgotado = true;
  constructor() {
    super(MENSAGEM_DE_TEMPO_ESGOTADO);
    this.name = "ErroDeTempoEsgotado";
  }
}

const METODOS_DE_ESCRITA = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function fetchComTempoMaximo(url: string, init?: RequestInit, ms?: number): Promise<Response> {
  const escrita = METODOS_DE_ESCRITA.has((init?.method ?? "GET").toUpperCase());
  const limite = ms ?? (escrita ? TEMPO_MAXIMO_DA_ESCRITA_MS : TEMPO_MAXIMO_DA_LEITURA_MS);
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), limite);
  // O `fetch` real rejeita com AbortError ao abortar; a corrida garante o mesmo
  // mesmo quando quem responde ignora o sinal (stubs, polyfills).
  const estourou = new Promise<never>((_, rejeitar) => {
    controle.signal.addEventListener("abort", () => rejeitar(new ErroDeTempoEsgotado()), { once: true });
  });
  try {
    return await Promise.race([fetch(url, { ...init, signal: controle.signal }), estourou]);
  } catch (e) {
    if (e instanceof ErroDeTempoEsgotado) throw e;
    // Compara pelo nome: DOMException nem sempre é `instanceof Error` (jsdom, Safari antigo).
    if ((e as { name?: string } | null)?.name === "AbortError") throw new ErroDeTempoEsgotado();
    throw e;
  } finally {
    clearTimeout(relogio);
  }
}
