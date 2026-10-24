import type { Metadata } from "next";
// ── FORK ESCALE · Fase 8B: com a casca, o rascunho (e a cópia) abrem no assistente ──
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AssistenteDeCampanha } from "@/components/escale/campanhas/assistente/AssistenteDeCampanha";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

import { EditarCampanha } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar campanha" };

export default async function EditarCampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ── FORK ESCALE · Fase 8B ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    const org = await resolveActiveOrg(await requireAuth());
    if (!org || !roleAtLeast(org.role, "manager")) redirect("/app/inbox");
    const { origens, opcoesDoFiltro } = await origensDaPagina();
    return (
      <AssistenteDeCampanha
        campanhaId={id}
        origens={origens}
        opcoesDoFiltro={opcoesDoFiltro}
        papel={org.role}
        fuso={org.timezone ?? undefined}
      />
    );
  }
  // ── fim FORK ESCALE ──
  return <EditarCampanha id={id} />;
}
