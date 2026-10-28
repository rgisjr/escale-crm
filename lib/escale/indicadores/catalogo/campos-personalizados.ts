/** Campos personalizados como variável, filtro e coluna dinâmicos (Fase 7A). */
import type { Catalogo } from "@/lib/escale/campos/regras";
import type { CustomFieldDef } from "@/lib/schemas/settings";

import type { ObjetoDeCampoDoCatalogo, TipoDeDimensao } from "./tipos";

export interface CampoDinamico {
  id: `campo:${ObjetoDeCampoDoCatalogo}:${string}`;
  nome: string;
  objeto: ObjetoDeCampoDoCatalogo;
  chave: string;
  tipo: TipoDeDimensao;
  opcoes?: readonly { value: string; label: string }[];
}

const TIPO_DO_CAMPO: Record<CustomFieldDef["type"], TipoDeDimensao> = {
  text: "texto",
  textarea: "texto",
  email: "texto",
  phone: "texto",
  url: "texto",
  select: "texto",
  multiselect: "texto",
  boolean: "booleano",
  number: "numero",
  currency: "numero",
  date: "data",
  datetime: "data",
};

export function camposDinamicos(objeto: ObjetoDeCampoDoCatalogo, catalogo: Catalogo): CampoDinamico[] {
  return catalogo.campos.map((campo) => ({
    id: `campo:${objeto}:${campo.chave}` as CampoDinamico["id"],
    nome: campo.definicao.label,
    objeto,
    chave: campo.chave,
    tipo: TIPO_DO_CAMPO[campo.definicao.type] ?? "texto",
    ...(campo.definicao.options?.length ? { opcoes: campo.definicao.options } : {}),
  }));
}

const FORMA_DO_CAMPO = /^campo:(negocio|contato|empresa):([a-z][a-z0-9_]{0,39})$/;

export function lerCampoDinamico(id: string): { objeto: ObjetoDeCampoDoCatalogo; chave: string } | null {
  const achou = FORMA_DO_CAMPO.exec(id);
  return achou ? { objeto: achou[1] as ObjetoDeCampoDoCatalogo, chave: achou[2] } : null;
}
