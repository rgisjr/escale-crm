/**
 * AS FONTES DAS VARIÁVEIS NO SERVIDOR (fork Escale, Frente V).
 *
 * Busca no banco SÓ o que os tokens do texto pedem: texto sem
 * `[ORGANIZATION.X]` não consulta empresa, texto só com `{{nome}}` não consulta
 * nada (quem chama pergunta `usaTokensDaClint` antes). Toda consulta filtra a
 * organização: o id do contato, do negócio ou do usuário nunca basta sozinho.
 *
 * "Usuário" (D3): quem chama decide quem é: o responsável pelo negócio nas
 * automações, na campanha e no follow-up; quem envia na conversa.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { lerCatalogo } from "@/lib/escale/campos/banco";
import type { ObjetoDeCampo } from "@/lib/escale/campos/regras";
import { nomeDaEmpresa } from "@/lib/escale/empresas/nome";
import { valorParaLeitura } from "@/lib/escale/negocio/campos";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { FUSO_PADRAO, fusoValido } from "@/lib/tempo/fusos";

import { chaveDaVariavel, ENTIDADE_DO_OBJETO } from "./catalogo";
import type { FontesDasVariaveis } from "./resolver";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>;

export interface AlvoDasFontes {
  contactId?: string | null;
  leadId?: string | null;
  usuarioId?: string | null;
}

interface Precisa {
  contato: boolean;
  vinculo: boolean;
  empresa: boolean;
  negocio: boolean;
  etapa: boolean;
  agendamento: boolean;
  usuario: boolean;
  conta: boolean;
  personalizados: Set<ObjetoDeCampo>;
}

const FIXOS_DO_NEGOCIO = new Set(["DATE", "STATUS", "STAGE", "VALUE", "ID", "LATEST_MEETING_LINK", "LATEST_MEETING_DATETIME"]);
const FIXOS_DO_CONTATO = new Set(["NAME", "FIRST_NAME", "LAST_NAME", "ROLE", "EMAIL", "PHONE", "ID"]);
const FIXOS_DA_EMPRESA = new Set(["NAME", "CITY", "STATE", "URL", "SEGMENT", "CATEGORY", "EMPLOYEES"]);

/** O que buscar, pelos tokens (sem colchetes) que o texto usa. */
export function oQuePrecisa(tokens: readonly string[]): Precisa {
  const p: Precisa = {
    contato: false,
    vinculo: false,
    empresa: false,
    negocio: false,
    etapa: false,
    agendamento: false,
    usuario: false,
    conta: false,
    personalizados: new Set(),
  };
  for (const token of tokens) {
    const [entidade, ...resto] = token.split(".");
    const campo = resto.join(".");
    if (entidade === "DEAL") {
      if (campo.startsWith("LATEST_MEETING")) {
        p.agendamento = true;
        p.contato = true;
      } else {
        p.negocio = true;
        if (campo === "STAGE") p.etapa = true;
        if (!FIXOS_DO_NEGOCIO.has(campo)) p.personalizados.add("negocio");
      }
    } else if (entidade === "CONTACT") {
      p.contato = true;
      if (campo === "ROLE") p.vinculo = true;
      if (campo === "ORGANIZATION.NAME") {
        p.vinculo = true;
        p.empresa = true;
      } else if (!FIXOS_DO_CONTATO.has(campo)) p.personalizados.add("contato");
    } else if (entidade === "ORGANIZATION") {
      p.contato = true;
      p.vinculo = true;
      p.empresa = true;
      if (!FIXOS_DA_EMPRESA.has(campo)) p.personalizados.add("empresa");
    } else if (entidade === "USER") {
      if (campo === "ORGANIZATION.NAME") p.conta = true;
      else p.usuario = true;
    }
  }
  return p;
}

function exigir<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}

async function lerContato(sb: SB, orgId: string, id: string) {
  return exigir(
    await sb
      .from("contacts")
      .select("id, name, display_name, email, phone_number, custom_fields, person_id")
      .eq("organization_id", orgId)
      .eq("id", id)
      .maybeSingle(),
  ) as {
    id: string;
    name: string | null;
    display_name: string | null;
    email: string | null;
    phone_number: string | null;
    custom_fields: Record<string, unknown> | null;
    person_id: string | null;
  } | null;
}

