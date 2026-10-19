/**
 * GRAVAR O PLANO DE UMA LINHA (fork Escale, Fase 2F). Contato novo como o
 * importador do original (insert direto, `source: "import_csv"`, o evento
 * `contact.created`, sem abrir conversa); contato existente pelo PATCH do
 * original (eventos e auditoria); a empresa pela função da 9107; o negócio pelo
 * `createLeadHandler` (via planilha) e o `encerraDemanda` (ganho e perda).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { HandlerCtx } from "@/lib/api/handlers/types";
import { ORIGEM_DA_PLANILHA } from "@/lib/leads/planilha";

import type { Plano, PlanoDaEmpresa, PlanoDoContato, PlanoDoNegocio } from "./classificar";

export class ErroDaLinha extends Error {}

export interface DependenciasDaGravacao {
  db: SupabaseClient;
  mudarContato: (ctx: HandlerCtx, id: string, patch: Record<string, unknown>) => Promise<unknown>;
  criarNegocio: (ctx: HandlerCtx, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  mudarNegocio: (ctx: HandlerCtx, id: string, input: Record<string, unknown>) => Promise<unknown>;
  encerrar: (ctx: HandlerCtx, input: { leadId: string; desfecho: "won" | "lost"; motivo: string | null }) => Promise<unknown>;
  cpf: (cpf: string) => Promise<Record<string, unknown>>;
}

export interface ImportacaoQueGrava {
  id: string;
  organization_id: string;
  user_id: string;
  podeGanhar: boolean;
}

const vazio = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const SOURCE = "import_csv";

async function camposAtuais(deps: DependenciasDaGravacao, tabela: "contacts" | "crm_leads", org: string, id: string) {
  const { data, error } = await deps.db.from(tabela).select("custom_fields").eq("organization_id", org).eq("id", id).maybeSingle();
  if (error) throw new ErroDaLinha(error.message);
  return ((data as { custom_fields?: Record<string, unknown> | null } | null)?.custom_fields ?? {}) as Record<string, unknown>;
}

async function gravarContato(deps: DependenciasDaGravacao, ctx: HandlerCtx, imp: ImportacaoQueGrava, plano: PlanoDoContato): Promise<string> {
  const org = imp.organization_id;
  if (plano.tipo === "criar") {
    const d = plano.dados;
    const linha: Record<string, unknown> = {
      organization_id: org,
      created_by_user_id: imp.user_id,
      name: d.nome,
      email: d.email,
      phone_number: d.telefone,
      birthdate: d.nascimento,
      tags: d.tags,
      custom_fields: { ...d.campos, ...(d.instagram ? { link_instagram: d.instagram } : {}) },
      source: SOURCE,
      source_metadata: { importacao_id: imp.id },
      consent: {},
    };
    if (d.cpf) Object.assign(linha, await deps.cpf(d.cpf));
    const { data, error } = await deps.db.from("contacts").insert(linha).select("id").single();
    if (error) {
      throw new ErroDaLinha(
        error.code === "23505" ? "Contato já cadastrado com este e-mail, telefone ou CPF." : error.message,
      );
    }
    const id = String((data as { id: string }).id);
    await deps.db.rpc("emit_event", {
      p_event_type: "contact.created",
      p_entity_kind: "contact",
      p_entity_id: id,
      p_payload: { source: SOURCE, has_email: !!d.email, has_phone: !!d.telefone, has_cpf: !!d.cpf },
      p_metadata: { actor_type: "user", importacao_id: imp.id },
      p_organization_id: org,
    });
    return id;
  }
  const m = plano.mudancas;
  const patch: Record<string, unknown> = {};
  if (m.nome !== undefined) patch.name = m.nome;
  if (m.email !== undefined) patch.email = m.email;
  if (m.telefone !== undefined) patch.phone_number = m.telefone;
  if (m.nascimento !== undefined) patch.birthdate = m.nascimento;
  if (m.tags !== undefined) patch.tags = m.tags;
  if (m.campos !== undefined || m.instagram !== undefined) {
    patch.custom_fields = {
      ...(await camposAtuais(deps, "contacts", org, plano.id)),
      ...(m.campos ?? {}),
      ...(m.instagram !== undefined ? { link_instagram: m.instagram } : {}),
    };
  }
  if (Object.keys(patch).length > 0) await deps.mudarContato(ctx, plano.id, patch);
  return plano.id;
}

async function gravarEmpresa(deps: DependenciasDaGravacao, imp: ImportacaoQueGrava, contatoId: string, e: PlanoDaEmpresa) {
  const org = imp.organization_id;
  const achada = await deps.db.rpc("fn_escale_empresa_da_importacao", {
    p_org: org,
    p_autor: imp.user_id,
    p_contato: contatoId,
    p_nome: e.nome,
    p_cnpj: e.cnpj?.formatado ?? null,
    p_cnpj_normalizado: e.cnpj?.normalizado ?? null,
  });
  if (achada.error) throw new ErroDaLinha(achada.error.message);
  const empresaId = String(achada.data);
  if (Object.keys(e.campos).length === 0 && !e.cnpj) return;

  const { data, error } = await deps.db
    .from("companies")
    .select("city, state, cnpj, custom_fields")
    .eq("organization_id", org)
    .eq("id", empresaId)
    .maybeSingle();
  if (error) throw new ErroDaLinha(error.message);
  const atual = (data ?? {}) as { city?: string | null; state?: string | null; cnpj?: string | null; custom_fields?: Record<string, unknown> | null };
  const mudanca: Record<string, unknown> = {};
  const campos = { ...(atual.custom_fields ?? {}) };
  let mexeuNosCampos = false;
  for (const [chave, valor] of Object.entries(e.campos)) {
    if (chave === "cidade") {
      if (vazio(atual.city)) mudanca.city = valor;
    } else if (chave === "estado") {
      if (vazio(atual.state)) mudanca.state = valor;
    } else if (vazio(campos[chave])) {
      campos[chave] = valor;
      mexeuNosCampos = true;
    }
  }
  if (mexeuNosCampos) mudanca.custom_fields = campos;
  if (e.cnpj && vazio(atual.cnpj)) {
    mudanca.cnpj = e.cnpj.formatado;
    mudanca.normalized_cnpj = e.cnpj.normalizado;
  }
  if (Object.keys(mudanca).length === 0) return;
  let gravado = await deps.db.from("companies").update(mudanca).eq("organization_id", org).eq("id", empresaId);
  if (gravado.error?.code === "23505") {
    // O CNPJ já é de outra empresa: grava o resto, sem ele.
    const { cnpj: _c, normalized_cnpj: _n, ...semCnpj } = mudanca;
    gravado = Object.keys(semCnpj).length > 0
      ? await deps.db.from("companies").update(semCnpj).eq("organization_id", org).eq("id", empresaId)
      : gravado;
  }
  if (gravado.error && gravado.error.code !== "23505") throw new ErroDaLinha(gravado.error.message);
}

async function gravarNegocio(
  deps: DependenciasDaGravacao,
  ctx: HandlerCtx,
  imp: ImportacaoQueGrava,
  contatoId: string,
  n: PlanoDoNegocio,
): Promise<string> {
  const org = imp.organization_id;
  if (n.tipo === "atualizar") {
    const input: Record<string, unknown> = {};
    if (n.titulo && n.titulo.trim().length >= 2) input.title = n.titulo.trim().slice(0, 200);
    if (n.valorCentavos !== null) input.value_cents = n.valorCentavos;
    if (n.donoId) input.owner_user_id = n.donoId;
    if (Object.keys(n.campos).length > 0) input.custom_fields = { ...(await camposAtuais(deps, "crm_leads", org, n.id)), ...n.campos };
    if (Object.keys(input).length > 0) await deps.mudarNegocio(ctx, n.id, input);
    return n.id;
  }
  const titulo = n.titulo && n.titulo.trim().length >= 2 ? n.titulo.trim().slice(0, 200) : "Novo negócio";
  const criado = await deps.criarNegocio(ctx, {
    pipeline_id: n.origemId,
    stage_id: n.etapaId,
    title: titulo,
    contact_id: contatoId,
    value_cents: n.valorCentavos,
    owner_user_id: n.donoId,
    tags: [],
    source: ORIGEM_DA_PLANILHA,
    source_metadata: { importacao_id: imp.id },
    custom_fields: n.campos,
    via_planilha: true,
  });
  const id = String(criado.id);
  if (n.status !== "open") {
    await deps.encerrar(ctx, { leadId: id, desfecho: n.status, motivo: n.status === "lost" ? n.motivoDePerda : null });
  }
  if (n.status === "won" && n.ganhoEm) {
    await deps.db.from("crm_leads").update({ closed_at: `${n.ganhoEm}T12:00:00Z` }).eq("organization_id", org).eq("id", id);
  }
  return id;
}

export async function gravarPlano(
  deps: DependenciasDaGravacao,
  ctx: HandlerCtx,
  imp: ImportacaoQueGrava,
  plano: Plano,
): Promise<{ contatoId: string; negocioId: string | null }> {
  if (plano.negocio?.tipo === "criar" && plano.negocio.status === "won" && !imp.podeGanhar) {
    throw new ErroDaLinha("Só administrador importa negócio ganho.");
  }
  const contatoId = await gravarContato(deps, ctx, imp, plano.contato);
  if (plano.empresa) await gravarEmpresa(deps, imp, contatoId, plano.empresa);
  const negocioId = plano.negocio ? await gravarNegocio(deps, ctx, imp, contatoId, plano.negocio) : null;
  return { contatoId, negocioId };
}
