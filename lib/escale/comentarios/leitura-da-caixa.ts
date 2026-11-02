import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

import { estadoDoDirect, inicioDoPeriodo, semResposta, type ComentarioDaCaixa, type PublicacaoDaCaixa } from "./caixa";
import type { ContaDaCaixa } from "./contas-da-caixa";
import type { OrdemDaCaixa, PeriodoDaCaixa } from "./constantes";
import type { RespostaDoZernio } from "./zernio";
import {
  listarComentarios,
  listarPublicacoesComComentarios,
  type ComentarioDoZernio,
  type PaginaDoZernio,
} from "./zernio-caixa";

/**
 * FORK ESCALE · Fase 10A: a leitura da caixa. O comentário vem do Zernio (não se guarda, PRD 7); do banco
 * vêm só os extras: o que o CRM já respondeu, os directs já usados e quem já é contato.
 */
export function publicacoesDaCaixa(
  _admin: SupabaseClient,
  e: { conta: ContaDaCaixa; chave: string; cursor: string | null; periodo: PeriodoDaCaixa; ordem: OrdemDaCaixa; agora?: Date },
): Promise<RespostaDoZernio<PaginaDoZernio<PublicacaoDaCaixa>>> {
  return listarPublicacoesComComentarios(e.chave, {
    accountId: e.conta.contaId,
    cursor: e.cursor,
    desde: inicioDoPeriodo(e.periodo, e.agora ?? new Date()),
    ordem: e.ordem,
  });
}

interface Extras {
  /** Ids com resposta `feito` do CRM. */
  respondidos: Set<string>;
  /** Ids com direct já usado (ações + disparos). */
  usados: Set<string>;
  /** `autor_id` → contato (identidade primeiro, disparo depois). */
  contatos: Map<string, { id: string; nome: string }>;
}

const vazio = (): Extras => ({ respondidos: new Set(), usados: new Set(), contatos: new Map() });

const todosOsComentarios = (lista: readonly ComentarioDoZernio[]): ComentarioDoZernio[] =>
  lista.flatMap((c) => [c, ...c.respostas]);

async function lerExtras(
  admin: SupabaseClient,
  e: { organizationId: string; conta: ContaDaCaixa; comentarios: readonly ComentarioDoZernio[] },
): Promise<Extras> {
  const todos = todosOsComentarios(e.comentarios);
  const ids = todos.map((c) => c.id);
  const autores = [...new Set(todos.filter((c) => !c.autor.daPropriaConta).map((c) => c.autor.id))];
  const extras = vazio();
  if (ids.length === 0) return extras;

  const identidade = (autor: string): string => `${e.conta.plataforma}:${e.conta.contaId}:${autor}`;
  const [acoes, disparosDosComentarios, disparosDosAutores, contatos] = await Promise.all([
    admin
      .from("escale_acoes_no_comentario")
      .select("comentario_id, acao, status, motivo")
      .eq("organization_id", e.organizationId)
      .in("comentario_id", ids)
      .in("acao", ["resposta", "direct"]),
    admin
      .from("escale_disparos_de_comentario")
      .select("comentario_id, direct")
      .eq("organization_id", e.organizationId)
      .in("comentario_id", ids)
      .eq("direct", "enviado"),
    autores.length === 0
      ? Promise.resolve({ data: [], error: null })
      : admin
          .from("escale_disparos_de_comentario")
          .select("autor_id, contact_id")
          .eq("organization_id", e.organizationId)
          .eq("plataforma", e.conta.plataforma)
          .in("autor_id", autores)
          .not("contact_id", "is", null),
    autores.length === 0
      ? Promise.resolve({ data: [], error: null })
      : admin
          .from("contacts")
          .select("id, name, social_identity")
          .eq("organization_id", e.organizationId)
          .in("social_identity", autores.map(identidade))
          .is("is_merged_into", null),
  ]);
  for (const r of [acoes, disparosDosComentarios, disparosDosAutores, contatos]) {
    if (r.error) throw new Error(r.error.message);
  }

  for (const a of (acoes.data ?? []) as Array<{ comentario_id: string; acao: string; status: string; motivo: string | null }>) {
    if (a.acao === "resposta" && a.status === "feito") extras.respondidos.add(a.comentario_id);
    if (
      a.acao === "direct" &&
      (a.status === "enviando" || a.status === "feito" || (a.status === "falhou" && a.motivo === "resposta_privada_ja_usada"))
    ) {
      extras.usados.add(a.comentario_id);
    }
  }
  for (const d of (disparosDosComentarios.data ?? []) as Array<{ comentario_id: string }>) extras.usados.add(d.comentario_id);

  const idsDosDisparos = [
    ...new Set(((disparosDosAutores.data ?? []) as Array<{ contact_id: string }>).map((d) => d.contact_id)),
  ];
  const nomesDosDisparos = new Map<string, string>();
  if (idsDosDisparos.length > 0) {
    const { data, error } = await admin
      .from("contacts")
      .select("id, name")
      .eq("organization_id", e.organizationId)
      .in("id", idsDosDisparos)
      .is("is_merged_into", null);
    if (error) throw new Error(error.message);
    for (const c of (data ?? []) as Array<{ id: string; name: string | null }>) nomesDosDisparos.set(c.id, c.name ?? "");
  }
  for (const d of (disparosDosAutores.data ?? []) as Array<{ autor_id: string; contact_id: string }>) {
    const nome = nomesDosDisparos.get(d.contact_id);
    if (nome !== undefined) extras.contatos.set(d.autor_id, { id: d.contact_id, nome: nome || "Sem nome" });
  }
  // A identidade vale mais que o disparo (D14): sobrescreve.
  for (const c of (contatos.data ?? []) as Array<{ id: string; name: string | null; social_identity: string }>) {
    const autor = c.social_identity.split(":").slice(2).join(":");
    extras.contatos.set(autor, { id: c.id, nome: c.name ?? "Sem nome" });
  }
  return extras;
}

function montar(c: ComentarioDoZernio, extras: Extras, conta: ContaDaCaixa, agora: Date): ComentarioDaCaixa {
  const respostas = c.respostas.map((r) => montar(r, extras, conta, agora));
  const base = { ...c, respostas };
  return {
    ...base,
    respondido: !semResposta(base, extras.respondidos) && !c.autor.daPropriaConta,
    contato: c.autor.daPropriaConta ? null : (extras.contatos.get(c.autor.id) ?? null),
    direct: estadoDoDirect({ comentario: c, usados: extras.usados, contaConectada: conta.conectada, agora }),
  };
}

export async function comentariosDaCaixa(
  admin: SupabaseClient,
  e: {
    organizationId: string;
    conta: ContaDaCaixa;
    chave: string;
    publicacaoId: string;
    cursor: string | null;
    agora: Date;
  },
): Promise<RespostaDoZernio<PaginaDoZernio<ComentarioDaCaixa>>> {
  const r = await listarComentarios(e.chave, { accountId: e.conta.contaId, postId: e.publicacaoId, cursor: e.cursor });
  if (!r.ok) return r;
  let extras = vazio();
  try {
    extras = await lerExtras(admin, { organizationId: e.organizationId, conta: e.conta, comentarios: r.dados.itens });
  } catch (erro) {
    // A lista do Zernio ainda aparece, sem "já é contato" e com o direct calculado só pelo prazo.
    logger.error("[comentarios.caixa] extras do banco falharam", {
      erro: erro instanceof Error ? erro.message : String(erro),
    });
  }
  return { ok: true, dados: { itens: r.dados.itens.map((c) => montar(c, extras, e.conta, e.agora)), proximo: r.dados.proximo } };
}
