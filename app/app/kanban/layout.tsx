import type { ReactNode } from "react";

import { ComOrigens } from "@/components/escale/origens/ComOrigens";

// Fork Escale: "Negócios" do menu do topo abre aqui; o painel Origens vem junto,
// só na casca nova.
export default function KanbanLayout({ children }: { children: ReactNode }) {
  return <ComOrigens>{children}</ComOrigens>;
}
