import { notFound, redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { PipelinePageClient } from "./_client";
// FORK ESCALE · Fase 1D: a barra nova do quadro vem com a casca nova.
import { cookies } from "next/headers";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// FORK ESCALE · Fase 1G (N3): com a casca, `?lead=` abre a ficha do negócio.
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { buscaDosParametros, rotaDoNegocio, type ParametrosDaPagina } from "@/lib/escale/negocio/regras";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // FORK ESCALE · Fase 1G: o `?lead=` (e os filtros) para a ficha do negócio.
  searchParams?: Promise<ParametrosDaPagina>;
}) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const { id } = await params;
  // FORK ESCALE · Fase 1G (N14): com a casca nova, `?lead=` vira a ficha própria, levando os filtros.
  // Antes de ler o banco: a ficha resolve a origem do negócio sozinha. Sem a casca, nada muda.
  const busca = buscaDosParametros((await searchParams) ?? {});
  const leadDaUrl = lerUuid(new URLSearchParams(busca).get("lead"));
  if (leadDaUrl && lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    redirect(rotaDoNegocio(leadDaUrl, busca));
  }
  const supabase = await createClient();
  // Mesma razão da Agenda: a RLS é piso, não escopo. Sem este filtro o funil de
  // OUTRA organização do mesmo usuário abre, e o quadro monta com as etapas de
  // um lugar e o cabeçalho de outro.
  const { data: pipeline } = await supabase
    .from("crm_pipelines")
    .select("id, name, vocabulary")
    .eq("organization_id", activeOrg.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!pipeline) notFound();
  // A lista que alimenta o seletor de troca rápida: os mesmos vivos da tela de
  // Funis (`app/app/kanban/page.tsx`), só `id` + `name`. Arquivado não entra —
  // trocar para um funil que não recebe negócio seria destino que não existe.
  const { data: funis } = await supabase
    .from("crm_pipelines")
    .select("id, name")
    .eq("organization_id", activeOrg.orgId)
    .eq("is_archived", false)
    .order("position");
  // FORK ESCALE · Fase 1D: a barra nova do quadro vem com a casca nova (cookie
  // `escale_menu=topo`); com a lateral, o quadro continua o do original.
  const cascaNova = lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo";
  return (
    <PipelinePageClient
      pipelineId={id}
      initialName={pipeline.name}
      role={activeOrg.role}
      funis={funis ?? []}
      cascaNova={cascaNova}
    />
  );
}
