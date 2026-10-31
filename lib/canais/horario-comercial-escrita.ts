import type { SupabaseClient } from "@supabase/supabase-js";

import { audit } from "@/lib/audit";
import { validarFaixas, type FaixaComercial } from "@/lib/canais/horario-comercial";

/**
 * Troca TODA a grade de horário comercial de um número pela informada (grade vazia = sem restrição).
 * `organizationId` vem de fonte confiável. Valida antes de tocar o banco; o canal tem de ser da organização.
 */
export async function gravarHorarioComercial(
  admin: SupabaseClient,
  entrada: {
    organizationId: string;
    channelSessionId: string;
    faixas: readonly FaixaComercial[];
    requestId: string;
    actorUserId: string | null;
  },
): Promise<void> {
  const validacao = validarFaixas(entrada.faixas);
  if (!validacao.ok) throw new Error(validacao.motivo);

  const { data: canal, error: erroDoCanal } = await admin
    .from("channel_sessions")
    .select("id")
    .eq("organization_id", entrada.organizationId)
    .eq("id", entrada.channelSessionId)
    .maybeSingle();
  if (erroDoCanal) throw new Error(erroDoCanal.message);
  if (!canal) throw new Error("canal_nao_encontrado");

  const { error: erroAoLimpar } = await admin
    .from("channel_business_hours")
    .delete()
    .eq("organization_id", entrada.organizationId)
    .eq("channel_session_id", entrada.channelSessionId);
  if (erroAoLimpar) throw new Error(erroAoLimpar.message);

  if (entrada.faixas.length > 0) {
    const { error } = await admin.from("channel_business_hours").insert(
      entrada.faixas.map((f) => ({
        organization_id: entrada.organizationId,
        channel_session_id: entrada.channelSessionId,
        dia_da_semana: f.diaDaSemana,
        inicio_min: f.inicioMin,
        fim_min: f.fimMin,
      })),
    );
    if (error) throw new Error(error.message);
  }

  void audit({
    action: "channel_business_hours.updated",
    actorUserId: entrada.actorUserId,
    organizationId: entrada.organizationId,
    resourceType: "channel_session",
    resourceId: entrada.channelSessionId,
    requestId: entrada.requestId,
    metadata: { faixas: entrada.faixas.length },
  });
}
