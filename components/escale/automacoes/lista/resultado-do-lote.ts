import { toast } from "sonner";

type Texto = (chave: string) => string;

/**
 * Os avisos de um lote com o plural da Clint: "2 automações movidas" e, se algumas
 * falharam, "1 automação não pôde ser movida". `feitas` e `falhas` são as contagens.
 * Cada texto é escrito por inteiro dentro do `t()` (a cerca do espanhol lê o código).
 */
export function avisarResultadoDoLote(
  t: Texto,
  verbo: "movida" | "excluida",
  feitas: number,
  falhas: number,
): void {
  const n = (v: number) => v.toLocaleString("pt-BR");
  if (feitas > 0) {
    const um = verbo === "movida" ? t("{n} automação movida") : t("{n} automação excluída");
    const varias = verbo === "movida" ? t("{n} automações movidas") : t("{n} automações excluídas");
    toast.success((feitas === 1 ? um : varias).replace("{n}", n(feitas)));
  }
  if (falhas > 0) {
    const um = verbo === "movida" ? t("{n} automação não pôde ser movida") : t("{n} automação não pôde ser excluída");
    const varias =
      verbo === "movida" ? t("{n} automações não puderam ser movidas") : t("{n} automações não puderam ser excluídas");
    toast.error((falhas === 1 ? um : varias).replace("{n}", n(falhas)));
  }
}
