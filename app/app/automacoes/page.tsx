import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AutomacoesDaCasca } from "@/components/escale/automacoes/lista/AutomacoesDaCasca";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Automações" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * FORK ESCALE · Fase 5A: a lista de automações da casca (07-001). Sem a casca,
 * a aba "Automações" de Webhooks segue como sempre; com ela, o editor em
 * formulário abre por cima desta lista com `?editor=<id>`.
 */
export default async function AutomacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ editor?: string | string[] }>;
}) {
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo") {
    redirect("/app/webhooks?aba=automacoes");
  }
  const org = await resolveActiveOrg(await requireAuth());
  if (!org || !roleAtLeast(org.role, "manager")) redirect("/app/inbox");
  const { editor } = await searchParams;
  const editorAberto = typeof editor === "string" && UUID.test(editor) ? editor : null;
  return <AutomacoesDaCasca fuso={org.timezone ?? "America/Sao_Paulo"} editorAberto={editorAberto} />;
}
