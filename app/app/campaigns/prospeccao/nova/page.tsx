import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AssistenteDeProspeccao } from "@/components/escale/prospeccao/assistente/AssistenteDeProspeccao";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nova prospecção" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidOuNulo = (v: string | string[] | undefined) =>
  typeof v === "string" && UUID.test(v) ? v : null;

/**
 * O ASSISTENTE DE PROSPECÇÃO (fork Escale, Fase 8D; D9, D12). Só admin (como
 * a Prospecção do original) e só com a casca; sem ela, a tela do original.
 * `?id=` continua um rascunho; `?copiar=` duplica.
 */
export default async function NovaProspeccaoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[]; copiar?: string | string[] }>;
}) {
  const org = await resolveActiveOrg(await requireAuth());
  if (org?.role !== "admin") redirect("/app/inbox");
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo")
    redirect("/app/prospecting");
  const { id, copiar } = await searchParams;
  return <AssistenteDeProspeccao campanhaId={uuidOuNulo(id)} copiarDe={uuidOuNulo(copiar)} />;
}
