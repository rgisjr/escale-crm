import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { EditorDeGrafico } from "@/components/escale/indicadores/editor/EditorDeGrafico";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { lerGrafico } from "@/lib/escale/indicadores/graficos/banco";
import { lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { ROTA_DA_LISTA_DE_PAINEIS } from "@/lib/escale/indicadores/rotas";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return { title: "Charts" };
  const org = await resolveActiveOrg(await requireAuth());
  const grafico = org ? await lerGrafico(await createClient(), org.orgId, id) : null;
  return { title: grafico?.nome ?? "Charts" };
}

/** FORK ESCALE · Fase 7D: editar um gráfico (10-036). Gráfico inexistente ou invisível (RLS) volta para a lista. */
export default async function EditarChartPage({ params }: Props) {
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo") redirect(ROTA_DA_LISTA_DE_PAINEIS);
  const org = await resolveActiveOrg(await requireAuth());
  if (!org || !roleAtLeast(org.role, "manager")) redirect(ROTA_DA_LISTA_DE_PAINEIS);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) redirect(ROTA_DA_LISTA_DE_PAINEIS);
  const supabase = await createClient();
  const grafico = await lerGrafico(supabase, org.orgId, id);
  if (!grafico) redirect(ROTA_DA_LISTA_DE_PAINEIS);
  const painelDeOrigem = await lerPainel(supabase, org.orgId, grafico.painelId, false);
  return <EditorDeGrafico modo="editar" grafico={grafico} painelDeOrigem={painelDeOrigem} papel={org.role} />;
}
