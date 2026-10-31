function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Sem diferenciar caixa nem acento, e com espaços e quebras de linha tratados como um espaço só. */
export function casaComPalavraChave(texto: string, palavra: string, modo: "contem" | "igual"): boolean {
  const t = normalizar(texto);
  const p = normalizar(palavra);
  if (p === "") return false;
  return modo === "igual" ? t === p : t.includes(p);
}

/** Quem enviou conta como "o atendente": pessoa no sistema ou no aparelho. Automação, IA e sistema NÃO (anti-laço). */
export const ORIGENS_HUMANAS = ["user", "external_device"] as const;

export function foiEnviadaPorPessoa(sentVia: string | null | undefined): boolean {
  return (ORIGENS_HUMANAS as readonly string[]).includes(sentVia ?? "");
}
