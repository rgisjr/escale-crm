import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";

/**
 * Toast de erro de CONSULTA só quando ainda não há nada para mostrar.
 *
 * O toast "Erro inesperado" saía de dentro do `queryFn`, e o `queryFn` roda
 * também nas atualizações automáticas (foco da janela, tempo real, intervalo).
 * Em 26/10/2026, com o banco travando por falta de memória, a pessoa via o
 * aviso vermelho sem ter feito nada, sobre uma tela que continuava com os dados
 * certos: o TanStack mantém o dado anterior quando o refetch falha.
 *
 * Regra: sem dado em cache (primeira carga) → avisa, porque a tela está vazia
 * por causa do erro; com dado em cache → silêncio, a atualização é descartada e
 * a próxima tenta de novo. Mutações (enviar, atribuir, salvar) NÃO usam isto:
 * foram uma ação da pessoa e o erro tem que aparecer.
 */
export function avisarSoNaPrimeiraCarga(qc: QueryClient, queryKey: QueryKey, err: unknown): void {
  if (qc.getQueryState(queryKey)?.data === undefined) showApiError(err);
}
