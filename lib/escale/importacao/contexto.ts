/**
 * AS LEITURAS DE CADA RODADA E DE CADA LOTE (fork Escale, Fase 2F). A rodada lê
 * uma vez as origens, as etapas e os membros; o lote lê, para as suas 100 linhas,
 * os contatos (por ID, e-mail e telefone, sem os mesclados), as conversas de
 * WhatsApp em andamento, a empresa de cada contato e os negócios. Devolve, para
 * cada linha, o `ContextoDaLinha` que `classificar` usa.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { phoneLookupVariants } from "@/lib/channels/phone-variants";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";

import type {
  ContatoExistente,
  ContextoDaLinha,
  ContextoDoNegocio,
  NegocioExistente,
  Resolucoes,
} from "./classificar";
import type { DadosDaLinha, StatusDoNegocio } from "./linhas";
import type { Decisoes, TipoDeImportacao } from "./regras";
import type { Configuracao } from "./tipos";

/** "Em andamento" é o mesmo conjunto de `lib/escale/negocio/conversas.ts` (aberta, pendente, assumida, com a IA). */
export const STATUS_DE_CONVERSA_EM_ANDAMENTO = ["open", "pending", "claimed", "ai_handling"] as const;

export interface Importacao {
  id: string;
  organization_id: string;
  user_id: string;
  tipo: TipoDeImportacao;
  status: string;
  decisoes: Decisoes;
  configuracao: Configuracao;
}

export interface LinhaParaProcessar {
  id: string;
  numero: number;
  normalizado: DadosDaLinha;
  repetida_de: number | null;
  resolucoes: Resolucoes;
}

export interface Membro {
  userId: string;
  email: string | null;
  nome: string | null;
}

interface EtapaLida {
  id: string;
  nome: string;
  posicao: number;
}
export interface ContextoDaRodada {
  importacao: Importacao;
  podeGanhar: boolean;
  origens: Map<string, { nome: string; etapas: EtapaLida[] }>;
  origemPorNome: Map<string, string>;
  membroPorTexto: Map<string, string>;
}

