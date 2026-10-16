"use client";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";

import { SeloDaCasca } from "./SeloDaCasca";

/**
 * A fila de conversas (as que esperam uma PESSOA) no selo vermelho da casca. É a
 * MESMA contagem do `ContadorDaFila` do original (mesma chave do React Query),
 * só com o desenho da Clint. O original continua intacto na barra lateral.
 */
export function ContadorDaFilaDaCasca({ limite, className }: { limite: 9 | 99; className?: string }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const { data } = useConversationCounts(activeOrg?.orgId ?? null);
  const esperando = data?.fila ?? data?.unassigned ?? 0;
  const rotulo =
    esperando === 1 ? t("1 conversa esperando uma pessoa") : `${esperando} ${t("conversas esperando uma pessoa")}`;
  return <SeloDaCasca valor={esperando} limite={limite} rotulo={rotulo} className={className} />;
}
