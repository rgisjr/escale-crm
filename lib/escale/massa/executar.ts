import type { SupabaseClient } from "@supabase/supabase-js";

import type { HandlerCtx } from "@/lib/api/handlers/types";
import { ApiError } from "@/lib/api/types";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import type { EventRow, HandlerResult } from "@/lib/event-log/dispatcher";

import {
  COLUNAS_EXPORTADAS,
  csvDeContatos,
  linhaDoCsv,
  nomeDoArquivoDeContatos,
  type ContatoExportado,
} from "./csv-de-contatos";
import { BUCKET_DAS_EXPORTACOES, type AcaoEmMassa } from "./tipos";

/**
 * O CONSUMIDOR DAS AÇÕES EM MASSA (fork Escale, Fase 2B; migration 9103). Roda
 * no worker com o service role, mas só sobre os contatos que a função
 * `fn_escale_criar_acao_em_massa` resolveu com a RLS de quem pediu. Cada contato
 * passa pela MESMA rotina da tela (criar negócio, PATCH do contato, e excluir
 * com os negócios, `excluirContatoComNegocios`, Q5), para o original continuar
 * valendo: eventos, auditoria, trava da Agenda. Só a fila anda: ação em preparo,
 * aguardando aprovação ou recusada é pulada (ninguém exporta sem aprovação, nem
 * emitindo o evento à mão).
 *
 * - 100 por lote; 20 s por rodada; acabou o tempo, `retry` e continua depois.
 * - O lote é marcado como feito ANTES de agir: no máximo uma vez (criar negócio
 *   não duplica se o worker cair no meio).
 * - Exportar lê tudo, monta o CSV e guarda no bucket privado por 24 h.
 */
export const CONSUMIDOR_DA_ACAO_EM_MASSA = "escale-acao-em-massa.v1";
export const LOTE = 100;
const LOTE_DA_EXPORTACAO = 200;
export const ORCAMENTO_MS = 20_000;
export const ERROS_GUARDADOS = 50;
export const VALIDADE_DO_ARQUIVO_MS = 24 * 60 * 60 * 1000;
const TENTATIVAS_ANTES_DE_DESISTIR = 4;
const TAGS_DO_CONTATO_MAX = 20;
const MOTIVO_DA_AGENDA = "Contato com compromisso na agenda não é excluído";

type Ctx = HandlerCtx;
export type Dependencias = {
  db: SupabaseClient;
  agora: () => number;
  criarNegocio: (ctx: Ctx, input: Record<string, unknown>) => Promise<unknown>;
  mudarContato: (
    ctx: Ctx,
    id: string,
    input: { tags?: string[]; custom_fields?: Record<string, unknown> },
  ) => Promise<unknown>;
  excluirContato: (ctx: Ctx, id: string) => Promise<unknown>;
};

type Erro = { contato: string | null; motivo: string };
type Acao = {
  id: string;
  organization_id: string;
  user_id: string;
  acao: AcaoEmMassa;
  parametros: Record<string, unknown>;
  status: string;
  total: number;
  feitos: number;
  falhas: number;
  erros: Erro[];
};
type ContatoDoLote = {
  id: string;
  name?: string | null;
  display_name?: string | null;
  phone_number?: string | null;
  tags?: string[] | null;
  custom_fields?: Record<string, unknown> | null;
};

const resultado = (
  status: HandlerResult["status"],
  detail?: string,
  retry_at?: string,
): HandlerResult => ({
  consumer_key: CONSUMIDOR_DA_ACAO_EM_MASSA,
  status,
  ...(detail ? { detail } : {}),
  ...(retry_at ? { retry_at } : {}),
});

function motivoDaFalha(e: unknown): string {
  if (e instanceof ApiError && e.code === "state_conflict") return MOTIVO_DA_AGENDA;
  return e instanceof Error ? e.message : String(e);
}

const naoAchado = (e: unknown) => e instanceof ApiError && e.status === 404;

async function lerContatos(
  db: SupabaseClient,
  org: string,
  ids: string[],
): Promise<Map<string, ContatoDoLote>> {
  const { data, error } = await db
    .from("contacts")
    .select("id, name, display_name, phone_number, tags, custom_fields")
    .eq("organization_id", org)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as ContatoDoLote[]).map((c) => [c.id, c]));
}