/** O vínculo principal da pessoa com uma empresa; sem principal, o mais antigo (como a lista de contatos). */
async function lerVinculo(sb: SB, orgId: string, personId: string) {
  const linhas = exigir(
    await sb
      .from("company_people")
      .select("company_id, job_title, is_primary, created_at")
      .eq("organization_id", orgId)
      .eq("person_id", personId)
      .order("is_primary", { ascending: false })
      .order("created_at")
      .limit(1),
  ) as Array<{ company_id: string; job_title: string | null }> | null;
  return linhas?.[0] ?? null;
}

async function lerEmpresa(sb: SB, orgId: string, id: string) {
  return exigir(
    await sb
      .from("companies")
      .select("id, trade_name, legal_name, city, state, custom_fields")
      .eq("organization_id", orgId)
      .eq("id", id)
      .maybeSingle(),
  ) as {
    trade_name: string | null;
    legal_name: string | null;
    city: string | null;
    state: string | null;
    custom_fields: Record<string, unknown> | null;
  } | null;
}

async function lerNegocio(sb: SB, orgId: string, id: string) {
  return exigir(
    await sb
      .from("crm_leads")
      .select("id, created_at, status, stage_id, value_cents, currency, custom_fields")
      .eq("organization_id", orgId)
      .eq("id", id)
      .maybeSingle(),
  ) as {
    id: string;
    created_at: string;
    status: string;
    stage_id: string;
    value_cents: number | null;
    currency: string | null;
    custom_fields: Record<string, unknown> | null;
  } | null;
}

async function lerEtapa(sb: SB, orgId: string, id: string): Promise<string | null> {
  const linha = exigir(
    await sb.from("crm_stages").select("name").eq("organization_id", orgId).eq("id", id).maybeSingle(),
  ) as { name: string | null } | null;
  return linha?.name ?? null;
}

/** O compromisso mais recente do contato, fora os cancelados (D15). */
async function lerAgendamento(sb: SB, orgId: string, contactId: string) {
  const linhas = exigir(
    await sb
      .from("calendar_appointments")
      .select("meeting_url, starts_at")
      .eq("organization_id", orgId)
      .eq("contact_id", contactId)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: false })
      .limit(1),
  ) as Array<{ meeting_url: string | null; starts_at: string }> | null;
  const a = linhas?.[0];
  return a ? { link: a.meeting_url, inicio: a.starts_at } : null;
}

async function lerConta(sb: SB, orgId: string) {
  return exigir(
    // `nome_da_conta` é o `display_name` da ORGANIZAÇÃO (não do contato: a cerca
    // de `rotulo-do-contato` vigia a cadeia de nome de gente).
    await sb.from("organizations").select("nome_da_conta:display_name, legal_name, timezone").eq("id", orgId).maybeSingle(),
  ) as { nome_da_conta: string | null; legal_name: string | null; timezone: string | null } | null;
}

/**
 * O usuário vem do Auth (nome em `user_metadata.full_name`), e só se for
 * membro desta organização: um id de outra conta não devolve nome nem e-mail.
 */
async function lerUsuario(admin: SB, orgId: string, usuarioId: string) {
  const membro = exigir(
    await admin
      .from("user_organizations")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("user_id", usuarioId)
      .is("revoked_at", null)
      .maybeSingle(),
  );
  if (!membro) return null;
  const { data, error } = await admin.auth.admin.getUserById(usuarioId);
  if (error || !data.user) return null;
  const nome = (data.user.user_metadata?.full_name as string | undefined) ?? null;
  return { nome, email: data.user.email ?? null };
}

