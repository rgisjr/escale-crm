import type { SupabaseClient } from "@supabase/supabase-js";

import {
  agendarAcao,
  iniciarAcao,
  prepararAcao,
  type CampanhaCarregada,
  type Desfecho,
} from "@/lib/campanhas/acoes";
import { gravarPool, lerPoolExtra } from "@/lib/campanhas/pool-de-numeros";

import { NOME_MAX, publicoSchema } from "./assistente";
import { publicoVazio } from "./publico";

/**
 * AS AÇÕES DO ASSISTENTE (fork Escale, Fase 8B; N14, N16, N17). Preparar e
 * enviar usam as ações do original (a máquina de estados, o compare-and-set e
 * os vetos são os mesmos); duplicar copia também o que a casca guarda.
 */
export interface MotivoFora {
  motivo: string;
  quantidade: number;
}
export interface ResumoDaPreparacao {
  total: number;
  elegiveis: number;
  excluidos: number;
  motivos: MotivoFora[];
}

export async function foraDaLista(
  db: SupabaseClient,
  org: string,
  id: string,
): Promise<MotivoFora[]> {
  const { data, error } = await db.rpc("fn_escale_fora_da_lista", { p_org: org, p_campanha: id });
  if (error) throw new Error(`fora da lista: ${error.message}`);
  return ((data ?? []) as Array<{ motivo: string; quantidade: number | string }>).map((m) => ({
    motivo: m.motivo,
    quantidade: Number(m.quantidade),
  }));
}

export async function prepararDoAssistente(
  admin: SupabaseClient,
  c: CampanhaCarregada,
  agora: Date,
): Promise<Desfecho<{ resumo: ResumoDaPreparacao }>> {
  const publico = publicoSchema.safeParse(c.escale_publico);
  if (!publico.success || publicoVazio(publico.data)) {
    return {
      ok: false,
      codigo: "campanha_sem_audiencia",
      mensagem: "Você deve selecionar pelo menos um contato.",
      status: 422,
    };
  }
  const r = await prepararAcao(admin, c, agora);
  if (!r.ok) return r;
  return {
    ok: true,
    resumo: { ...r.resumo, motivos: await foraDaLista(admin, c.organization_id, c.id) },
  };
}

export async function enviarDoAssistente(
  admin: SupabaseClient,
  c: CampanhaCarregada,
  agora: Date,
): Promise<Desfecho<{ modo: "iniciada" | "agendada"; quando: string | null }>> {
  if (c.status !== "ready") {
    return {
      ok: false,
      codigo: "campanha_estado_invalido",
      mensagem: "Prepare a campanha antes de enviar.",
      status: 409,
    };
  }
  if (c.escale_quando) {
    const quando = new Date(c.escale_quando);
    if (Number.isNaN(quando.getTime()) || quando.getTime() <= agora.getTime()) {
      return {
        ok: false,
        codigo: "campanha_agenda_invalida",
        mensagem: "A hora selecionada não pode ser menor que o horário atual.",
        status: 422,
      };
    }
    const r = await agendarAcao(admin, c, quando, agora);
    if (!r.ok) return r;
    return { ok: true, modo: "agendada", quando: quando.toISOString() };
  }
  const r = await iniciarAcao(admin, c, agora);
  if (!r.ok) return r;
  return { ok: true, modo: "iniciada", quando: null };
}

const SUFIXO_DA_COPIA = " Cópia";
export const nomeDaCopia = (nome: string): string =>
  `${nome.slice(0, NOME_MAX - SUFIXO_DA_COPIA.length).trimEnd()}${SUFIXO_DA_COPIA}`;

const COLUNAS_DA_COPIA =
  "name, description, channel_session_id, message_body, base_legal, lia_ref, audience_filter, " +
  "intervalo_segundos, janela_inicio_hora, janela_fim_hora, teto_diario, teto_horario, " +
  "pipeline_id, stage_id, agent_id, escale_mensagem, escale_publico, escale_pos_envio, escale_quando";

/** A cópia é uma intenção nova: nada de destinatário, resultado ou carimbo de execução. */
export async function duplicarDoAssistente(
  admin: SupabaseClient,
  c: CampanhaCarregada,
  autorId: string,
): Promise<Desfecho<{ id: string }>> {
  const { data: origem, error: erroOrigem } = await admin
    .from("campaigns")
    .select(COLUNAS_DA_COPIA)
    .eq("organization_id", c.organization_id)
    .eq("id", c.id)
    .maybeSingle();
  if (erroOrigem || !origem) {
    return {
      ok: false,
      codigo: "campanha_nao_encontrada",
      mensagem: "Campanha não encontrada.",
      status: 404,
    };
  }
  const linha = origem as unknown as Record<string, unknown> & {
    name: string;
    channel_session_id: string;
  };
  const { data, error } = await admin
    .from("campaigns")
    .insert({
      ...linha,
      organization_id: c.organization_id,
      name: nomeDaCopia(linha.name),
      created_by: autorId,
    })
    .select("id")
    .single();
  if (error || !data) {
    return {
      ok: false,
      codigo: "campanha_estado_invalido",
      mensagem: "Não foi possível duplicar a campanha. Tente novamente.",
      status: 422,
    };
  }
  const id = (data as { id: string }).id;
  const extras = await lerPoolExtra(admin, c.organization_id, c.id);
  if (extras.length > 0) {
    await gravarPool(admin, {
      organizationId: c.organization_id,
      campanhaId: id,
      principal: linha.channel_session_id,
      extras,
    });
  }
  return { ok: true, id };
}
