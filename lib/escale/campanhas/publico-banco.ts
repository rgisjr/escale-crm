import type { SupabaseClient } from "@supabase/supabase-js";

import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import { temFiltros } from "@/lib/escale/contatos/filtros";
import { filtrosDaConsulta, parametrosDaBusca } from "@/lib/escale/contatos/lista";

import type { PublicoDaCampanha } from "./assistente";

/**
 * O PÚBLICO NO BANCO (fork Escale, Fase 8B; N7). A seleção por filtro vira o
 * compilado da 2B (o mesmo de `app/api/v1/acoes-em-massa`), e o banco resolve
 * (`fn_escale_contatos_do_publico`, 9302). Ninguém expande o filtro no
 * cliente: o público é o que o filtro achar na hora de preparar.
 */
export type PublicoCompilado = {
  selecao:
    | null
    | { tipo: "ids"; ids: string[] }
    | {
        tipo: "filtro";
        visao: string;
        padrao: string | null;
        digitos: string[];
        cpf_hash: string | null;
        filtros: unknown;
        quantidade: number | null;
        excluidos: string[];
      };
  avulsos: string[];
  removidos: string[];
};

export class PublicoInvalido extends Error {}

export function compilarPublico(p: PublicoDaCampanha, fuso: string): PublicoCompilado {
  const s = p.selecao;
  const base = { avulsos: [...p.avulsos], removidos: [...p.removidos] };
  if (!s) return { selecao: null, ...base };
  if (s.tipo === "ids") return { selecao: { tipo: "ids", ids: [...s.ids] }, ...base };
  const filtros = filtrosDaConsulta({ f: s.f });
  if (filtros === null) throw new PublicoInvalido("Filtro inválido.");
  const busca = parametrosDaBusca(s.q);
  return {
    selecao: {
      tipo: "filtro",
      visao: s.v,
      padrao: busca.padrao,
      digitos: busca.digitos,
      cpf_hash: busca.cpfHash,
      filtros: temFiltros(filtros) ? compilarFiltros(filtros, fuso) : {},
      quantidade: s.quantidade,
      excluidos: [...s.excluidos],
    },
    ...base,
  };
}

type LinhaDaPagina = { contact_id: string; total: number | string };

/**
 * Todos os ids, em ordem, sem teto (resposta 8), numa chamada só (G7-2, 9401):
 * `fn_escale_ids_do_publico` devolve um `uuid[]` numa linha, que o `max_rows`
 * do PostgREST não corta. Ler em páginas com OFFSET recalculava o filtro
 * inteiro a cada página (custo quadrático).
 */
export async function idsDoPublico(
  db: SupabaseClient,
  org: string,
  compilado: PublicoCompilado,
): Promise<string[]> {
  const { data, error } = await db.rpc("fn_escale_ids_do_publico", {
    p_org: org,
    p_publico: compilado,
  });
  if (error) throw new Error(`público: ${error.message}`);
  return [...((data ?? []) as string[])];
}

export interface LinhaDoDestinatario {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  tags: string[];
}

type LinhaDoContato = {
  id: string;
  name: string | null;
  display_name: string | null;
  phone_number: string | null;
  email: string | null;
  tags: string[] | null;
};

/** A página do passo 2 (e do "Ver contatos"): os ids do banco, hidratados, na ordem do banco. */
export async function paginaDoPublico(
  db: SupabaseClient,
  org: string,
  compilado: PublicoCompilado,
  pagina: number,
  porPagina: number,
): Promise<{ linhas: LinhaDoDestinatario[]; total: number }> {
  const { data, error } = await db.rpc("fn_escale_pagina_do_publico", {
    p_org: org,
    p_publico: compilado,
    p_limite: porPagina,
    p_deslocamento: (pagina - 1) * porPagina,
  });
  if (error) throw new Error(`público: ${error.message}`);
  const ordem = (data ?? []) as LinhaDaPagina[];
  if (ordem.length === 0)
    return { linhas: [], total: pagina > 1 ? await totalDoPublico(db, org, compilado) : 0 };
  const ids = ordem.map((l) => l.contact_id);
  const { data: contatos, error: erroContatos } = await db
    .from("contacts")
    .select("id, name, display_name, phone_number, email, tags")
    .eq("organization_id", org)
    .in("id", ids);
  if (erroContatos) throw new Error(`público: contatos — ${erroContatos.message}`);
  const porId = new Map(((contatos ?? []) as LinhaDoContato[]).map((c) => [c.id, c]));
  const linhas: LinhaDoDestinatario[] = [];
  for (const id of ids) {
    const c = porId.get(id);
    if (!c) continue;
    linhas.push({
      id,
      nome: nomeDoContato({ name: c.name, display_name: c.display_name, phone_number: null }),
      telefone: c.phone_number,
      email: c.email,
      tags: c.tags ?? [],
    });
  }
  return { linhas, total: Number(ordem[0]!.total) };
}

async function totalDoPublico(
  db: SupabaseClient,
  org: string,
  compilado: PublicoCompilado,
): Promise<number> {
  const { data, error } = await db.rpc("fn_escale_pagina_do_publico", {
    p_org: org,
    p_publico: compilado,
    p_limite: 1,
    p_deslocamento: 0,
  });
  if (error) throw new Error(`público: ${error.message}`);
  const l = (data ?? []) as LinhaDaPagina[];
  return l.length === 0 ? 0 : Number(l[0]!.total);
}
