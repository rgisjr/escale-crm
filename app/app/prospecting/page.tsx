import type { Metadata } from "next";
// ── FORK ESCALE · Fase 8A: com a casca, a Prospecção mora na aba de Campanhas ──
import { cookies } from "next/headers";
// ── fim FORK ESCALE ──
import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
// ── FORK ESCALE · Fase 8A ──
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──
import { ProspectingClient } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prospecção" };
export default async function ProspectingPage() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (org?.role !== "admin") redirect("/app/inbox");
  // ── FORK ESCALE · Fase 8A ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    redirect("/app/campaigns?aba=prospeccao");
  }
  // ── fim FORK ESCALE ──
  return <ProspectingClient />;
}
