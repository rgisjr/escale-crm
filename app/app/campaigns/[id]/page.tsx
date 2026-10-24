import type { Metadata } from "next";
// ── FORK ESCALE · Fase 8C: com a casca, o detalhe é a janela sobre a lista ──
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { rotaDoDetalhe } from "@/lib/escale/campanhas/rotas";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

import { DetalheDaCampanha } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campanha" };

export default async function CampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ── FORK ESCALE · Fase 8C ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    redirect(rotaDoDetalhe(id));
  }
  // ── fim FORK ESCALE ──
  return <DetalheDaCampanha id={id} />;
}