async function agir(
  acao: Acao,
  ctx: Ctx,
  deps: Dependencias,
  id: string,
  c: ContatoDoLote | undefined,
) {
  const p = acao.parametros;
  if (acao.acao === "excluir") {
    if (!c) return;
    try {
      await deps.excluirContato(ctx, id);
    } catch (e) {
      if (!naoAchado(e)) throw e;
    }
    return;
  }
  if (!c) throw new Error("Contato não encontrado.");
  if (acao.acao === "criar_negocios") {
    const nome = nomeDoContato({
      name: c.name ?? null,
      display_name: c.display_name,
      phone_number: c.phone_number ?? null,
    });
    await deps.criarNegocio(ctx, {
      pipeline_id: p.pipeline_id,
      stage_id: p.stage_id,
      title: nome && nome.trim().length >= 2 ? nome.trim().slice(0, 200) : "Novo negócio",
      contact_id: id,
      owner_user_id: (p.owner_user_id as string | null | undefined) ?? null,
      value_cents: (p.valor_centavos as number | null | undefined) ?? null,
      tags: [],
      source: "manual",
      via_planilha: true,
    });
    return;
  }
  if (acao.acao === "alterar_campo" || acao.acao === "limpar_campo") {
    // Fase 2C: o PATCH do contato substitui `custom_fields`; vai o objeto inteiro, com a chave mexida.
    const chave = String(p.chave ?? "");
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(chave) || chave.startsWith("link_")) throw new Error("Campo inválido.");
    const campos = { ...(c.custom_fields ?? {}) };
    if (acao.acao === "alterar_campo") campos[chave] = p.valor;
    else delete campos[chave];
    await deps.mudarContato(ctx, id, { custom_fields: campos });
    return;
  }
  const tag = normalizarTags([String(p.tag ?? "")])[0];
  if (!tag) throw new Error("Tag inválida.");
  const atuais = normalizarTags(c.tags ?? []);
  if (acao.acao === "incluir_tag") {
    if (atuais.includes(tag)) return;
    if (atuais.length >= TAGS_DO_CONTATO_MAX) throw new Error("O contato já tem 20 tags.");
    await deps.mudarContato(ctx, id, { tags: [...atuais, tag] });
    return;
  }
  if (!atuais.includes(tag)) return;
  await deps.mudarContato(ctx, id, { tags: atuais.filter((x) => x !== tag) });
}

async function emLotes(acao: Acao, ctx: Ctx, deps: Dependencias): Promise<HandlerResult> {
  const inicio = deps.agora();
  let feitos = acao.feitos;
  let falhas = acao.falhas;
  const erros = [...acao.erros];
  while (deps.agora() - inicio < ORCAMENTO_MS) {
    const { data, error } = await deps.db
      .from("crm_acoes_em_massa_itens")
      .select("contact_id")
      .eq("acao_id", acao.id)
      .eq("feito", false)
      .order("posicao", { ascending: true })
      .limit(LOTE);
    if (error) throw new Error(error.message);
    const ids = ((data ?? []) as Array<{ contact_id: string }>).map((i) => i.contact_id);
    if (ids.length === 0) {
      const fim = await deps.db
        .from("crm_acoes_em_massa")
        .update({ status: "concluida", feitos, falhas, erros })
        .eq("id", acao.id);
      // Sem isso a ação ficava "processando" para sempre e a tela esperava sem fim.
      if (fim.error) throw new Error(fim.error.message);
      return resultado("ok");
    }
    // Lê antes de marcar: se a leitura cair, o lote continua pendente e a nova tentativa o refaz.
    const contatos = await lerContatos(deps.db, acao.organization_id, ids);
    const marcado = await deps.db
      .from("crm_acoes_em_massa_itens")
      .update({ feito: true })
      .eq("acao_id", acao.id)
      .in("contact_id", ids);
    if (marcado.error) throw new Error(marcado.error.message);
    for (const id of ids) {
      try {
        await agir(acao, ctx, deps, id, contatos.get(id));
        feitos += 1;
      } catch (e) {
        falhas += 1;
        if (erros.length < ERROS_GUARDADOS) erros.push({ contato: id, motivo: motivoDaFalha(e) });
      }
    }
    await deps.db.from("crm_acoes_em_massa").update({ feitos, falhas, erros }).eq("id", acao.id);
  }
  return resultado("retry", "orcamento", new Date(deps.agora() + 1000).toISOString());
}

/** Os arquivos vencidos da organização saem do bucket antes de cada exportação nova. */
async function apagarVencidos(org: string, deps: Dependencias) {
  const { data } = await deps.db
    .from("crm_acoes_em_massa")
    .select("id, arquivo")
    .eq("organization_id", org)
    .not("arquivo", "is", null)
    .lt("expira_em", new Date(deps.agora()).toISOString());
  const vencidos = (data ?? []) as Array<{ id: string; arquivo: string }>;
  if (vencidos.length === 0) return;
  await deps.db.storage.from(BUCKET_DAS_EXPORTACOES).remove(vencidos.map((v) => v.arquivo));
  await deps.db
    .from("crm_acoes_em_massa")
    .update({ arquivo: null })
    .in(
      "id",
      vencidos.map((v) => v.id),
    );
}

