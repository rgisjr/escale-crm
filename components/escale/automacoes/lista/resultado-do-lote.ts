import { toast } from "sonner";

type Texto = (chave: string) => string;

/**
 * Os avisos de um lote com o plural da Clint: "2 automações movidas" e, se algumas
 * falharam, "1 automação não pôde ser movida". `feitas` e `falhas` são as contagens.
 */
export function avisarResultadoDoLote(
  t: Texto,
  verbo: "movida" | "excluida",
  feitas: number,
  falhas: number,
): void {
  const n = (v: number) => v.toLocaleString("pt-BR");
  if (feitas > 0) {
    const chave =
      verbo === "movida"
        ? feitas === 1 ? "{n} automação movida" : "{n} automações movidas"
        : feitas === 1 ? "{n} automação excluída" : "{n} automações excluídas";
    toast.success(t(chave).replace("{n}", n(feitas)));
  }
  if (falhas > 0) {
    const chave =
      verbo === "movida"
        ? falhas === 1 ? "{n} automação não pôde ser movida" : "{n} automações não puderam ser movidas"
        : falhas === 1 ? "{n} automação não pôde ser excluída" : "{n} automações não puderam ser excluídas";
    toast.error(t(chave).replace("{n}", n(falhas)));
  }
}
