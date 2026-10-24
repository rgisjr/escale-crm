import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

/**
 * O ⋮ E O BOTÃO DA LINHA (fork Escale, Fase 8A; N9; material 2.1 e 007): o que
 * cada status oferece. "Cancelar campanha" antes do envio volta a rascunho (a
 * Clint); depois de alguém ter recebido, é definitivo.
 */
export type AcaoDaLinha =
  "editar" | "excluir" | "alterar_horario" | "cancelar_para_rascunho" | "cancelar" | "duplicar";

export type AcaoConfirmavel = "excluir" | "cancelar_para_rascunho" | "cancelar";

export function acoesDaLinha(status: StatusDaCampanha, enviados: number): AcaoDaLinha[] {
  switch (status) {
    case "draft":
      return ["editar", "excluir", "duplicar"];
    case "ready":
      return ["cancelar_para_rascunho", "duplicar"];
    case "scheduled":
      return ["alterar_horario", enviados > 0 ? "cancelar" : "cancelar_para_rascunho", "duplicar"];
    case "running":
    case "paused":
      return ["cancelar", "duplicar"];
    default:
      return ["duplicar"];
  }
}

export const ROTULO_DA_ACAO: Record<AcaoDaLinha, string> = {
  editar: "Editar rascunho",
  excluir: "Excluir rascunho",
  alterar_horario: "Alterar horário do disparo",
  cancelar_para_rascunho: "Cancelar campanha",
  cancelar: "Cancelar campanha",
  duplicar: "Duplicar campanha",
};

export const ACOES_DESTRUTIVAS: ReadonlySet<AcaoDaLinha> = new Set([
  "excluir",
  "cancelar_para_rascunho",
  "cancelar",
]);

export const CONFIRMACAO_DA_ACAO: Record<AcaoConfirmavel, string> = {
  excluir: "Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.",
  cancelar_para_rascunho:
    "A campanha será movida para Rascunho e você poderá editá-la e reagendar. Deseja continuar?",
  cancelar:
    "A campanha será cancelada e os contatos que ainda não receberam a mensagem não serão notificados. Esta ação não pode ser desfeita.",
};

/** Pausar/Retomar na linha (só WhatsApp, em andamento ou pausada; material 2.1). */
export function botaoDaLinha(status: StatusDaCampanha): "pausar" | "retomar" | null {
  if (status === "running") return "pausar";
  if (status === "paused") return "retomar";
  return null;
}
