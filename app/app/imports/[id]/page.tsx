import { cookies } from "next/headers";

import { ImportDetailClient } from "./_client";
// ── FORK ESCALE · Fase 2F: com a casca, o relatório e a revisão da importação ──
import { RelatorioDaImportacao } from "@/components/escale/importacao/RelatorioDaImportacao";
import { RevisarPendencias } from "@/components/escale/importacao/RevisarPendencias";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";

export default async function ImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revisar?: string }>;
}) {
  const { id } = await params;
  // ── FORK ESCALE · Fase 2F ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    return (await searchParams).revisar === "1" ? <RevisarPendencias id={id} /> : <RelatorioDaImportacao id={id} />;
  }
  // ── fim FORK ESCALE ──
  return <ImportDetailClient id={id} />;
}
