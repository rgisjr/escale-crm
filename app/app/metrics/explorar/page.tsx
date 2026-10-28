import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { EditorDeGrafico } from "@/components/escale/indicadores/editor/EditorDeGrafico";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { ROTA_DA_LISTA_DE_PAINEIS } from "@/lib/escale/indicadores/rotas";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Charts" };

/**
 * FORK ESCALE · Fase 7D: o editor de gráfico novo (10-012). Só existe com a casca e para gerente ou acima;
 * `?painel=` traz o painel de origem (o "Novo Chart" do painel aberto).
 */
export default async function NovoChartPage({ searchParams }: { searchParams: Promise<{ painel?: string }> }) {
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo") redirect(ROTA_DA_LISTA_DE_PAINEIS);
  const org = await resolveActiveOrg(await requireAuth());
  if (!org || !roleAtLeast(org.role, "manager")) redirect(ROTA_DA_LISTA_DE_PAINEIS);
  const { painel } = await searchParams;
  const painelDeOrigem = z.string().uuid().safeParse(painel).success
    ? await lerPainel(await createClient(), org.orgId, painel as string, false)
    : null;
  return <EditorDeGrafico modo="novo" grafico={null} painelDeOrigem={painelDeOrigem} papel={org.role} />;
}
