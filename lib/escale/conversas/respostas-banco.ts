import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CANAIS_DA_RESPOSTA,
  type CanalDaResposta,
  type NovaResposta,
  type RespostaLida,
} from "./respostas";

const COLUNAS =
  "id, organization_id, owner_user_id, title, body, shortcut, created_by_user_id, updated_at";

/**
 * AS RESPOSTAS RÁPIDAS (fork Escale, Fase 3C; E6). O template do original mais
 * os extras do fork. Pela sessão, a RLS do original decide o que aparece
 * (compartilhadas + as próprias); pelo service role, só depois da permissão.
 */
export async function lerRespostas(
  db: SupabaseClient,
  orgId: string,
  filtro: { ids?: string[] } = {},
): Promise<RespostaLida[]> {
  let q = db
    .from("message_templates")
    .select(COLUNAS)
    .eq("organization_id", orgId)
    .order("shortcut", { ascending: true });
  if (filtro.ids) q = q.in("id", filtro.ids);
  const { data, error } = await q;
  if (error) throw error;
  const templates = (data ?? []) as Array<{
    id: string;
    owner_user_id: string | null;
    title: string;
    body: string;
    shortcut: string | null;
    created_by_user_id: string | null;
    updated_at: string;
  }>;
  if (templates.length === 0) return [];
  const ids = templates.map((x) => x.id);
  const [extras, setores] = await Promise.all([
    db
      .from("crm_respostas_rapidas_extras")
      .select("template_id, canais, todos_os_setores")
      .eq("organization_id", orgId)
      .in("template_id", ids),
    db
      .from("crm_respostas_rapidas_setores")
      .select("template_id, setor_id")
      .eq("organization_id", orgId)
      .in("template_id", ids),
  ]);
  if (extras.error) throw extras.error;
  if (setores.error) throw setores.error;
  const ex = new Map(
    (
      (extras.data ?? []) as Array<{
        template_id: string;
        canais: CanalDaResposta[];
        todos_os_setores: boolean;
      }>
    ).map((e) => [e.template_id, e]),
  );
  const se = (setores.data ?? []) as Array<{ template_id: string; setor_id: string }>;
  return templates.map((x) => {
    const e = ex.get(x.id);
    return {
      id: x.id,
      atalho: x.shortcut ?? x.title,
      corpo: x.body,
      canais: e?.canais ?? [...CANAIS_DA_RESPOSTA],
      compartilhada: x.owner_user_id === null,
      todos_os_setores: e?.todos_os_setores ?? true,
      setores: se.filter((s) => s.template_id === x.id).map((s) => s.setor_id),
      dono: x.owner_user_id,
      criada_por: x.created_by_user_id,
      atualizada_em: x.updated_at,
    };
  });
}

/** Grava os extras e troca os setores de uma resposta. */
export async function gravarExtras(
  db: SupabaseClient,
  orgId: string,
  templateId: string,
  r: NovaResposta,
): Promise<void> {
  const extras = await db.from("crm_respostas_rapidas_extras").upsert(
    {
      template_id: templateId,
      organization_id: orgId,
      canais: r.canais,
      todos_os_setores: r.todos_os_setores,
    },
    { onConflict: "template_id" },
  );
  if (extras.error) throw extras.error;
  // Sem transação no PostgREST: os setores novos entram primeiro e só depois saem
  // os que ficaram de fora, para uma falha na entrada não deixar a resposta sem setores.
  const setores = r.todos_os_setores ? [] : [...new Set(r.setores)];
  if (setores.length > 0) {
    const inserir = await db.from("crm_respostas_rapidas_setores").upsert(
      setores.map((setor_id) => ({
        template_id: templateId,
        setor_id,
        organization_id: orgId,
      })),
      { onConflict: "template_id,setor_id", ignoreDuplicates: true },
    );
    if (inserir.error) throw inserir.error;
  }
  let apagar = db
    .from("crm_respostas_rapidas_setores")
    .delete()
    .eq("organization_id", orgId)
    .eq("template_id", templateId);
  if (setores.length > 0) apagar = apagar.not("setor_id", "in", `(${setores.join(",")})`);
  const { error } = await apagar;
  if (error) throw error;
}
