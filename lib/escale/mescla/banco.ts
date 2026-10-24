import type { SupabaseClient } from "@supabase/supabase-js";

import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { instagramDoLink } from "@/lib/escale/contatos/regras";
import { trocarEmpresaDoContato } from "@/lib/escale/empresas/banco";
import {
  filtrarSugestoes,
  montarSugestoes,
  ordenarSugestoes,
  type CampoDaMescla,
  type ChaveDeMescla,
  type ConsultaDeSugestoes,
  type ContatoDaMescla,
  type Escolhas,
  type Sugestao,
} from "./regras";

/**
 * A MESCLA DA CASCA NO SERVIDOR (fork Escale, Fase 2E; C2). As leituras usam a
 * sessão (RLS); a mescla chama `fn_escale_mesclar_contatos` com a sessão (o
 * `fn_mesclar_contatos` confere o papel pelo `auth.uid()`), e a empresa escolhida
 * vai pela função da 2D com o service role, logo depois (N11).
 */
type SB = SupabaseClient;

const ATENDIMENTO_ATIVO = ["open", "pending", "claimed", "ai_handling"] as const;
const LOTE = 500;

export type CodigoDoErroDaMescla =
  | "insufficient_role"
  | "contato_principal_indisponivel"
  | "contato_secundario_indisponivel"
  | "identidade_em_uso"
  | "atendimento_ativo"
  | "grupo_mudou"
  | "falhou";

export class ErroDaMescla extends Error {
  constructor(readonly codigo: CodigoDoErroDaMescla) {
    super(codigo);
  }
}

export const TEXTO_DO_ERRO_DA_MESCLA: Readonly<Record<CodigoDoErroDaMescla, string>> = {
  insufficient_role: "Disponível para gerente ou acima.",
  contato_principal_indisponivel: "Estes contatos mudaram durante a mescla",
  contato_secundario_indisponivel: "Estes contatos mudaram durante a mescla",
  identidade_em_uso: "Outro contato já usa este telefone",
  atendimento_ativo: "Atendimento ativo impede a mescla deste grupo.",
  grupo_mudou: "Estes contatos mudaram durante a mescla",
  falhou: "Não foi possível mesclar os contatos",
};

const STATUS_DO_ERRO: Readonly<Record<CodigoDoErroDaMescla, number>> = {
  insufficient_role: 403,
  contato_principal_indisponivel: 409,
  contato_secundario_indisponivel: 409,
  identidade_em_uso: 409,
  atendimento_ativo: 409,
  grupo_mudou: 409,
  falhou: 500,
};

export function statusDoErroDaMescla(codigo: CodigoDoErroDaMescla): number {
  return STATUS_DO_ERRO[codigo];
}

function erroDoBanco(mensagem: string | undefined): ErroDaMescla {
  const bruto = mensagem ?? "";
  const previsto = (Object.keys(TEXTO_DO_ERRO_DA_MESCLA) as CodigoDoErroDaMescla[]).find((c) => bruto.includes(c));
  return new ErroDaMescla(previsto ?? "falhou");
}

async function emLotes<T>(ids: readonly string[], ler: (lote: string[]) => Promise<T[]>): Promise<T[]> {
  const saida: T[] = [];
  for (let i = 0; i < ids.length; i += LOTE) saida.push(...(await ler(ids.slice(i, i + LOTE))));
  return saida;
}

type LinhaDoContato = {
  id: string;
  name: string | null;
  display_name: string | null;
  phone_number: string | null;
  email: string | null;
  wa_lid: string | null;
  custom_fields: Record<string, unknown> | null;
  tags: string[] | null;
  person_id: string | null;
  created_at: string;
  updated_at: string;
};

/** As empresas dos contatos de uma vez: o vínculo principal da pessoa, senão o mais antigo (2D N4). */
async function empresasDasPessoas(sb: SB, orgId: string, pessoas: string[]) {
  const porPessoa = new Map<string, { id: string; nome: string }>();
  if (pessoas.length === 0) return porPessoa;
  const vinculos = await emLotes(pessoas, async (lote) => {
    const { data, error } = await sb
      .from("company_people")
      .select("person_id, company_id, is_primary, created_at, companies(trade_name, legal_name)")
      .eq("organization_id", orgId)
      .in("person_id", lote)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Array<{
      person_id: string;
      company_id: string;
      companies: { trade_name: string | null; legal_name: string | null } | null;
    }>;
  });
  for (const v of vinculos) {
    if (porPessoa.has(v.person_id)) continue;
    const nome = v.companies?.trade_name?.trim() || v.companies?.legal_name?.trim() || "";
    porPessoa.set(v.person_id, { id: v.company_id, nome });
  }
  return porPessoa;
}

