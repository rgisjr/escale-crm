import type { Metadata } from "next";

import { PaginaDeDesempenho } from "@/app/app/metrics/_components/PaginaDeDesempenho";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Desempenho do atendimento" };

/**
 * FORK ESCALE · Fase 7B: a página Desempenho no grupo "Agente de IA" do menu Mais
 * (PRD 7, decisão 8). Mesmo conteúdo; `/app/metrics` passa a ser a lista de painéis na casca.
 */
export default function DesempenhoDoAtendimentoPage() {
  return <PaginaDeDesempenho titulo="Desempenho do atendimento" />;
}
