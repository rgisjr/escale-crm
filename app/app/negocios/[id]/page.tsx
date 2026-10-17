/**
 * A FICHA DO NEGÓCIO (fork Escale, Fase 1G; C1): a tela própria do negócio,
 * como o `/deal/:id` da Clint. Só com a casca nova (cookie `escale_menu=topo`);
 * sem ela, volta ao link estável do original (`/app/leads/[id]`, que leva ao
 * quadro com `?lead=`): o dossiê lateral continua o de sempre.
 *
 * O negócio, a origem e o grupo são lidos com a sessão de quem olha e com o
 * filtro da organização ativa (a RLS é piso, não escopo: ver
 * `app/app/leads/[id]/page.tsx`). O contador "N Negócios" (C7) também: a RLS
 * decide quais negócios do contato entram.
 */
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { FichaDoNegocio } from "@/components/escale/negocio/FichaDoNegocio";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NegocioPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) notFound();

  const { id: bruto } = await params;
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo")
    redirect(`/app/leads/${bruto}`);
  const id = lerUuid(bruto);
  if (!id) notFound();

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, pipeline_id, contact_id, status")
    .eq("organization_id", activeOrg.orgId)
    .eq("id", id)
    .maybeSingle();
  // O quadro não traz arquivado: a ficha também não existe para ele.
  if (!lead?.pipeline_id || lead.status === "archived") notFound();

  const { data: origem } = await supabase
    .from("crm_pipelines")
    .select("id, name, group_id")
    .eq("organization_id", activeOrg.orgId)
    .eq("id", lead.pipeline_id)
    .maybeSingle();
  if (!origem) notFound();

  const { data: grupo } = origem.group_id
    ? await supabase
        .from("crm_pipeline_groups")
        .select("name")
        .eq("organization_id", activeOrg.orgId)
        .eq("id", origem.group_id)
        .maybeSingle()
    : { data: null };

  let negociosDoContato = 0;
  if (lead.contact_id) {
    const { count } = await supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", activeOrg.orgId)
      .eq("contact_id", lead.contact_id);
    negociosDoContato = count ?? 0;
  }

  return (
    <FichaDoNegocio
      negocioId={id}
      origem={{ id: origem.id, nome: origem.name }}
      grupo={grupo?.name ?? null}
      negociosDoContato={negociosDoContato}
    />
  );
}