/** Os personalizados formatados pelo tipo do catálogo (moeda, data, opção), em BR. */
function prontosDe(
  objeto: ObjetoDeCampo,
  campos: Readonly<Record<string, unknown>> | null | undefined,
  defs: Awaited<ReturnType<typeof lerCatalogo>>["campos"],
): Record<string, string> {
  const saida: Record<string, string> = {};
  if (!campos) return saida;
  for (const def of defs) {
    if (!Object.hasOwn(campos, def.chave)) continue;
    const texto = valorParaLeitura(
      def.definicao.type as Parameters<typeof valorParaLeitura>[0],
      def.definicao.options,
      campos[def.chave],
      (s) => s,
    );
    saida[`[${ENTIDADE_DO_OBJETO[objeto]}.${chaveDaVariavel(def.chave)}]`] = texto ?? "";
  }
  return saida;
}

/**
 * Carrega as fontes para os `tokens` (sem colchetes, de `tokensUsados`).
 * `sb` é o cliente que lê os dados (service role nos envios); `admin` lê o Auth.
 */
export async function carregarFontes(
  sb: SB,
  admin: SB,
  orgId: string,
  alvo: AlvoDasFontes,
  tokens: readonly string[],
): Promise<FontesDasVariaveis> {
  const p = oQuePrecisa(tokens);
  const fontes: FontesDasVariaveis = { prontos: {} };
  const prontos: Record<string, string> = {};

  const [contato, negocio, conta, usuario, catalogos] = await Promise.all([
    p.contato && alvo.contactId ? lerContato(sb, orgId, alvo.contactId) : null,
    p.negocio && alvo.leadId ? lerNegocio(sb, orgId, alvo.leadId) : null,
    // A conta dá o nome (`[USER.ORGANIZATION.NAME]`) e o fuso das datas.
    p.conta || p.negocio || p.agendamento ? lerConta(sb, orgId) : null,
    p.usuario && alvo.usuarioId ? lerUsuario(admin, orgId, alvo.usuarioId) : null,
    Promise.all([...p.personalizados].map(async (o) => [o, await lerCatalogo(sb, orgId, o)] as const)),
  ]);
  const defs = new Map(catalogos.map(([o, c]) => [o, c.campos]));

  const tz = conta?.timezone?.trim() ?? "";
  fontes.fuso = tz !== "" && fusoValido(tz) ? tz : FUSO_PADRAO;
  if (p.conta) fontes.conta = { nome: conta?.nome_da_conta?.trim() || conta?.legal_name?.trim() || null };
  if (p.usuario) fontes.usuario = usuario ?? { nome: null, email: null };

  if (p.negocio) {
    fontes.negocio = negocio
      ? {
          id: negocio.id,
          criadoEm: negocio.created_at,
          status: negocio.status,
          etapa: p.etapa ? await lerEtapa(sb, orgId, negocio.stage_id) : null,
          valorCentavos: negocio.value_cents,
          moeda: negocio.currency,
          campos: negocio.custom_fields,
        }
      : null;
    Object.assign(prontos, prontosDe("negocio", negocio?.custom_fields, defs.get("negocio") ?? []));
  }

  if (p.contato) {
    const vinculo = p.vinculo && contato?.person_id ? await lerVinculo(sb, orgId, contato.person_id) : null;
    fontes.contato = contato
      ? {
          id: contato.id,
          nome: nomeDoContato(contato),
          email: contato.email,
          telefone: contato.phone_number,
          cargo: vinculo?.job_title ?? null,
          campos: contato.custom_fields,
        }
      : null;
    Object.assign(prontos, prontosDe("contato", contato?.custom_fields, defs.get("contato") ?? []));
    if (p.empresa) {
      const empresa = vinculo ? await lerEmpresa(sb, orgId, vinculo.company_id) : null;
      fontes.empresa = empresa
        ? { nome: nomeDaEmpresa(empresa), cidade: empresa.city, estado: empresa.state, campos: empresa.custom_fields }
        : null;
      Object.assign(prontos, prontosDe("empresa", empresa?.custom_fields, defs.get("empresa") ?? []));
    }
    if (p.agendamento && contato) fontes.ultimoAgendamento = await lerAgendamento(sb, orgId, contato.id);
  }

  fontes.prontos = prontos;
  return fontes;
}
