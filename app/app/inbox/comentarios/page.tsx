import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TelaDeComentarios } from "@/components/escale/conversas/comentarios/TelaDeComentarios";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";

export const dynamic = "force-dynamic";

/**
 * FORK ESCALE · Fase 10A (D1): a caixa de comentários do Instagram e do Facebook em Atendimento. Sem a
 * casca ligada, volta para o inbox do original (que não ganha nada).
 */
export default async function ComentariosPage() {
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo") {
    redirect("/app/inbox");
  }
  return <TelaDeComentarios />;
}
