/**
 * As empresas da casca no banco (Fase 2D). Leituras pela sessão (RLS);
 * escritas pelas funções definer da 9105, chamadas com o service role depois
 * de a rota conferir o papel.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { padraoRegexDeBusca } from "@/lib/contacts/busca-regex";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import { filtrosDaConsulta, fusoDaOrganizacao } from "@/lib/escale/contatos/lista";

import { nomeDaEmpresa } from "./nome";
import { COLUNA_DO_CAMPO_FIXO, type ConsultaDaListaDeEmpresas, type NovaEmpresa, lerCnpj } from "./regras";

type SB = SupabaseClient;

export class ErroDaEmpresa extends Error {
  constructor(
    public readonly codigo:
      | "cnpj_invalido"
      | "cnpj_repetido"
      | "contato_nao_encontrado"
      | "empresa_nao_encontrada"
      | "contato_fora_da_empresa"
      | "escolha_o_principal",
  ) {
    super(codigo);
  }
}

export const TEXTO_DO_ERRO_DA_EMPRESA: Record<ErroDaEmpresa["codigo"], string> = {
  cnpj_invalido: "CNPJ inválido.",
  cnpj_repetido: "CNPJ já cadastrado em outra empresa.",
  contato_nao_encontrado: "Contato não encontrado.",
  empresa_nao_encontrada: "Empresa não encontrada",
  contato_fora_da_empresa: "Este contato não está nesta empresa.",
  escolha_o_principal: "Selecione o novo contato principal.",
};

export const STATUS_DO_ERRO_DA_EMPRESA: Record<ErroDaEmpresa["codigo"], number> = {
  cnpj_invalido: 422,
  cnpj_repetido: 409,
  contato_nao_encontrado: 404,
  empresa_nao_encontrada: 404,
  contato_fora_da_empresa: 422,
  escolha_o_principal: 422,
};

/** Traduz o erro do Postgres (mensagem da 9105 ou 23505) num erro tipado. */
export function erroDaEmpresaDoBanco(error: { code?: string; message: string }): ErroDaEmpresa | null {
  if (error.code === "23505") return new ErroDaEmpresa("cnpj_repetido");
  for (const codigo of ["contato_nao_encontrado", "empresa_nao_encontrada", "contato_fora_da_empresa", "escolha_o_principal"] as const) {
    if (error.message.includes(codigo)) return new ErroDaEmpresa(codigo);
  }
  return null;
}

export interface PrincipalDaEmpresa {
  id: string;
  nome: string;
  telefone: string | null;
  tem_foto: boolean;
  conversa_id: string | null;
}

export interface LinhaDeEmpresa {
  id: string;
  nome: string;
  cnpj: string | null;
  campos: Record<string, unknown>;
  contatos: number;
  negocios: number;
  negocio_unico: string | null;
  valor_aberto: number;
  principal: PrincipalDaEmpresa | null;
}

export interface PaginaDeEmpresas {
  linhas: LinhaDeEmpresa[];
  total: number;
  pagina: number;
  porPagina: number;
  moeda: string;
}

export { nomeDaEmpresa };

export async function moedaDaOrganizacaoDe(sb: SB, orgId: string): Promise<string> {
  const { data } = await sb.from("organizations").select("currency").eq("id", orgId).maybeSingle();
  return ((data as { currency?: string } | null)?.currency ?? "BRL").toUpperCase();
}

/** Busca: dígitos (≥ 3) procuram no CNPJ; o resto, no nome, pelo padrão do original. */
export function parametrosDaBuscaDeEmpresas(q: string | undefined): { padrao: string | null; digitos: string | null } {
  const termo = (q ?? "").trim();
  if (termo.length < 2) return { padrao: null, digitos: null };
  const digitos = termo.replace(/\D/g, "");
  const soCnpj = /^[\d./-\s]+$/.test(termo);
  return {
    padrao: soCnpj ? null : padraoRegexDeBusca(termo.replace(/[()]/g, "")),
    digitos: digitos.length >= 3 ? digitos : null,
  };
}

