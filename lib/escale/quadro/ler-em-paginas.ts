/**
 * Lê uma consulta do PostgREST página por página até esgotar. Cada resposta do
 * PostgREST é cortada em `max_rows` (1.000 no Supabase) sem erro nenhum: quem lê
 * uma vez só perde o resto em silêncio (o quadro de negócios com mais de 1.000
 * cards, B2-2 da revisão de 24/10/2026).
 *
 * `lerPagina(de, ate)` deve ordenar de forma ESTÁVEL (com `id` de desempate) e
 * aplicar `.range(de, ate)`.
 */
export const TAMANHO_DA_PAGINA = 1000;
/** Teto de segurança: 200 páginas = 200 mil linhas. Passou disso, lança em vez de seguir sem fim. */
const LIMITE_DE_PAGINAS = 200;

interface RespostaDaPagina<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function lerEmPaginas<T>(
  lerPagina: (de: number, ate: number) => PromiseLike<RespostaDaPagina<T>>,
  tamanho: number = TAMANHO_DA_PAGINA,
): Promise<RespostaDaPagina<T>> {
  const todas: T[] = [];
  for (let pagina = 0; pagina < LIMITE_DE_PAGINAS; pagina += 1) {
    const de = pagina * tamanho;
    const { data, error } = await lerPagina(de, de + tamanho - 1);
    if (error) return { data: null, error };
    const linhas = data ?? [];
    todas.push(...linhas);
    if (linhas.length < tamanho) return { data: todas, error: null };
  }
  return { data: null, error: { message: "Leitura em páginas passou do limite de segurança." } };
}
