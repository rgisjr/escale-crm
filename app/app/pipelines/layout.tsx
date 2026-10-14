import type { ReactNode } from "react";

import { ComOrigens } from "@/components/escale/origens/ComOrigens";

// Fork Escale: painel Origens ao lado do quadro, só na casca nova (menu no topo).
// Layout acima de `[id]`: trocar de funil mantém o painel montado.
export default function PipelinesLayout({ children }: { children: ReactNode }) {
  return <ComOrigens>{children}</ComOrigens>;
}
