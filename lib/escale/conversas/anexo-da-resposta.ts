import type { TipoDeMidia } from "@/lib/midia/ativos";

const CHAVE_DO_NUMERO = /^[a-z][a-z0-9_]{0,39}$/;

export interface RotuloDoAnexo {
  /** `numero`: o arquivo muda conforme o número (canal) da conversa. `biblioteca`: um arquivo fixo. */
  origem: "biblioteca" | "numero" | "removido";
  nome: string;
  tipo: TipoDeMidia | null;
}

/** Normaliza o que a pessoa digita como chave do número (`Boas Vindas 1` → `boas_vindas_1`); `null` se não der. */
export function chaveDoNumero(entrada: string): string | null {
  const limpa = entrada
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return CHAVE_DO_NUMERO.test(limpa) ? limpa : null;
}

/** Como o anexo gravado (`id` da biblioteca ou `var:<chave>`) aparece para a pessoa. */
export function rotuloDoAnexo(
  asset: string,
  ativos: ReadonlyArray<{ id: string; nome: string; tipo: TipoDeMidia }>,
): RotuloDoAnexo {
  if (asset.startsWith("var:")) return { origem: "numero", nome: asset.slice(4), tipo: null };
  const achado = ativos.find((a) => a.id === asset);
  return achado
    ? { origem: "biblioteca", nome: achado.nome, tipo: achado.tipo }
    : { origem: "removido", nome: asset.slice(0, 8), tipo: null };
}
