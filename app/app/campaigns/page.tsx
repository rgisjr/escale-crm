import type { Metadata } from "next";
// ── FORK ESCALE · Fase 8A: com a casca, a lista de campanhas da Clint ──
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CampanhasDaCasca } from "@/components/escale/campanhas/CampanhasDaCasca";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { abaDaUrl } from "@/lib/escale/campanhas/rotas";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

import { ListaDeCampanhas } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campanhas" };

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string | string[] }>;
}) {
  // ── FORK ESCALE · Fase 8A ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    const org = await resolveActiveOrg(await requireAuth());
    if (!org || !roleAtLeast(org.role, "manager")) redirect("/app/inbox");
    const { aba } = await searchParams;
    return (
      <CampanhasDaCasca
        papel={org.role}
        organizacaoId={org.orgId}
        aba={abaDaUrl(typeof aba === "string" ? aba : null, org.role)}
        fuso={org.timezone ?? undefined}
      />
    );
  }
  // ── fim FORK ESCALE ──
  // Auth e organização já vêm garantidas pelo layout de /app; a lista carrega
  // pela API, que confere o papel `manager` por conta própria.
  return <ListaDeCampanhas />;
}
