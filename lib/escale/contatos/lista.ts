import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { phoneLookupVariants } from "@/lib/channels/phone-variants";
import { padraoRegexDeBusca } from "@/lib/contacts/busca-regex";
import { hashCpf } from "@/lib/contacts/cpf";
import { buscaValeConsulta } from "@/lib/inbox/termo-de-busca";
import { lerLinks } from "@/lib/leads/links-de-contato";
import { fusoUtilizavel } from "@/lib/tempo/fusos";

import type { FiltroCompilado } from "./compilar-filtros";
import { filtrosDeContatosSchema, type FiltrosDeContatos } from "./filtros";
import { POR_PAGINA, POR_PAGINA_PADRAO, VISOES_DE_CONTATOS, instagramDoLink } from "./regras";
import { nomeDaEmpresa } from "@/lib/escale/empresas/nome";

/**
 * A PÁGINA DA LISTA DE CONTATOS (fork Escale, Fase 2A) — servidor.
 *
 * A função `fn_escale_lista_de_contatos` (9101, invoker) devolve os ids da
 * página, o total e os negócios que quem olha enxerga; aqui se lê o resto das
 * colunas e a conversa mais recente, só para esses ids. A busca é a MESMA da
 * lista do original (`app/api/v1/contacts/_handler.ts`, ~L124–241): parênteses
 * fora, piso de `buscaValeConsulta`, padrão regex sem acento, variantes do
 * telefone com o 55 implícito e o hash do CPF com 11 dígitos.
 */
export const consultaDaListaSchema = z.object({
  q: z.string().max(200).optional(),
  v: z.enum(VISOES_DE_CONTATOS).default("todos"),
  p: z.coerce.number().int().min(1).max(1_000_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO),
  // FORK ESCALE · Fase 2B: o filtro da tela (JSON de `FiltrosDeContatos`).
  f: z.string().max(16384).optional(),
});
export type ConsultaDaLista = z.output<typeof consultaDaListaSchema>;

/** O `f` da consulta → filtro; `null` quando veio e não vale (a rota responde 422). */
export function filtrosDaConsulta(consulta: { f?: string }): FiltrosDeContatos | null {
  if (!consulta.f) return {};
  try {
    const lido = filtrosDeContatosSchema.safeParse(JSON.parse(consulta.f));
    return lido.success ? lido.data : null;
  } catch {
    return null;
  }
}

/** O fuso da organização (Configurações › Empresa), sempre utilizável. */
export async function fusoDaOrganizacao(supabase: SupabaseClient, orgId: string): Promise<string> {
  const { data } = await supabase
    .from("organizations")
    .select("timezone")
    .eq("id", orgId)
    .maybeSingle();
  return fusoUtilizavel((data as { timezone?: string | null } | null)?.timezone);
}

export function parametrosDaBusca(busca: string | undefined) {
  if (!busca?.trim()) return { padrao: null, digitos: [] as string[], cpfHash: null, vazia: false };
  const termo = busca.replace(/[()]/g, " ");
  if (!buscaValeConsulta(termo))
    return { padrao: null, digitos: [] as string[], cpfHash: null, vazia: true };
  const digits = busca.replace(/\D/g, "");
  const digitos: string[] = [];
  if (digits.length >= 8) {
    const base =
      !digits.startsWith("55") && (digits.length === 10 || digits.length === 11)
        ? `55${digits}`
        : digits;
    for (const v of phoneLookupVariants(base)) {
      const d = v.replace(/\D/g, "");
      if (d && d !== digits && !digitos.includes(d)) digitos.push(d);
    }
  }
  return {
    padrao: padraoRegexDeBusca(termo),
    digitos,
    cpfHash: digits.length === 11 ? hashCpf(digits) : null,
    vazia: false,
  };
}

export type StatusDaLinha = "anonimizado" | "bloqueado" | "pessoal" | "ativo";

export type LinhaDeContato = {
  id: string;
  nome: string | null;
  display_name: string | null;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  tags: string[];
  tem_foto: boolean;
  conversa_id: string | null;
  negocios: number;
  negocio_unico: string | null;
  status: StatusDaLinha;
  ultima_atividade: string | null;
  criado_em: string;
  origem: string;
  nascimento: string | null;
  links: Record<string, string>;
  /** Fase 2D: a empresa do contato (o vínculo principal, senão o mais antigo). */
  empresa: { id: string; nome: string } | null;
  /** Fase 2C: os campos personalizados (sem os links). */
  campos: Record<string, unknown>;
};

export type PaginaDeContatos = {
  linhas: LinhaDeContato[];
  total: number;
  pagina: number;
  porPagina: number;
};

type LinhaDaFuncao = {
  contact_id: string;
  total: number | string;
  negocios: number;
  negocio_unico: string | null;
};
type ContatoLido = {
  id: string;
  name: string | null;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown> | null;
  avatar_storage_path: string | null;
  is_blocked: boolean;
  is_anonymized: boolean;
  is_personal: boolean;
  last_activity_at: string | null;
  created_at: string;
  source: string;
  birthdate: string | null;
  person_id: string | null;
};