export async function contatosDaMescla(sb: SB, orgId: string, ids: readonly string[]): Promise<Map<string, ContatoDaMescla>> {
  const unicos = [...new Set(ids)];
  const linhas = await emLotes(unicos, async (lote) => {
    const { data, error } = await sb
      .from("contacts")
      .select("id, name, display_name, phone_number, email, wa_lid, custom_fields, tags, person_id, created_at, updated_at")
      .eq("organization_id", orgId)
      .is("is_merged_into", null)
      .in("id", lote);
    if (error) throw error;
    return (data ?? []) as LinhaDoContato[];
  });
  const ativos = new Set(
    (
      await emLotes(unicos, async (lote) => {
        const { data, error } = await sb
          .from("conversations")
          .select("contact_id")
          .eq("organization_id", orgId)
          .in("status", [...ATENDIMENTO_ATIVO])
          .in("contact_id", lote);
        if (error) throw error;
        return (data ?? []) as Array<{ contact_id: string }>;
      })
    ).map((c) => c.contact_id),
  );
  const empresas = await empresasDasPessoas(
    sb,
    orgId,
    linhas.map((l) => l.person_id).filter((p): p is string => !!p),
  );
  return new Map(
    linhas.map((l) => {
      const link = typeof l.custom_fields?.link_instagram === "string" ? l.custom_fields.link_instagram : null;
      const contato: ContatoDaMescla = {
        id: l.id,
        nome: nomeDoContato(l),
        telefone: l.phone_number,
        email: l.email,
        instagram: instagramDoLink(link) ? link : null,
        whatsapp: l.wa_lid,
        empresa: (l.person_id && empresas.get(l.person_id)) || null,
        tags: l.tags ?? [],
        criado_em: l.created_at,
        atualizado_em: l.updated_at,
        atendimento_ativo: ativos.has(l.id),
      };
      return [l.id, contato] as const;
    }),
  );
}

export async function lerSugestoes(
  sb: SB,
  orgId: string,
  consulta: ConsultaDeSugestoes,
): Promise<{ data: Sugestao[]; total: number }> {
  const { data, error } = await sb.rpc("fn_escale_chaves_de_mescla", { p_org: orgId });
  if (error) throw error;
  const chaves = (data ?? []) as ChaveDeMescla[];
  const contatos = await contatosDaMescla(sb, orgId, chaves.map((c) => c.contato_id));
  const todas = ordenarSugestoes(filtrarSugestoes(montarSugestoes(chaves, contatos), consulta), consulta.ordem);
  const inicio = (consulta.p - 1) * consulta.n;
  return { data: todas.slice(inicio, inicio + consulta.n), total: todas.length };
}

export interface ResultadoDaMescla {
  contato_id: string;
  contatos_mesclados: string[];
}

/** Os valores escolhidos, lidos do banco (a tela manda ids, N11). */
function valoresDasEscolhas(contatos: ReadonlyMap<string, ContatoDaMescla>, escolhas: Escolhas) {
  const valores: Partial<Record<Exclude<CampoDaMescla, "empresa">, string>> = {};
  for (const campo of ["nome", "email", "telefone", "instagram"] as const) {
    const dono = escolhas[campo] ? contatos.get(escolhas[campo]!) : undefined;
    const valor = dono?.[campo];
    if (valor) valores[campo] = valor;
  }
  return valores;
}

export async function mesclarGrupo(
  sb: SB,
  admin: SB,
  orgId: string,
  autor: string,
  principal: string,
  secundarios: string[],
  escolhas: Escolhas,
): Promise<ResultadoDaMescla> {
  const contatos = await contatosDaMescla(sb, orgId, [principal, ...secundarios]);
  if (contatos.size !== secundarios.length + 1) throw new ErroDaMescla("grupo_mudou");
  if ([...contatos.values()].filter((c) => c.atendimento_ativo).length >= 2) {
    throw new ErroDaMescla("atendimento_ativo");
  }
  const { data, error } = await sb.rpc("fn_escale_mesclar_contatos", {
    p_org: orgId,
    p_principal: principal,
    p_secundarios: secundarios,
    p_escolhas: valoresDasEscolhas(contatos, escolhas),
  });
  if (error) throw erroDoBanco(error.message);

  const empresaEscolhida = escolhas.empresa ? contatos.get(escolhas.empresa)?.empresa : undefined;
  const empresaAtual = contatos.get(principal)?.empresa;
  if (empresaEscolhida && empresaEscolhida.id !== empresaAtual?.id) {
    await trocarEmpresaDoContato(sb, admin, orgId, autor, principal, { empresa_id: empresaEscolhida.id });
  }
  const resultado = data as { contato_id: string; contatos_mesclados: string[] };
  return { contato_id: resultado.contato_id, contatos_mesclados: resultado.contatos_mesclados };
}
