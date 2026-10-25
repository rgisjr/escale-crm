import { normalizarTag } from "@/lib/contacts/tag-normalizada";

/**
 * A tag que a linha "Criar" oferece (a Clint mostra "Criar «texto»" quando o que se
 * digitou não existe). Devolve a tag como o banco a guarda, ou null quando não há o
 * que criar: texto vazio, tag que já está no vocabulário ou que já foi escolhida.
 * A tag de contato é só um texto em `contacts.tags` — "criar" é usar o nome novo.
 */
export function tagNovaDoTexto(
  texto: string,
  vocabulario: readonly string[],
  escolhidas: readonly string[] = [],
): string | null {
  const tag = normalizarTag(texto);
  if (tag === "") return null;
  if (vocabulario.some((v) => normalizarTag(v) === tag)) return null;
  if (escolhidas.some((e) => normalizarTag(e) === tag)) return null;
  return tag;
}