const COLUNAS =
  "id, name, display_name, email, phone_number, tags, custom_fields, avatar_storage_path, is_blocked, is_anonymized, is_personal, last_activity_at, created_at, source, birthdate, person_id";

function statusDe(c: ContatoLido): StatusDaLinha {
  if (c.is_anonymized) return "anonimizado";
  if (c.is_blocked) return "bloqueado";
  if (c.is_personal) return "pessoal";
  return "ativo";
}

/** Lança o erro do banco (`{ code, message }`) para a rota tratar. */
export async function listarContatos(
  supabase: SupabaseClient,
  orgId: string,
  consulta: ConsultaDaLista,
  filtro?: FiltroCompilado,
): Promise<PaginaDeContatos> {
  const vazio: PaginaDeContatos = {
    linhas: [],
    total: 0,
    pagina: consulta.p,
    porPagina: consulta.n,
  };
  const busca = parametrosDaBusca(consulta.q);
  if (busca.vazia) return vazio;

  const { data: pagina, error } = await supabase.rpc("fn_escale_lista_de_contatos", {
    p_org: orgId,
    p_visao: consulta.v,
    p_padrao: busca.padrao,
    p_digitos: busca.digitos,
    p_cpf_hash: busca.cpfHash,
    p_limite: consulta.n,
    p_deslocamento: (consulta.p - 1) * consulta.n,
    p_filtros: filtro ?? {},
  });
  if (error) throw error;
  const ordem = (pagina ?? []) as LinhaDaFuncao[];
  const primeira = ordem[0];
  if (!primeira) return vazio;
  const ids = ordem.map((l) => l.contact_id);

  const [contatos, conversas] = await Promise.all([
    supabase.from("contacts").select(COLUNAS).eq("organization_id", orgId).in("id", ids),
    supabase
      .from("conversations")
      .select("id, contact_id")
      .eq("organization_id", orgId)
      .in("contact_id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
  ]);
  if (contatos.error) throw contatos.error;
  if (conversas.error) throw conversas.error;

  const porId = new Map(((contatos.data ?? []) as ContatoLido[]).map((c) => [c.id, c]));
  const conversaDe = new Map<string, string>();
  for (const cv of (conversas.data ?? []) as Array<{ id: string; contact_id: string }>) {
    if (!conversaDe.has(cv.contact_id)) conversaDe.set(cv.contact_id, cv.id);
  }

  // FORK ESCALE · Fase 2D: a empresa do contato (o vínculo principal, senão o mais antigo).
  const pessoas = [
    ...new Set(
      ((contatos.data ?? []) as ContatoLido[]).map((c) => c.person_id).filter((x): x is string => Boolean(x)),
    ),
  ];
  const empresaPorPessoa = new Map<string, { id: string; nome: string }>();
  if (pessoas.length) {
    const vinculos = await supabase
      .from("company_people")
      .select("person_id, company_id, is_primary, created_at")
      .eq("organization_id", orgId)
      .in("person_id", pessoas)
      .order("is_primary", { ascending: false })
      .order("created_at");
    const escolhido = new Map<string, string>();
    for (const v of (vinculos.data ?? []) as Array<{ person_id: string; company_id: string }>) {
      if (!escolhido.has(v.person_id)) escolhido.set(v.person_id, v.company_id);
    }
    if (escolhido.size) {
      const empresas = await supabase
        .from("companies")
        .select("id, trade_name, legal_name")
        .eq("organization_id", orgId)
        .in("id", [...new Set(escolhido.values())]);
      const nomePorEmpresa = new Map(
        ((empresas.data ?? []) as Array<{ id: string; trade_name: string | null; legal_name: string | null }>).map(
          (e) => [e.id, nomeDaEmpresa(e)],
        ),
      );
      for (const [pessoa, empresa] of escolhido) {
        const nome = nomePorEmpresa.get(empresa);
        if (nome) empresaPorPessoa.set(pessoa, { id: empresa, nome });
      }
    }
  }

  const linhas: LinhaDeContato[] = [];
  for (const l of ordem) {
    const c = porId.get(l.contact_id);
    if (!c) continue;
    const links = lerLinks(c.custom_fields ?? {}) as Record<string, string>;
    linhas.push({
      id: c.id,
      nome: c.name,
      display_name: c.display_name,
      telefone: c.phone_number,
      email: c.email,
      instagram: instagramDoLink(links.instagram ?? null),
      tags: c.tags ?? [],
      tem_foto: Boolean(c.avatar_storage_path) && !c.is_anonymized,
      conversa_id: conversaDe.get(c.id) ?? null,
      negocios: l.negocios,
      negocio_unico: l.negocio_unico,
      status: statusDe(c),
      ultima_atividade: c.last_activity_at,
      criado_em: c.created_at,
      origem: c.source,
      nascimento: c.birthdate,
      links,
      empresa: c.person_id ? (empresaPorPessoa.get(c.person_id) ?? null) : null,
      campos: Object.fromEntries(Object.entries(c.custom_fields ?? {}).filter(([k]) => !k.startsWith("link_"))),
    });
  }
  return { linhas, total: Number(primeira.total), pagina: consulta.p, porPagina: consulta.n };
}
