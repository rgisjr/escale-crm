/**
 * O PUSH DAS NOTIFICAÇÕES DA ORIGEM (fork Escale, Fase 1K, D15; Q1).
 *
 * Escuta `lead.created`, `lead.won` e `lead.lost`. Lê o negócio e a origem com
 * o service role, escolhe as pessoas pela régua da tela (`destinatariosDoEvento`)
 * e manda o push só a quem é membro ativo e VÊ o negócio (`podeVerNegocio` da
 * 1J, com o papel lido no banco). O toast dentro do app sai do tempo real
 * (`useAvisosDaOrigem`). O texto não leva mais que o nome da origem e o título.
 */
import type { EventHandler, EventRow, HandlerResult } from "@/lib/event-log/dispatcher";
import type { Role } from "@/lib/auth/types";
import { modoDaOrganizacao } from "@/lib/escale/acesso/modo-da-organizacao";
import { pessoasDaOrigem, podeVerNegocio, regraEmVigor } from "@/lib/escale/acesso/regras";
import { truncar } from "@/lib/notifications/push_payload";
import { vapidPronto } from "@/lib/notifications/vapid";
import { enviarPushAoUsuario } from "@/lib/notifications/web_push";
import { createAdminClient } from "@/lib/supabase/admin";

import { destinatariosDoEvento, lerNotificacoes } from "./regras";

export const AVISOS_DA_ORIGEM_KEY = "escale.avisos-da-origem";

const resultado = (status: HandlerResult["status"], detail?: string): HandlerResult => ({
  consumer_key: AVISOS_DA_ORIGEM_KEY,
  status,
  detail,
});

const TITULO: Record<"lead.created" | "lead.won" | "lead.lost", string> = {
  "lead.created": "Novo negócio",
  "lead.won": "Negócio ganho",
  "lead.lost": "Negócio perdido",
};

async function handle(row: EventRow): Promise<HandlerResult> {
  if (!vapidPronto()) return resultado("skipped", "vapid_ausente");
  const evento = row.event_type as keyof typeof TITULO;
  const leadId =
    (typeof row.payload?.lead_id === "string" ? row.payload.lead_id : null) ??
    (typeof row.entity_id === "string" ? row.entity_id : null);
  if (!leadId) return resultado("skipped", "sem_lead");

  const admin = createAdminClient();
  const { data: lead, error: erroDoLead } = await admin
    .from("crm_leads")
    .select("id, title, pipeline_id, owner_user_id, created_by_user_id")
    .eq("id", leadId)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (erroDoLead) return resultado("error", "leitura_do_negocio");
  if (!lead) return resultado("skipped", "negocio_sumiu");
  const l = lead as {
    title?: string | null;
    pipeline_id: string;
    owner_user_id: string | null;
    created_by_user_id: string | null;
  };

  const { data: origem, error: erroDaOrigem } = await admin
    .from("crm_pipelines")
    .select("id, name, group_id, settings")
    .eq("id", l.pipeline_id)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (erroDaOrigem) return resultado("error", "leitura_da_origem");
  if (!origem) return resultado("skipped", "origem_sumiu");
  const o = origem as { name: string; group_id: string | null; settings: unknown };

  const quem = destinatariosDoEvento(evento, lerNotificacoes(o.settings), l);
  if (quem.length === 0) return resultado("skipped", "sem_destinatario");

  let settingsDoGrupo: unknown = null;
  if (o.group_id) {
    const g = await admin
      .from("crm_pipeline_groups")
      .select("settings")
      .eq("id", o.group_id)
      .eq("organization_id", row.organization_id)
      .maybeSingle();
    if (g.error) return resultado("error", "leitura_do_grupo");
    settingsDoGrupo = (g.data as { settings?: unknown } | null)?.settings ?? null;
  }
  const { data: membros, error: erroDosMembros } = await admin
    .from("user_organizations")
    .select("user_id, role")
    .eq("organization_id", row.organization_id)
    .in("user_id", quem)
    .not("accepted_at", "is", null)
    .is("revoked_at", null);
  if (erroDosMembros) return resultado("error", "leitura_dos_membros");

  const regra = regraEmVigor(o.settings, await modoDaOrganizacao(row.organization_id, row.id));
  const pessoas = pessoasDaOrigem(o.settings);
  const pessoasDoGrupo = pessoasDaOrigem(settingsDoGrupo);
  const papelDe = new Map(
    ((membros ?? []) as Array<{ user_id: string; role: string }>).map((m) => [
      m.user_id.toLowerCase(),
      m.role,
    ]),
  );
  const destinatarios = quem.filter((u) => {
    const papel = papelDe.get(u);
    return (
      !!papel &&
      podeVerNegocio({
        papel: papel as Role,
        userId: u,
        donoUserId: l.owner_user_id,
        regra,
        pessoas,
        pessoasDoGrupo,
      })
    );
  });
  if (destinatarios.length === 0) return resultado("skipped", "ninguem_ve");

  const payload = {
    title: TITULO[evento],
    body: truncar(`${o.name} · ${l.title?.trim() || "Negócio"}`),
    tag: `escale-origem:${evento}:${leadId}`,
    href: `/app/negocios/${leadId}`,
  };
  let enviados = 0;
  for (const u of destinatarios) {
    const { sent } = await enviarPushAoUsuario(row.organization_id, u, payload);
    enviados += sent;
  }
  return resultado("ok", `sent:${enviados}`);
}

export const avisosDaOrigemHandler: EventHandler = {
  key: AVISOS_DA_ORIGEM_KEY,
  naOrgParada: "pula",
  events: ["lead.created", "lead.won", "lead.lost"],
  handle,
};
