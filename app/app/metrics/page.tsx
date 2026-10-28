import type { Metadata } from "next";
// ── FORK ESCALE · Fase 7B: com a casca, a lista de painéis da Clint ──
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { IndicadoresDaCasca } from "@/components/escale/indicadores/lista/IndicadoresDaCasca";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

import { PaginaDeDesempenho } from "./_components/PaginaDeDesempenho";

export const dynamic = "force-dynamic";

const FUSO_PADRAO = "America/Sao_Paulo";

async function comCasca(): Promise<boolean> {
  return lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo";
}

/** FORK ESCALE · Fase 7B: o título da aba é "Indicadores" com a casca; sem ela, o de sempre. */
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await comCasca()) ? "Indicadores" : "Desempenho" };
}

export default async function MetricsPage() {
  // ── FORK ESCALE · Fase 7B: sem a casca, a página Desempenho segue igual ──
  if (await comCasca()) {
    const org = await resolveActiveOrg(await requireAuth());
    if (!org || !roleAtLeast(org.role, "agent")) redirect("/app/inbox");
    return <IndicadoresDaCasca papel={org.role} fuso={org.timezone ?? FUSO_PADRAO} />;
  }
  // ── fim FORK ESCALE ──
  return <PaginaDeDesempenho titulo="Desempenho" />;
}
