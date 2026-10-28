/** Os campos personalizados que a organização tem, como variáveis dinâmicas do motor (Fase 7A). */
import type { SupabaseClient } from "@supabase/supabase-js";

import { lerCatalogo } from "@/lib/escale/campos/banco";

import { camposDinamicos, type CampoDinamico } from "./catalogo/campos-personalizados";
import type { ObjetoDeCampoDoCatalogo } from "./catalogo/tipos";

export const OBJETOS_COM_CAMPOS: readonly ObjetoDeCampoDoCatalogo[] = ["negocio", "contato", "empresa"];

/** Quais objetos a pergunta (ou o filtro do painel) cita, olhando só os ids `campo:<objeto>:<chave>`. */
export function objetosCitados(...partes: unknown[]): ObjetoDeCampoDoCatalogo[] {
  const texto = JSON.stringify(partes);
  return OBJETOS_COM_CAMPOS.filter((objeto) => texto.includes(`campo:${objeto}:`));
}

export async function camposDaOrganizacao(
  sb: SupabaseClient,
  orgId: string,
  objetos: readonly ObjetoDeCampoDoCatalogo[],
): Promise<Map<string, CampoDinamico>> {
  const catalogos = await Promise.all(objetos.map((objeto) => lerCatalogo(sb, orgId, objeto)));
  const mapa = new Map<string, CampoDinamico>();
  objetos.forEach((objeto, i) => {
    const catalogo = catalogos[i];
    if (!catalogo) return;
    for (const campo of camposDinamicos(objeto, catalogo)) mapa.set(campo.id, campo);
  });
  return mapa;
}
