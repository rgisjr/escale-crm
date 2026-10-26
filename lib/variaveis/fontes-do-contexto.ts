import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";

import type { FontesDasVariaveis } from "./resolver";

type Linha = Record<string, unknown>;

const texto = (v: unknown): string | null => (typeof v === "string" ? v : null);
const mapa = (v: unknown): Readonly<Record<string, unknown>> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/**
 * As fontes a partir das linhas cruas de `contacts` e `crm_leads` que o
 * motor já leu (`contextoDoContato` do follow-up; fork Escale, Frente V). Sem
 * consulta nova: o que não está nessas linhas (etapa, empresa, usuário) sai
 * vazio, e o valor alternativo do mapeamento cobre.
 */
export function fontesDoContexto(contexto: { contact?: unknown; lead?: unknown }, fuso?: string | null): FontesDasVariaveis {
  const c = mapa(contexto.contact) as Linha | null;
  const l = mapa(contexto.lead) as Linha | null;
  return {
    contato: c
      ? {
          id: texto(c.id),
          nome: nomeDoContato({ name: texto(c.name), display_name: texto(c.display_name) }),
          email: texto(c.email),
          telefone: texto(c.phone_number),
          campos: mapa(c.custom_fields),
        }
      : null,
    negocio: l
      ? {
          id: texto(l.id),
          criadoEm: l.created_at instanceof Date ? l.created_at.toISOString() : texto(l.created_at),
          status: texto(l.status),
          etapa: null,
          valorCentavos: typeof l.value_cents === "number" ? l.value_cents : l.value_cents == null ? null : Number(l.value_cents),
          moeda: texto(l.currency),
          campos: mapa(l.custom_fields),
        }
      : null,
    fuso: fuso ?? null,
  };
}