async function exportar(acao: Acao, deps: Dependencias): Promise<HandlerResult> {
  await apagarVencidos(acao.organization_id, deps);
  const fuso = await fusoDaOrganizacao(deps.db, acao.organization_id);
  const linhas: string[][] = [];
  let desde = 0;
  for (;;) {
    const { data, error } = await deps.db
      .from("crm_acoes_em_massa_itens")
      .select("contact_id, posicao")
      .eq("acao_id", acao.id)
      .gt("posicao", desde)
      .order("posicao", { ascending: true })
      .limit(LOTE_DA_EXPORTACAO);
    if (error) throw new Error(error.message);
    const itens = (data ?? []) as Array<{ contact_id: string; posicao: number }>;
    if (itens.length === 0) break;
    const lidos = await deps.db
      .from("contacts")
      .select(COLUNAS_EXPORTADAS)
      .eq("organization_id", acao.organization_id)
      .in(
        "id",
        itens.map((i) => i.contact_id),
      );
    if (lidos.error) throw new Error(lidos.error.message);
    const porId = new Map(
      ((lidos.data ?? []) as Array<ContatoExportado & { id: string }>).map((c) => [c.id, c]),
    );
    for (const i of itens) {
      const c = porId.get(i.contact_id);
      if (c) linhas.push(linhaDoCsv(c, fuso));
    }
    desde = itens[itens.length - 1]?.posicao ?? desde;
  }
  const caminho = `${acao.organization_id}/${acao.id}/${nomeDoArquivoDeContatos(deps.agora(), fuso)}`;
  const subida = await deps.db.storage
    .from(BUCKET_DAS_EXPORTACOES)
    .upload(caminho, new Blob([csvDeContatos(linhas)], { type: "text/csv" }), {
      upsert: true,
      contentType: "text/csv; charset=utf-8",
    });
  if (subida.error) throw new Error(subida.error.message);
  const fim = await deps.db
    .from("crm_acoes_em_massa")
    .update({
      status: "concluida",
      feitos: linhas.length,
      falhas: Math.max(0, acao.total - linhas.length),
      arquivo: caminho,
      expira_em: new Date(deps.agora() + VALIDADE_DO_ARQUIVO_MS).toISOString(),
    })
    .eq("id", acao.id);
  if (fim.error) throw new Error(fim.error.message);
  return resultado("ok");
}

export async function processarAcaoEmMassa(
  row: EventRow,
  deps: Dependencias,
): Promise<HandlerResult> {
  const acaoId = typeof row.payload?.acao_id === "string" ? row.payload.acao_id : null;
  if (!acaoId) return resultado("skipped", "sem_acao_id");
  const { data, error } = await deps.db
    .from("crm_acoes_em_massa")
    .select("id, organization_id, user_id, acao, parametros, status, total, feitos, falhas, erros")
    .eq("id", acaoId)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (error) return resultado("error", error.message);
  if (!data) return resultado("skipped", "acao_inexistente");
  const acao = data as Acao;
  if (acao.status === "concluida" || acao.status === "falhou")
    return resultado("ok", "ja_terminada");
  if (acao.status !== "na_fila" && acao.status !== "processando")
    return resultado("skipped", "fora_da_fila");
  if (acao.status !== "processando") {
    const inicio = await deps.db
      .from("crm_acoes_em_massa")
      .update({ status: "processando" })
      .eq("id", acao.id);
    if (inicio.error) return resultado("error", inicio.error.message);
  }
  const ctx: Ctx = {
    organization_id: acao.organization_id,
    actor: { type: "user", id: acao.user_id },
    requestId: acao.id,
  };
  try {
    return acao.acao === "exportar" ? await exportar(acao, deps) : await emLotes(acao, ctx, deps);
  } catch (e) {
    const motivo = motivoDaFalha(e);
    if (row.attempts >= TENTATIVAS_ANTES_DE_DESISTIR) {
      await deps.db
        .from("crm_acoes_em_massa")
        .update({
          status: "falhou",
          erros: [...acao.erros, { contato: null, motivo }].slice(-ERROS_GUARDADOS),
        })
        .eq("id", acao.id);
      return resultado("ok", "falhou");
    }
    return resultado("error", motivo);
  }
}
