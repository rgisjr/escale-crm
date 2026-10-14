import { ApiError } from "@/lib/api/types";

/** A mensagem que a rota escreveu para gente (já traduzida, ou chave do dicionário). */
export function textoDoErro(e: unknown, t: (texto: string) => string): string {
  if (e instanceof ApiError) return t(e.message);
  if (e instanceof Error && e.message) return e.message;
  return t("Não consegui completar essa ação. Tente de novo.");
}