interface LinhaDaFuncao {
  company_id: string;
  total: number;
  contatos: number;
  negocios: number;
  negocio_unico: string | null;
  valor_aberto_cents: number;
  principal: string | null;
}

export async function listarEmpresas(sb: SB, orgId: string, consulta: ConsultaDaListaDeEmpresas): Promise<PaginaDeEmpresas> {
  const { padrao, digitos } = parametrosDaBuscaDeEmpresas(consulta.q);
  const filtro = filtrosDaConsulta({ f: consulta.f });
  const fuso = filtro ? await fusoDaOrganizacao(sb, orgId) : "America/Sao_Paulo";
  const moeda = await moedaDaOrganizacaoDe(sb, orgId);
  const { data, error } = await sb.rpc("fn_escale_lista_de_empresas", {
    p_org: orgId,
    p_escopo: consulta.e,
    p_padrao: padrao,
    p_digitos: digitos,
    p_filtros: filtro ? compilarFiltros(filtro, fuso) : {},
    p_limite: consulta.n,
    p_deslocamento: (consulta.p - 1) * consulta.n,
  });
  if (error) throw error;
  const pagina = (data ?? []) as LinhaDaFuncao[];
  if (pagina.length === 0) return { linhas: [], total: 0, pagina: consulta.p, porPagina: consulta.n, moeda };

  const ids = pagina.map((l) => l.company_id);
  const principais = pagina.map((l) => l.principal).filter((x): x is string => Boolean(x));
  const [empresas, contatos, conversas] = await Promise.all([
    sb.from("companies").select("id, trade_name, legal_name, cnpj, custom_fields").eq("organization_id", orgId).in("id", ids),
    principais.length
      ? sb.from("contacts").select("id, name, display_name, phone_number, avatar_path").eq("organization_id", orgId).in("id", principais)
      : Promise.resolve({ data: [], error: null }),
    principais.length
      ? sb.from("conversations").select("id, contact_id, last_message_at").eq("organization_id", orgId).in("contact_id", principais).order("last_message_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (empresas.error) throw empresas.error;
  // Sem estas duas conferências a falha virava "Contato principal —" como se fosse dado real.
  if (contatos.error) throw contatos.error;
  if (conversas.error) throw conversas.error;
  const porId = new Map(((empresas.data ?? []) as Array<Record<string, unknown>>).map((e) => [String(e.id), e]));
  const contatoPorId = new Map(((contatos.data ?? []) as Array<Record<string, unknown>>).map((c) => [String(c.id), c]));
  const conversaPorContato = new Map<string, string>();
  for (const c of (conversas.data ?? []) as Array<{ id: string; contact_id: string }>) {
    if (!conversaPorContato.has(c.contact_id)) conversaPorContato.set(c.contact_id, c.id);
  }

  const linhas = pagina.map((l): LinhaDeEmpresa => {
    const e = porId.get(l.company_id) ?? {};
    const p = l.principal ? contatoPorId.get(l.principal) : undefined;
    return {
      id: l.company_id,
      nome: nomeDaEmpresa(e as { trade_name: string | null; legal_name: string | null }),
      cnpj: (e.cnpj as string | null) ?? null,
      campos: (e.custom_fields as Record<string, unknown> | null) ?? {},
      contatos: l.contatos,
      negocios: l.negocios,
      negocio_unico: l.negocio_unico,
      valor_aberto: Number(l.valor_aberto_cents ?? 0) / 100,
      principal: p
        ? {
            id: String(p.id),
            nome: nomeDoContato({ name: p.name as string | null, display_name: p.display_name as string | null }) ?? String(p.phone_number ?? ""),
            telefone: (p.phone_number as string | null) ?? null,
            tem_foto: Boolean(p.avatar_path),
            conversa_id: conversaPorContato.get(String(p.id)) ?? null,
          }
        : null,
    };
  });
  return { linhas, total: Number(pagina[0]?.total ?? 0), pagina: consulta.p, porPagina: consulta.n, moeda };
}

export async function criarEmpresa(admin: SB, orgId: string, autor: string, entrada: NovaEmpresa): Promise<string> {
  const cnpj = lerCnpj(entrada.cnpj);
  if (!cnpj.ok) throw new ErroDaEmpresa("cnpj_invalido");
  const { data, error } = await admin.rpc("fn_escale_criar_empresa", {
    p_org: orgId,
    p_autor: autor,
    p_nome: entrada.nome.trim(),
    p_cnpj: cnpj.formatado ?? "",
    p_cnpj_normalizado: cnpj.normalizado ?? "",
    p_site: entrada.site?.trim() ?? "",
    p_contato: entrada.contato_id,
  });
  if (error) throw erroDaEmpresaDoBanco(error) ?? error;
  return String(data);
}

export interface FichaDaEmpresa {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  campos: Record<string, unknown>;
  criada_em: string;
  valor_aberto: number;
  moeda: string;
  principal: PrincipalDaEmpresa | null;
  contatos: number;
  negocios: number;
}

export interface ContatoDaEmpresa {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  tags: string[];
  tem_foto: boolean;
  conversa_id: string | null;
  principal: boolean;
  negocios: number;
  negocio_unico: string | null;
}

export interface NegocioDaEmpresa {
  id: string;
  titulo: string;
  origem: string;
  etapa: string;
  status: "open" | "won" | "lost";
  valor: number | null;
  moeda: string | null;
  contato: string;
}

export interface EmpresaDoContato {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  cnpj: string | null;
  campos: Record<string, unknown>;
  principal: boolean;
}

const COLUNAS_DA_EMPRESA = "id, trade_name, legal_name, cnpj, city, state, custom_fields, created_at";

type LeadDoContato = { id: string; contact_id: string; status: string | null; value_cents: number | null; currency: string | null };

/** Soma dos negócios abertos já lidos (N6): na moeda da organização, pela RLS de quem olha. */
function valorEmAbertoDosLeads(leads: LeadDoContato[], moeda: string): number {
  return (
    leads
      .filter((l) => l.status === "open" && (l.currency ?? moeda).toUpperCase() === moeda)
      .reduce((s, l) => s + (l.value_cents ?? 0), 0) / 100
  );
}

export async function lerFichaDaEmpresa(sb: SB, orgId: string, id: string): Promise<FichaDaEmpresa> {
  const { data: e, error } = await sb.from("companies").select(COLUNAS_DA_EMPRESA).eq("organization_id", orgId).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!e) throw new ErroDaEmpresa("empresa_nao_encontrada");
  // Uma leitura de vínculos, contatos e negócios: o valor em aberto sai dos mesmos negócios da contagem.
  const [moeda, { contatos, leads }] = await Promise.all([moedaDaOrganizacaoDe(sb, orgId), lerContatosELeadsDaEmpresa(sb, orgId, id)]);
  const p = contatos.find((c) => c.principal);
  return {
    id,
    nome: nomeDaEmpresa(e as never),
    cnpj: (e.cnpj as string | null) ?? null,
    cidade: (e.city as string | null) ?? null,
    estado: (e.state as string | null) ?? null,
    campos: (e.custom_fields as Record<string, unknown> | null) ?? {},
    criada_em: String(e.created_at),
    valor_aberto: valorEmAbertoDosLeads(leads, moeda),
    moeda,
    principal: p ? { id: p.id, nome: p.nome, telefone: p.telefone, tem_foto: p.tem_foto, conversa_id: p.conversa_id } : null,
    contatos: contatos.length,
    negocios: contatos.reduce((s, c) => s + c.negocios, 0),
  };
}

/** Vínculos da empresa e os contatos deles (sem a ficha do contato fundida), numa passada. */
async function lerPessoasDaEmpresa(sb: SB, orgId: string, id: string) {
  const vinculos = await sb.from("company_people").select("person_id, is_primary, created_at").eq("organization_id", orgId).eq("company_id", id).order("created_at");
  if (vinculos.error) throw vinculos.error;
  const principalPorPessoa = new Map(((vinculos.data ?? []) as Array<{ person_id: string; is_primary: boolean }>).map((v) => [v.person_id, v.is_primary]));
  if (!principalPorPessoa.size) return { principalPorPessoa, lista: [] as Array<Record<string, unknown>> };
  const contatos = await sb
    .from("contacts")
    .select("id, name, display_name, phone_number, email, tags, avatar_path, person_id")
    .eq("organization_id", orgId)
    .in("person_id", [...principalPorPessoa.keys()])
    .is("is_merged_into", null);
  if (contatos.error) throw contatos.error;
  return { principalPorPessoa, lista: (contatos.data ?? []) as Array<Record<string, unknown>> };
}

export async function contatosDaEmpresa(sb: SB, orgId: string, id: string): Promise<ContatoDaEmpresa[]> {
  return (await lerContatosELeadsDaEmpresa(sb, orgId, id)).contatos;
}

/** Os contatos da empresa e os negócios deles (status e valor junto), para a ficha não reler `crm_leads`. */
async function lerContatosELeadsDaEmpresa(sb: SB, orgId: string, id: string): Promise<{ contatos: ContatoDaEmpresa[]; leads: LeadDoContato[] }> {
  const { principalPorPessoa, lista } = await lerPessoasDaEmpresa(sb, orgId, id);
  if (!lista.length) return { contatos: [], leads: [] };
  const ids = lista.map((c) => String(c.id));
  const [leads, conversas] = await Promise.all([
    sb
      .from("crm_leads")
      .select("id, contact_id, status, value_cents, currency, crm_pipelines!inner(is_archived)")
      .eq("organization_id", orgId)
      .eq("crm_pipelines.is_archived", false)
      .in("contact_id", ids),
    sb.from("conversations").select("id, contact_id, last_message_at").eq("organization_id", orgId).in("contact_id", ids).order("last_message_at", { ascending: false }),
  ]);
  // Sem esta conferência o valor em aberto sairia zerado em silêncio.
  if (leads.error) throw leads.error;
  if (conversas.error) throw conversas.error;
  const negociosPorContato = new Map<string, string[]>();
  const leadsLidos = (leads.data ?? []) as unknown as LeadDoContato[];
  for (const l of leadsLidos) {
    negociosPorContato.set(l.contact_id, [...(negociosPorContato.get(l.contact_id) ?? []), l.id]);
  }
  const conversaPorContato = new Map<string, string>();
  for (const c of (conversas.data ?? []) as Array<{ id: string; contact_id: string }>) {
    if (!conversaPorContato.has(c.contact_id)) conversaPorContato.set(c.contact_id, c.id);
  }
  const contatos = lista
    .map((c): ContatoDaEmpresa => {
      const negocios = negociosPorContato.get(String(c.id)) ?? [];
      return {
        id: String(c.id),
        nome: nomeDoContato({ name: c.name as string | null, display_name: c.display_name as string | null }) ?? String(c.phone_number ?? ""),
        telefone: (c.phone_number as string | null) ?? null,
        email: (c.email as string | null) ?? null,
        tags: (c.tags as string[] | null) ?? [],
        tem_foto: Boolean(c.avatar_path),
        conversa_id: conversaPorContato.get(String(c.id)) ?? null,
        principal: Boolean(principalPorPessoa.get(String(c.person_id))),
        negocios: negocios.length,
        negocio_unico: negocios.length === 1 ? (negocios[0] ?? null) : null,
      };
    })
    .sort((a, b) => Number(b.principal) - Number(a.principal) || a.nome.localeCompare(b.nome, "pt-BR"));
  return { contatos, leads: leadsLidos };
}

export async function negociosDaEmpresa(sb: SB, orgId: string, id: string): Promise<NegocioDaEmpresa[]> {
  // Só os nomes e ids dos contatos: sem recontar negócios nem buscar conversas.
  const { lista } = await lerPessoasDaEmpresa(sb, orgId, id);
  if (!lista.length) return [];
  const nomePorContato = new Map(
    lista.map((c) => [String(c.id), nomeDoContato({ name: c.name as string | null, display_name: c.display_name as string | null }) ?? String(c.phone_number ?? "")]),
  );
  const { data, error } = await sb
    .from("crm_leads")
    .select("id, title, status, value_cents, currency, contact_id, crm_pipelines!inner(name, is_archived), crm_stages!crm_leads_stage_id_fkey(name)")
    .eq("organization_id", orgId)
    .eq("crm_pipelines.is_archived", false)
    .in("contact_id", [...nomePorContato.keys()])
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((l) => ({
    id: String(l.id),
    titulo: String(l.title ?? ""),
    origem: String((l.crm_pipelines as { name?: string } | null)?.name ?? ""),
    etapa: String((l.crm_stages as { name?: string } | null)?.name ?? ""),
    status: l.status as NegocioDaEmpresa["status"],
    valor: l.value_cents == null ? null : Number(l.value_cents) / 100,
    moeda: (l.currency as string | null) ?? null,
    contato: nomePorContato.get(String(l.contact_id)) ?? "",
  }));
}

export async function empresaDoContato(sb: SB, orgId: string, contatoId: string): Promise<EmpresaDoContato | null> {
  // Erro do banco sobe: virar `null` fazia "tirar da empresa" valer como no-op e "Nova empresa" criar sem copiar nada.
  const { data: c, error: erroDoContato } = await sb.from("contacts").select("person_id").eq("organization_id", orgId).eq("id", contatoId).maybeSingle();
  if (erroDoContato) throw erroDoContato;
  const pessoa = (c as { person_id: string | null } | null)?.person_id;
  if (!pessoa) return null;
  const { data: vinculos, error: erroDoVinculo } = await sb
    .from("company_people")
    .select("company_id, is_primary, created_at")
    .eq("organization_id", orgId)
    .eq("person_id", pessoa)
    .order("is_primary", { ascending: false })
    .order("created_at")
    .limit(1);
  if (erroDoVinculo) throw erroDoVinculo;
  const v = ((vinculos ?? []) as Array<{ company_id: string; is_primary: boolean }>)[0];
  if (!v) return null;
  const { data: e, error: erroDaEmpresa } = await sb.from("companies").select(COLUNAS_DA_EMPRESA).eq("organization_id", orgId).eq("id", v.company_id).maybeSingle();
  if (erroDaEmpresa) throw erroDaEmpresa;
  if (!e) return null;
  return {
    id: String(e.id),
    nome: nomeDaEmpresa(e as never),
    cidade: (e.city as string | null) ?? null,
    estado: (e.state as string | null) ?? null,
    cnpj: (e.cnpj as string | null) ?? null,
    campos: (e.custom_fields as Record<string, unknown> | null) ?? {},
    principal: v.is_primary,
  };
}

export const patchDaEmpresaSchema = z.object({ chave: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), valor: z.unknown() });
export type PatchDaEmpresa = z.infer<typeof patchDaEmpresaSchema>;

export async function mudarCampoDaEmpresa(sb: SB, orgId: string, id: string, patch: PatchDaEmpresa): Promise<void> {
  const coluna = COLUNA_DO_CAMPO_FIXO[patch.chave];
  let mudanca: Record<string, unknown>;
  if (coluna === "cnpj") {
    const cnpj = lerCnpj(typeof patch.valor === "string" ? patch.valor : "");
    if (!cnpj.ok) throw new ErroDaEmpresa("cnpj_invalido");
    mudanca = { cnpj: cnpj.formatado, normalized_cnpj: cnpj.normalizado };
  } else if (coluna) {
    const texto = typeof patch.valor === "string" ? patch.valor.trim() : "";
    mudanca = { [coluna]: coluna === "state" ? texto.toUpperCase().slice(0, 2) || null : texto || null };
  } else {
    const { data, error } = await sb.from("companies").select("id, custom_fields").eq("organization_id", orgId).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new ErroDaEmpresa("empresa_nao_encontrada");
    const atual = { ...((data.custom_fields as Record<string, unknown> | null) ?? {}) };
    const vazio = patch.valor === null || patch.valor === "" || (Array.isArray(patch.valor) && patch.valor.length === 0);
    if (vazio) delete atual[patch.chave];
    else atual[patch.chave] = patch.valor;
    mudanca = { custom_fields: atual };
  }
  const { error } = await sb.from("companies").update(mudanca).eq("organization_id", orgId).eq("id", id);
  if (error) throw erroDaEmpresaDoBanco(error) ?? error;
}

async function rpcDaEmpresa(admin: SB, nome: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await admin.rpc(nome, args);
  if (error) throw erroDaEmpresaDoBanco(error) ?? error;
  return data;
}

export const vincularContato = (admin: SB, orgId: string, empresaId: string, contatoId: string, principal: boolean) =>
  rpcDaEmpresa(admin, "fn_escale_vincular_contato_a_empresa", { p_org: orgId, p_contato: contatoId, p_empresa: empresaId, p_principal: principal });

export const desvincularContato = async (admin: SB, orgId: string, empresaId: string, contatoId: string, novoPrincipal: string | null) =>
  (await rpcDaEmpresa(admin, "fn_escale_desvincular_contato_da_empresa", {
    p_org: orgId, p_contato: contatoId, p_empresa: empresaId, p_novo_principal: novoPrincipal,
  })) as "removido" | "empresa_excluida";

export const tornarPrincipal = (admin: SB, orgId: string, empresaId: string, contatoId: string | null) =>
  rpcDaEmpresa(admin, "fn_escale_tornar_principal", { p_org: orgId, p_empresa: empresaId, p_contato: contatoId });

export const excluirEmpresa = (admin: SB, orgId: string, empresaId: string) =>
  rpcDaEmpresa(admin, "fn_escale_excluir_empresa", { p_org: orgId, p_empresa: empresaId });

export const trocarEmpresaDoContatoSchema = z.union([
  z.object({ empresa_id: z.string().uuid() }).strict(),
  z.object({ empresa_id: z.null() }).strict(),
  z.object({ nova: z.object({ nome: z.string().trim().min(1).max(200), campos: z.enum(["manter", "limpar"]) }) }).strict(),
]);
export type TrocaDaEmpresa = z.infer<typeof trocarEmpresaDoContatoSchema>;

/**
 * Aba Empresa do negócio (N13): vincular a uma existente, tirar da atual ou
 * criar uma nova ("Manter" copia cidade, estado e o catálogo da atual; o CNPJ não).
 */
export async function trocarEmpresaDoContato(sb: SB, admin: SB, orgId: string, autor: string, contatoId: string, pedido: TrocaDaEmpresa): Promise<EmpresaDoContato | null> {
  const atual = await empresaDoContato(sb, orgId, contatoId);
  if ("nova" in pedido) {
    const id = String(await rpcDaEmpresa(admin, "fn_escale_criar_empresa", {
      p_org: orgId, p_autor: autor, p_nome: pedido.nova.nome, p_cnpj: "", p_cnpj_normalizado: "", p_site: "", p_contato: contatoId,
    }));
    if (pedido.nova.campos === "manter" && atual) {
      const { error } = await admin
        .from("companies")
        .update({ city: atual.cidade, state: atual.estado, custom_fields: atual.campos })
        .eq("organization_id", orgId)
        .eq("id", id);
      if (error) throw error;
    }
  } else if (pedido.empresa_id === null) {
    if (atual) await desvincularContato(admin, orgId, atual.id, contatoId, null).catch(async (err) => {
      // Era o principal e há outros: passa o principal ao primeiro dos outros (a aba do negócio não pergunta).
      if (!(err instanceof ErroDaEmpresa) || err.codigo !== "escolha_o_principal") throw err;
      const outros = (await contatosDaEmpresa(sb, orgId, atual.id)).filter((c) => c.id !== contatoId);
      await desvincularContato(admin, orgId, atual.id, contatoId, outros[0]?.id ?? null);
    });
  } else {
    await vincularContato(admin, orgId, pedido.empresa_id, contatoId, false);
  }
  return empresaDoContato(sb, orgId, contatoId);
}
