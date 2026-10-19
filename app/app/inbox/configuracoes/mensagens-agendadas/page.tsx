import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TelaMensagensAgendadas } from "@/components/escale/conversas/agendadas/TelaMensagensAgendadas";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";

export const dynamic = "force-dynamic";

/**
 * FORK ESCALE · Fase 3B (C9, N19): "Configurações › Mensagens agendadas" da
 * Clint. Só com a casca ligada; sem ela, volta para o inbox do original.
 */
export default async function MensagensAgendadasPage() {
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo") {
    redirect("/app/inbox");
  }
  return <TelaMensagensAgendadas />;
}
