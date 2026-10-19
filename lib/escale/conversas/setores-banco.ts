import type { SupabaseClient } from "@supabase/supabase-js";

import type { SetorLido } from "./setores";

/**
 * LEITURAS E ESCRITAS DOS SETORES (fork Escale, Fase 3C). Tudo pela SESSÃO:
 * a RLS da 9203 decide quem escreve (fn_crm_pode 'CHAT_EDIT_TEAMS') e o que a
 * pessoa vê (o setor das conversas que ela lê).
 */
export async function listarSetores(supabase: SupabaseClient, orgId: string): Promise<SetorLido[]> {
  const [setores, membros, dispositivos] = await Promise.all([
    supabase.from("crm_setores").select("id, nome, cor").eq("organization_id", orgId).order("nome"),
    supabase.from("crm_setores_membros").select("setor_id, user_id").eq("organization_id", orgId),
    supabase
      .from("crm_setor_do_dispositivo")
      .select("setor_id, channel_session_id")
      .eq("organization_id", orgId),
  ]);
  if (setores.error) throw setores.error;
  if (membros.error) throw membros.error;
  if (dispositivos.error) throw dispositivos.error;
  const m = (membros.data ?? []) as Array<{ setor_id: string; user_id: string }>;
  const d = (dispositivos.data ?? []) as Array<{ setor_id: string; channel_session_id: string }>;
  return ((setores.data ?? []) as Array<{ id: string; nome: string; cor: string }>).map((s) => ({
    id: s.id,
    nome: s.nome,
    cor: s.cor,
    membros: m.filter((x) => x.setor_id === s.id).map((x) => x.user_id),
    dispositivos: d.filter((x) => x.setor_id === s.id).length,
    ids_dos_dispositivos: d.filter((x) => x.setor_id === s.id).map((x) => x.channel_session_id),
  }));
}

/** Troca a lista inteira de membros (o modal da Clint grava o conjunto). */
export async function trocarMembros(
  supabase: SupabaseClient,
  orgId: string,
  setorId: string,
  membros: readonly string[],
): Promise<void> {
  const apagar = await supabase
    .from("crm_setores_membros")
    .delete()
    .eq("organization_id", orgId)
    .eq("setor_id", setorId);
  if (apagar.error) throw apagar.error;
  if (membros.length === 0) return;
  const inserir = await supabase.from("crm_setores_membros").insert(
    [...new Set(membros)].map((user_id) => ({
      organization_id: orgId,
      setor_id: setorId,
      user_id,
    })),
  );
  if (inserir.error) throw inserir.error;
}

export interface SetorCurto {
  id: string;
  nome: string;
  cor: string;
}
export interface SetorDaConversa {
  setor: SetorCurto | null;
  em_transferencia: boolean;
  setor_anterior: SetorCurto | null;
}

/** O setor efetivo (N2) de cada conversa visível: o explícito ou o do dispositivo. */
export async function setoresDasConversas(
  supabase: SupabaseClient,
  orgId: string,
  ids: readonly string[],
): Promise<Record<string, SetorDaConversa>> {
  const conversas = await supabase
    .from("conversations")
    .select("id, channel_session_id")
    .eq("organization_id", orgId)
    .in("id", [...ids]);
  if (conversas.error) throw conversas.error;
  const visiveis = (conversas.data ?? []) as Array<{ id: string; channel_session_id: string }>;
  if (visiveis.length === 0) return {};
  const sessoes = [...new Set(visiveis.map((c) => c.channel_session_id))];
  const [explicitos, doDispositivo, setores] = await Promise.all([
    supabase
      .from("crm_setor_da_conversa")
      .select("conversation_id, setor_id, em_transferencia, setor_anterior_id")
      .eq("organization_id", orgId)
      .in(
        "conversation_id",
        visiveis.map((c) => c.id),
      ),
    supabase
      .from("crm_setor_do_dispositivo")
      .select("channel_session_id, setor_id")
      .eq("organization_id", orgId)
      .in("channel_session_id", sessoes),
    supabase.from("crm_setores").select("id, nome, cor").eq("organization_id", orgId),
  ]);
  if (explicitos.error) throw explicitos.error;
  if (doDispositivo.error) throw doDispositivo.error;
  if (setores.error) throw setores.error;
  const porId = new Map(((setores.data ?? []) as SetorCurto[]).map((s) => [s.id, s]));
  const exp = new Map(
    (
      (explicitos.data ?? []) as Array<{
        conversation_id: string;
        setor_id: string | null;
        em_transferencia: boolean;
        setor_anterior_id: string | null;
      }>
    ).map((e) => [e.conversation_id, e]),
  );
  const disp = new Map(
    ((doDispositivo.data ?? []) as Array<{ channel_session_id: string; setor_id: string }>).map(
      (d) => [d.channel_session_id, d.setor_id],
    ),
  );
  const saida: Record<string, SetorDaConversa> = {};
  for (const c of visiveis) {
    const e = exp.get(c.id);
    const setorId = e?.setor_id ?? disp.get(c.channel_session_id) ?? null;
    saida[c.id] = {
      setor: setorId ? (porId.get(setorId) ?? null) : null,
      em_transferencia: e?.em_transferencia ?? false,
      setor_anterior: e?.setor_anterior_id ? (porId.get(e.setor_anterior_id) ?? null) : null,
    };
  }
  return saida;
}
