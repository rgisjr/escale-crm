import type { StatusDeConversa } from "@/hooks/inbox/useConversationsRealtime";

/** CONVERSAS NA FICHA (fork Escale, Fase 1H; C16): o chip de status da sessão (print 05: "Em aberto"). */
export const ROTULO_DO_STATUS: Readonly<Record<StatusDeConversa, string>> = {
  open: "Em aberto",
  pending: "Pendente",
  claimed: "Em atendimento",
  ai_handling: "Com o agente",
  resolved: "Resolvida",
  closed: "Encerrada",
  archived: "Arquivada",
};

/** Verde claro para o que está aberto; cinza para o resto (sem print dos outros estados). */
export function classeDoStatus(status: string): string {
  return status === "open" ||
    status === "claimed" ||
    status === "ai_handling" ||
    status === "pending"
    ? "bg-[var(--escale-status-ganho-suave)] text-[var(--escale-status-ganho)]"
    : "bg-casca-raia text-casca-texto-2";
}

export const MAX_SESSOES = 100;