const chave = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export async function lerContextoDaRodada(
  db: SupabaseClient,
  importacao: Importacao,
  membros: readonly Membro[],
): Promise<ContextoDaRodada> {
  const org = importacao.organization_id;
  const papel = await db
    .from("user_organizations")
    .select("role")
    .eq("organization_id", org)
    .eq("user_id", importacao.user_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (papel.error) throw new Error(papel.error.message);

  const origens = new Map<string, { nome: string; etapas: EtapaLida[] }>();
  const origemPorNome = new Map<string, string>();
  if (importacao.tipo === "negocio") {
    const { data, error } = await db
      .from("crm_pipelines")
      .select("id, name, crm_stages!crm_stages_pipeline_id_fkey(id, name, position, is_archived, is_won, is_lost)")
      .eq("organization_id", org)
      .eq("is_archived", false)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    for (const p of (data ?? []) as Array<{
      id: string;
      name: string;
      crm_stages: Array<{ id: string; name: string; position: number | string; is_archived: boolean; is_won: boolean; is_lost: boolean }> | null;
    }>) {
      const etapas = (p.crm_stages ?? [])
        .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
        .map((s) => ({ id: s.id, nome: s.name, posicao: Number(s.position) }))
        .sort((a, b) => a.posicao - b.posicao);
      origens.set(p.id, { nome: p.name, etapas });
      if (!origemPorNome.has(chave(p.name))) origemPorNome.set(chave(p.name), p.id);
    }
  }

  const membroPorTexto = new Map<string, string>();
  for (const m of membros) {
    if (m.email) membroPorTexto.set(chave(m.email), m.userId);
    if (m.nome && !membroPorTexto.has(chave(m.nome))) membroPorTexto.set(chave(m.nome), m.userId);
  }

  return {
    importacao,
    podeGanhar: (papel.data as { role?: string } | null)?.role === "admin",
    origens,
    origemPorNome,
    membroPorTexto,
  };
}

type ContatoLido = {
  id: string;
  name: string | null;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  birthdate: string | null;
  custom_fields: Record<string, unknown> | null;
  tags: string[] | null;
  person_id: string | null;
};
const COLUNAS_DO_CONTATO = "id, name, display_name, email, phone_number, birthdate, custom_fields, tags, person_id";

const unicos = <T>(lista: Array<T | null | undefined>) => [...new Set(lista.filter((x): x is T => x !== null && x !== undefined))];

async function contatosPor(db: SupabaseClient, org: string, coluna: "id" | "email_normalized" | "phone_number", valores: string[]) {
  if (valores.length === 0) return [] as ContatoLido[];
  const { data, error } = await db
    .from("contacts")
    .select(COLUNAS_DO_CONTATO)
    .eq("organization_id", org)
    .is("is_merged_into", null)
    .in(coluna, valores);
  if (error) throw new Error(error.message);
  return (data ?? []) as ContatoLido[];
}

export async function lerContextoDoLote(
  db: SupabaseClient,
  rodada: ContextoDaRodada,
  linhas: readonly LinhaParaProcessar[],
): Promise<(linha: LinhaParaProcessar) => ContextoDaLinha> {
  const imp = rodada.importacao;
  const org = imp.organization_id;
  const dados = linhas.map((l) => l.normalizado);

  const [porIdLidos, porEmailLidos, porTelefoneLidos] = await Promise.all([
    contatosPor(db, org, "id", unicos(dados.map((d) => d.id))),
    contatosPor(db, org, "email_normalized", unicos(dados.map((d) => d.email))),
    contatosPor(db, org, "phone_number", unicos(dados.flatMap((d) => (d.telefone ? phoneLookupVariants(d.telefone) : [])))),
  ]);
  const todos = new Map<string, ContatoLido>();
  for (const c of [...porIdLidos, ...porEmailLidos, ...porTelefoneLidos]) todos.set(c.id, c);
  const ids = [...todos.keys()];

  // A empresa de cada contato: o vínculo principal, senão o mais antigo (2D N4).
  const pessoas = unicos([...todos.values()].map((c) => c.person_id));
  const empresaDaPessoa = new Map<string, string>();
  const nomeDaEmpresa = new Map<string, string | null>();
  if (pessoas.length > 0) {
    const v = await db
      .from("company_people")
      .select("company_id, person_id, is_primary, created_at")
      .eq("organization_id", org)
      .in("person_id", pessoas)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (v.error) throw new Error(v.error.message);
    for (const l of (v.data ?? []) as Array<{ company_id: string; person_id: string }>) {
      if (!empresaDaPessoa.has(l.person_id)) empresaDaPessoa.set(l.person_id, l.company_id);
    }
    const empresas = unicos([...empresaDaPessoa.values()]);
    if (empresas.length > 0) {
      const e = await db.from("companies").select("id, trade_name, legal_name").eq("organization_id", org).in("id", empresas);
      if (e.error) throw new Error(e.error.message);
      for (const c of (e.data ?? []) as Array<{ id: string; trade_name: string | null; legal_name: string | null }>) {
        nomeDaEmpresa.set(c.id, c.trade_name ?? c.legal_name ?? null);
      }
    }
  }

  const comWhatsapp = new Set<string>();
  if (ids.length > 0) {
    const w = await db
      .from("conversations")
      .select("contact_id")
      .eq("organization_id", org)
      .eq("channel", "whatsapp")
      .in("status", [...STATUS_DE_CONVERSA_EM_ANDAMENTO])
      .in("contact_id", ids);
    if (w.error) throw new Error(w.error.message);
    for (const c of (w.data ?? []) as Array<{ contact_id: string }>) comWhatsapp.add(c.contact_id);
  }

  const existente = (c: ContatoLido | undefined): ContatoExistente | null => {
    if (!c) return null;
    const campos = c.custom_fields ?? {};
    const empresaId = c.person_id ? empresaDaPessoa.get(c.person_id) : undefined;
    return {
      id: c.id,
      nome: nomeDoContato(c),
      email: c.email,
      telefone: c.phone_number,
      instagram: typeof campos.link_instagram === "string" ? campos.link_instagram : null,
      nascimento: c.birthdate,
      campos,
      tags: c.tags ?? [],
      empresa: empresaId ? { id: empresaId, nome: nomeDaEmpresa.get(empresaId) ?? null } : null,
    };
  };
  const porEmail = new Map(porEmailLidos.map((c) => [String(c.email ?? "").toLowerCase().trim(), c]));
  const porTelefone = new Map<string, ContatoLido>();
  for (const c of porTelefoneLidos) for (const v of phoneLookupVariants(c.phone_number ?? "")) porTelefone.set(v, c);
  const porId = new Map(porIdLidos.map((c) => [c.id, c]));

  let negocio: ((l: LinhaParaProcessar) => ContextoDoNegocio) | null = null;
  if (imp.tipo === "negocio") {
    const idsDeNegocio = unicos(dados.map((d) => d.negocio?.id ?? null));
    const negociosPorId = new Map<string, NegocioExistente>();
    if (idsDeNegocio.length > 0) {
      const n = await db.from("crm_leads").select("id, title, pipeline_id, custom_fields").eq("organization_id", org).in("id", idsDeNegocio);
      if (n.error) throw new Error(n.error.message);
      for (const l of (n.data ?? []) as Array<{ id: string; title: string; pipeline_id: string; custom_fields: Record<string, unknown> | null }>) {
        negociosPorId.set(l.id, { id: l.id, titulo: l.title, origemId: l.pipeline_id, campos: l.custom_fields ?? {} });
      }
    }
    const abertos: Array<NegocioExistente & { contatoId: string }> = [];
    if (ids.length > 0) {
      const a = await db
        .from("crm_leads")
        .select("id, title, pipeline_id, contact_id, custom_fields")
        .eq("organization_id", org)
        .eq("status", "open")
        .in("contact_id", ids)
        .order("created_at", { ascending: true });
      if (a.error) throw new Error(a.error.message);
      for (const l of (a.data ?? []) as Array<{ id: string; title: string; pipeline_id: string; contact_id: string; custom_fields: Record<string, unknown> | null }>) {
        abertos.push({ id: l.id, titulo: l.title, origemId: l.pipeline_id, contatoId: l.contact_id, campos: l.custom_fields ?? {} });
      }
    }
    const cfg = imp.configuracao;
    const padrao = {
      origemId: cfg.origemId ?? "",
      etapaId: cfg.etapaId ?? "",
      status: cfg.status as StatusDoNegocio,
      motivoDePerda: cfg.motivoDePerda,
    };
    negocio = (l) => ({
      porId: l.normalizado.negocio?.id ? (negociosPorId.get(l.normalizado.negocio.id) ?? null) : null,
      abertoNaOrigem: (contatoId, origemId) => abertos.find((n) => n.contatoId === contatoId && n.origemId === origemId) ?? null,
      origemPorNome: (nome) => rodada.origemPorNome.get(chave(nome)) ?? null,
      etapaPorNome: (origemId, nome) => rodada.origens.get(origemId)?.etapas.find((e) => chave(e.nome) === chave(nome))?.id ?? null,
      primeiraEtapa: (origemId) => rodada.origens.get(origemId)?.etapas[0]?.id ?? null,
      donoPorTexto: (texto) => rodada.membroPorTexto.get(chave(texto)) ?? null,
      padrao,
    });
  }

  return (l) => {
    const d = l.normalizado;
    const telefoneAchado = d.telefone ? phoneLookupVariants(d.telefone).map((v) => porTelefone.get(v)).find(Boolean) : undefined;
    return {
      tipo: imp.tipo,
      porId: d.id ? existente(porId.get(d.id)) : null,
      porEmail: d.email ? existente(porEmail.get(d.email)) : null,
      porTelefone: existente(telefoneAchado),
      whatsappAtivo: (id) => comWhatsapp.has(id),
      tagsDaImportacao: imp.configuracao.tags,
      negocio: negocio ? negocio(l) : null,
    };
  };
}
