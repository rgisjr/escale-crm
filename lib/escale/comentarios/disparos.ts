import type { SupabaseClient } from "@supabase/supabase-js";

import { zernioCredsForAccountId } from "@/lib/channels/zernio/credentials";
import type { EventRow } from "@/lib/event-log/dispatcher";
import { logger } from "@/lib/logger";

import { caminhoDoComentario, comentarioDoEvento, sortearVariacao } from "./caminhos";
import { PASSO_DO_INSTAGRAM } from "./constantes";
import { configDoComentarioSchema } from "./schema";
import { colunasDaPublicacao } from "./origem";
import { decisaoDoPublico } from "./publico";
import { curtirComentario, motivoDoErro, ocultarComentario, responderComentario } from "./zernio";

/**
 * FORK ESCALE · Fase 10B: o disparo de um comentário. O motor "reivindica" o disparo antes das ações
 * (a função `fn_escale_reivindicar_disparo` garante uma vez por comentário e, por regra, uma vez por
 * pessoa ou de novo depois de N horas — 10D), e ao fim da execução este arquivo fecha a linha com o
 * desfecho do direct, da resposta pública e das ações no comentário (ocultar, curtir).
 */
const TABELA = "escale_disparos_de_comentario";

interface RegraDoMotor {
  id: string;
  name: string;
  actions: Array<{ type: string; config?: Record<string, unknown> }>;
  trigger_config?: Record<string, unknown> | null;
}

export interface DisparoDeComentario {
  id: string;
  caminho_id: string;
  direct: string;
  resposta: string;
  repetido: boolean;
  motivo: string | null;
  ocultar: string;
  curtir: string;
}

type ErroDoBanco = { code?: string; message?: string } | null;

/**
 * Reivindica um disparo por regra (RPC) e devolve só as regras que ganharam. Reentrega do webhook
 * (mesmo comentário) sai sem rodar; pessoa que já recebeu (ou ainda está no intervalo) vira uma linha
 * `repetido`; fora do público grava `fora_do_publico` e não roda. Outro erro lança: o motor repete.
 */
export async function reivindicarDisparos<R extends RegraDoMotor>(
  admin: SupabaseClient,
  row: EventRow,
  regras: readonly R[],
): Promise<R[]> {
  const evento = comentarioDoEvento(row.payload);
  if (!evento) return [];
  const { comentario } = evento;
  const ficam: R[] = [];

  for (const regra of regras) {
    const caminho = caminhoDoComentario(regra.trigger_config, row.payload);
    if (!caminho) continue;
    const config = configDoComentarioSchema.parse(regra.trigger_config);
    const decisao = decisaoDoPublico(config.publico ?? null, evento.plataforma, comentario.autor.seguidor);
    const foraDoPublico = decisao === "fora_do_publico";
    const linha = {
      organization_id: row.organization_id,
      rule_id: regra.id,
      channel_session_id: evento.channel_session_id,
      event_id: row.id,
      contact_id: evento.contact_id,
      caminho_id: caminho.id,
      plataforma: evento.plataforma,
      comentario_id: comentario.id,
      publicacao_id: comentario.publicacao_id,
      autor_id: comentario.autor.id,
      autor_usuario: comentario.autor.usuario,
      autor_nome: comentario.autor.nome,
      texto: comentario.texto.slice(0, 5000),
      comentado_em: comentario.comentado_em,
      ...colunasDaPublicacao(evento.publicacao),
      ...(foraDoPublico ? { direct: "fora_do_publico", motivo: "fora_do_publico" } : {}),
      ocultar: !foraDoPublico && caminho.ocultar_depois ? "pendente" : "nao_pedido",
      curtir: !foraDoPublico && caminho.curtir && evento.plataforma === "facebook" ? "pendente" : "nao_pedido",
    };
    const repeticao = config.repeticao ?? { modo: "uma_vez" as const };
    const { data, error } = (await admin.rpc("fn_escale_reivindicar_disparo", {
      p_linha: linha,
      p_intervalo_horas: repeticao.modo === "intervalo" ? repeticao.horas : null,
    })) as { data: string | null; error: ErroDoBanco };
    if (error) {
      throw new Error(`disparo_de_comentario_falhou: ${error.code ?? "sem_codigo"} ${error.message ?? ""}`.trim());
    }
    if (data !== "novo") continue;
    if (foraDoPublico) {
      await admin
        .from(TABELA)
        .update({ resposta: "pulada", updated_at: new Date().toISOString() })
        .eq("organization_id", row.organization_id)
        .eq("rule_id", regra.id)
        .eq("comentario_id", comentario.id);
      continue;
    }
    ficam.push(regra);
  }
  return ficam;
}

export async function disparoDaRegra(
  admin: SupabaseClient,
  organizationId: string,
  ruleId: string,
  comentarioId: string,
): Promise<DisparoDeComentario | null> {
  const { data } = await admin
    .from(TABELA)
    .select("id, caminho_id, direct, resposta, repetido, motivo, ocultar, curtir")
    .eq("organization_id", organizationId)
    .eq("rule_id", ruleId)
    .eq("comentario_id", comentarioId)
    .maybeSingle();
  return (data as DisparoDeComentario | null) ?? null;
}

type Desfecho = { resposta: string; resposta_publicada?: string; motivo?: string };

