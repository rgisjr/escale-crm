import type { SupabaseClient } from "@supabase/supabase-js";

import type { Role } from "@/lib/auth/types";
import type { CanalDoRoteamento } from "@/lib/escale/conversas/canais";

import { podeApagarComentario, podeAtenderAConta } from "./acesso";
import { PLATAFORMAS_DE_COMENTARIO, type PlataformaDeComentario } from "./constantes";

/**
 * FORK ESCALE · Fase 10A (D7): as contas do Instagram/Facebook que a pessoa atende. Lê as mesmas
 * tabelas de roteamento de `loadChannelRoutingSettings` (`channel_routing_policies` e
 * `channel_routing_responsibles`, 0228), sem buscar o nome de todos os atendentes.
 */
export interface ContaDaCaixa {
  id: string;
  nome: string;
  plataforma: PlataformaDeComentario;
  /** O id da conta no Zernio. Nunca sai nas respostas das rotas. */
  contaId: string;
  conectada: boolean;
  podeApagar: boolean;
}

export type ContaDaCaixaComStatus = ContaDaCaixa & { status: string };

interface SessaoBruta {
  id: string;
  display_name: string | null;
  phone_number: string | null;
  zernio_account_id: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
}

const COLUNAS = "id, display_name, phone_number, zernio_account_id, status, metadata";

const plataformaDe = (s: SessaoBruta): PlataformaDeComentario | null => {
  const p = s.metadata?.social_platform;
  return typeof p === "string" && (PLATAFORMAS_DE_COMENTARIO as readonly string[]).includes(p)
    ? (p as PlataformaDeComentario)
    : null;
};

/** `canal` null = conta sem política (todos os atendentes). Política sem ninguém = `restricted_empty`. */
async function canaisDoRoteamento(
  admin: SupabaseClient,
  organizationId: string,
  sessoes: readonly string[],
): Promise<Map<string, CanalDoRoteamento>> {
  const canais = new Map<string, CanalDoRoteamento>();
  if (sessoes.length === 0) return canais;
  const { data: politicas, error } = await admin
    .from("channel_routing_policies")
    .select("id, channel_session_id")
    .eq("organization_id", organizationId)
    .in("channel_session_id", [...sessoes]);
  if (error) throw new Error(error.message);
  const lista = (politicas ?? []) as Array<{ id: string; channel_session_id: string }>;
  if (lista.length === 0) return canais;
  const { data: responsaveis, error: erroDosResponsaveis } = await admin
    .from("channel_routing_responsibles")
    .select("policy_id, user_id")
    .eq("organization_id", organizationId)
    .in("policy_id", lista.map((p) => p.id));
  if (erroDosResponsaveis) throw new Error(erroDosResponsaveis.message);
  const porPolitica = (responsaveis ?? []) as Array<{ policy_id: string; user_id: string }>;
  for (const p of lista) {
    const user_ids = porPolitica.filter((r) => r.policy_id === p.id).map((r) => r.user_id);
    canais.set(p.channel_session_id, {
      id: p.channel_session_id,
      user_ids,
      mode: user_ids.length > 0 ? "restricted" : "restricted_empty",
    });
  }
  return canais;
}

function montarConta(s: SessaoBruta, plataforma: PlataformaDeComentario, papel: Role): ContaDaCaixaComStatus {
  return {
    id: s.id,
    nome: s.display_name ?? s.phone_number ?? plataforma,
    plataforma,
    contaId: s.zernio_account_id ?? "",
    conectada: s.status === "WORKING",
    podeApagar: podeApagarComentario(papel),
    status: s.status,
  };
}

async function sessoesSociais(admin: SupabaseClient, organizationId: string, canal?: string): Promise<SessaoBruta[]> {
  let consulta = admin
    .from("channel_sessions")
    .select(COLUNAS)
    .eq("organization_id", organizationId)
    .eq("provider", "zernio_social")
    .is("archived_at", null);
  if (canal) consulta = consulta.eq("id", canal);
  const { data, error } = await consulta.order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as SessaoBruta[];
}

/** As contas instagram/facebook (`zernio_social`, não arquivadas) que a pessoa atende (D7). */
export async function contasDaCaixa(
  admin: SupabaseClient,
  e: { organizationId: string; userId: string; papel: Role },
): Promise<ContaDaCaixa[]> {
  const sessoes = (await sessoesSociais(admin, e.organizationId)).flatMap((s) => {
    const plataforma = plataformaDe(s);
    return plataforma ? [{ s, plataforma }] : [];
  });
  const canais = await canaisDoRoteamento(admin, e.organizationId, sessoes.map(({ s }) => s.id));
  return sessoes
    .filter(({ s }) => podeAtenderAConta({ papel: e.papel, userId: e.userId, canal: canais.get(s.id) ?? null }))
    .map(({ s, plataforma }) => {
      const { status: _status, ...conta } = montarConta(s, plataforma, e.papel);
      return conta;
    });
}

/** Uma conta só, ou null quando não existe ou a pessoa não atende (as rotas devolvem 404, sem dizer qual). */
export async function contaDaCaixa(
  admin: SupabaseClient,
  e: { organizationId: string; userId: string; papel: Role; canal: string },
): Promise<ContaDaCaixaComStatus | null> {
  const [sessao] = await sessoesSociais(admin, e.organizationId, e.canal);
  const plataforma = sessao ? plataformaDe(sessao) : null;
  if (!sessao || !plataforma) return null;
  const canais = await canaisDoRoteamento(admin, e.organizationId, [sessao.id]);
  if (!podeAtenderAConta({ papel: e.papel, userId: e.userId, canal: canais.get(sessao.id) ?? null })) return null;
  return montarConta(sessao, plataforma, e.papel);
}
