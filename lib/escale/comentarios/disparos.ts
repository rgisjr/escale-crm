import type { SupabaseClient } from "@supabase/supabase-js";

import { zernioCredsForAccountId } from "@/lib/channels/zernio/credentials";
import type { EventRow } from "@/lib/event-log/dispatcher";
import { logger } from "@/lib/logger";

import { caminhoDoComentario, comentarioDoEvento, sortearVariacao } from "./caminhos";
import { PASSO_DO_INSTAGRAM } from "./constantes";
import { configDoComentarioSchema } from "./schema";
import { colunasDaPublicacao } from "./origem";
import { motivoDoErro, responderComentario } from "./zernio";

/**
 * FORK ESCALE · Fase 10B: o disparo de um comentário. O motor "reivindica" o disparo antes das ações
 * (o índice único do banco garante uma vez por comentário e por pessoa em cada regra), e ao fim da
 * execução este arquivo fecha a linha com o desfecho do direct e da resposta pública.
 */
const TABELA = "escale_disparos_de_comentario";
const INDICE_DA_PESSOA = "uq_escale_disparos_de_comentario_pessoa";
const INDICE_DO_COMENTARIO = "uq_escale_disparos_de_comentario_comentario";
const VIOLACAO_DE_UNICIDADE = "23505";

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
}

type ErroDoBanco = { code?: string; message?: string } | null;

/**
 * Insere um disparo por regra e devolve só as regras que ganharam a corrida. Reentrega do webhook
 * (mesmo comentário) sai sem rodar; pessoa que já recebeu a automação vira uma linha `repetido`
 * (nada roda). Outro erro do banco lança: o motor repete o evento depois.
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
    };
    const { error } = (await admin.from(TABELA).insert(linha)) as { error: ErroDoBanco };
    if (!error) {
      ficam.push(regra);
      continue;
    }
    if (error.code !== VIOLACAO_DE_UNICIDADE) {
      throw new Error(`disparo_de_comentario_falhou: ${error.code ?? "sem_codigo"} ${error.message ?? ""}`.trim());
    }
    if (error.message?.includes(INDICE_DA_PESSOA)) {
      const { error: erroDoRepetido } = (await admin.from(TABELA).insert({
        ...linha,
        repetido: true,
        direct: "pulado",
        resposta: "pulada",
        motivo: "ja_recebeu",
      })) as { error: ErroDoBanco };
      if (erroDoRepetido && erroDoRepetido.code !== VIOLACAO_DE_UNICIDADE) {
        throw new Error(`disparo_repetido_falhou: ${erroDoRepetido.code ?? "sem_codigo"}`);
      }
    } else if (!error.message?.includes(INDICE_DO_COMENTARIO)) {
      logger.warn("[comentarios.disparos] unicidade em índice desconhecido", { mensagem: error.message });
    }
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
    .select("id, caminho_id, direct, resposta, repetido, motivo")
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
    const { error } = (await admin
      .from(TABELA)
      .update({
        ...(e.runId ? { run_id: e.runId } : {}),
        ...(temPasso ? {} : { direct: "sem_passo" }),
        ...desfecho,
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