/** D8: a resposta pública sai no fim, só se o direct saiu (ou se a automação não tem passo Instagram). */
async function publicarResposta(
  admin: SupabaseClient,
  e: { row: EventRow; rule: RegraDoMotor },
  disparo: DisparoDeComentario,
  temPasso: boolean,
): Promise<Desfecho> {
  const evento = comentarioDoEvento(e.row.payload);
  const config = configDoComentarioSchema.safeParse(e.rule.trigger_config);
  const caminho = config.success ? config.data.caminhos.find((c) => c.id === disparo.caminho_id) : undefined;
  if (!evento || !caminho?.resposta) return { resposta: "sem_resposta" };
  if (disparo.direct === "aguardando_seguir") return { resposta: "pendente" };
  if (temPasso && disparo.direct !== "enviado") return { resposta: "pulada" };

  const texto = sortearVariacao(caminho.resposta.variacoes);
  if (!texto) return { resposta: "sem_resposta" };
  const credencial = await zernioCredsForAccountId(admin, {
    organizationId: e.row.organization_id,
    accountId: evento.conta_id,
  });
  if (!credencial) return { resposta: "falhou", motivo: disparo.motivo ?? "credencial_indisponivel" };

  const { comentario } = evento;
  const enviada = await responderComentario(credencial.apiKey, {
    postId: comentario.publicacao_zernio_id ?? comentario.publicacao_id,
    commentId: comentario.id,
    accountId: evento.conta_id,
    texto,
    idempotencia: disparo.id,
  });
  if (enviada.ok) return { resposta: "publicada", resposta_publicada: texto };
  return { resposta: "falhou", motivo: disparo.motivo ?? motivoDoErro(enviada.status, enviada.corpo) };
}

type PatchDeAcoes = { ocultar?: string; curtir?: string };

/**
 * D14: ocultar e curtir o comentário. Falha só vira estado `falhou` (o motivo do direct não muda).
 * `curtir` só roda no Facebook (o Instagram está em liberação restrita no Zernio).
 */
export async function acoesNoComentario(
  chave: string,
  e: {
    disparo: Pick<DisparoDeComentario, "ocultar" | "curtir">;
    plataforma: string;
    postId: string;
    commentId: string;
    accountId: string;
  },
): Promise<PatchDeAcoes> {
  const alvo = { postId: e.postId, commentId: e.commentId, accountId: e.accountId };
  const patch: PatchDeAcoes = {};
  if (e.disparo.ocultar === "pendente") {
    patch.ocultar = (await ocultarComentario(chave, alvo)).ok ? "feito" : "falhou";
  }
  if (e.disparo.curtir === "pendente" && e.plataforma === "facebook") {
    patch.curtir = (await curtirComentario(chave, alvo)).ok ? "feito" : "falhou";
  }
  return patch;
}

async function acoesDoEvento(admin: SupabaseClient, row: EventRow, disparo: DisparoDeComentario): Promise<PatchDeAcoes> {
  if (disparo.ocultar !== "pendente" && disparo.curtir !== "pendente") return {};
  const evento = comentarioDoEvento(row.payload);
  if (!evento) return {};
  const credencial = await zernioCredsForAccountId(admin, {
    organizationId: row.organization_id,
    accountId: evento.conta_id,
  });
  if (!credencial) {
    return {
      ...(disparo.ocultar === "pendente" ? { ocultar: "falhou" } : {}),
      ...(disparo.curtir === "pendente" ? { curtir: "falhou" } : {}),
    };
  }
  return acoesNoComentario(credencial.apiKey, {
    disparo,
    plataforma: evento.plataforma,
    postId: evento.comentario.publicacao_zernio_id ?? evento.comentario.publicacao_id,
    commentId: evento.comentario.id,
    accountId: evento.conta_id,
  });
}

/** Fim da execução: run_id, "sem_passo" quando não há passo Instagram, e a resposta pública. Nunca lança. */
export async function concluirDisparo(
  admin: SupabaseClient,
  e: { row: EventRow; rule: RegraDoMotor; runId: string | null },
): Promise<void> {
  try {
    const evento = comentarioDoEvento(e.row.payload);
    if (!evento) return;
    const disparo = await disparoDaRegra(admin, e.row.organization_id, e.rule.id, evento.comentario.id);
    if (!disparo) return;
    const temPasso = e.rule.actions.some((a) => a.type === PASSO_DO_INSTAGRAM);
    const desfecho = await publicarResposta(admin, e, disparo, temPasso);
    // D13/D14: com "Siga para liberar" pendente, as ações esperam o toque; senão saem só se o direct saiu.
    const acoes: PatchDeAcoes =
      disparo.direct === "aguardando_seguir" || (temPasso && disparo.direct !== "enviado")
        ? {}
        : await acoesDoEvento(admin, e.row, disparo);
    const { error } = (await admin
      .from(TABELA)
      .update({
        ...(e.runId ? { run_id: e.runId } : {}),
        ...(temPasso ? {} : { direct: "sem_passo" }),
        ...desfecho,
        ...acoes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", disparo.id)) as { error: ErroDoBanco };
    if (error) logger.error("[comentarios.disparos] fechar disparo falhou", { erro: error.message });
  } catch (erro) {
    logger.error("[comentarios.disparos] concluir disparo falhou", {
      erro: erro instanceof Error ? erro.message : String(erro),
    });
  }
}
