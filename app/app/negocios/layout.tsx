import type { ReactNode } from "react";

import { ComOrigens } from "@/components/escale/origens/ComOrigens";

// FORK ESCALE · Fase 1G (N2): a ficha do negócio fica ao lado do painel Origens, como na Clint superior (01-011).
// Sem a casca nova, o ComOrigens devolve só o conteúdo (e a página redireciona).
export default function NegociosLayout({ children }: { children: ReactNode }) {
  return <ComOrigens>{children}</ComOrigens>;
}
