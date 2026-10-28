import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PainelDaCasca } from "@/components/escale/indicadores/painel/PainelDaCasca";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { ROTA_DA_LISTA_DE_PAINEIS } from "@/lib/escale/indicadores/rotas";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Indicadores" };

/**
 * FORK ESCALE · Fase 7B: um painel aberto (10-058). Só existe na casca; painel
 * inexistente ou invisível (RLS da 9601) volta para a lista. A 7C completa a tela.
 */
export default async function PainelPage({ params }: { params: Promise<{ id: string }> }) {
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo") {
    redirect(ROTA_DA_LISTA_DE_PAINEIS);
  }
  const org = await resolveActiveOrg(await requireAuth());
  if (!org || !roleAtLeast(org.role, "agent")) redirect("/app/inbox");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) redirect(ROTA_DA_LISTA_DE_PAINEIS);
  const painel = await lerPainel(await createClient(), org.orgId, id, false);
  if (!painel) redirect(ROTA_DA_LISTA_DE_PAINEIS);
  return <PainelDaCasca painel={painel} />;
}
