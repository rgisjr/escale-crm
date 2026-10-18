import type {
  AcaoEmMassa,
  ResumoDaAcao,
  StatusDaAcao,
  StatusVisivel,
} from "@/lib/escale/massa/tipos";

type Traduzir = (texto: string) => string;

/** Acima disto a Clint avisa que a exclusão vai para o segundo plano. */
export const EXCLUSAO_GRANDE = 5000;

/** Ainda andando na fila (o aviso de fim pergunta a cada 3 s). */
export const rodando = (s: StatusVisivel): boolean =>
  s === "preparando" || s === "na_fila" || s === "processando";
/** Já tem desfecho para avisar. "aguardando_aprovacao" NÃO é fim (Q4). */
export const terminou = (s: StatusVisivel): boolean =>
  s === "concluida" || s === "falhou" || s === "recusada" || s === "expirada";

/** O toast logo depois do pedido (Clint, `payload.queue`). A exportação que espera admin tem o seu (nosso, Q4). */
export function avisoNaFila(
  t: Traduzir,
  acao: AcaoEmMassa,
  total: number,
  status: StatusDaAcao,
): string | null {
  switch (acao) {
    case "criar_negocios":
      return t("Os negócios foram enviados para criação!");
    case "incluir_tag":
      return t(
        "Contatos com novas tags estão na fila de atualização. O processo pode levar alguns segundos.",
      );
    case "remover_tag":
      return t(
        "Contato(s) com a remoção da tag estão na fila de atualização. O processo pode levar alguns segundos.",
      );
    case "exportar":
      return status === "aguardando_aprovacao"
        ? t("A exportação foi enviada para aprovação de um administrador.")
        : t("A exportação iniciou com sucesso, aguarde enquanto o arquivo é gerado.");
    case "excluir":
      return total > EXCLUSAO_GRANDE
        ? t(
            "Exclusão em massa de grandes quantidades ocorrem em segundo plano e podem levar alguns minutos.",
          )
        : null;
  }
}

/** O toast quando o pedido nem entra (Clint). */
export function falhaDoPedido(t: Traduzir, acao: AcaoEmMassa): string {
  switch (acao) {
    case "criar_negocios":
      return t("Não foi possível criar os negócios. Tente novamente ou chame o suporte.");
    case "incluir_tag":
      return t("Falha ao adicionar tags aos contatos, tente novamente ou chame o suporte.");
    case "remover_tag":
      return t("Falha ao remover tag do(s) contato(s), tente novamente ou chame o suporte.");
    case "exportar":
      return t("Falha ao exportar os contatos, tente novamente ou chame o suporte.");
    case "excluir":
      return t("Falha ao remover os contatos, tente novamente ou chame o suporte.");
  }
}

/** O toast quando a ação termina na fila (Clint, mensagens de sucesso; recusa e vencimento são nossos, Q4). */
export function avisoDoFim(t: Traduzir, a: ResumoDaAcao): { ok: boolean; texto: string } {
  if (a.status === "falhou") return { ok: false, texto: falhaDoPedido(t, a.acao) };
  if (a.status === "recusada")
    return { ok: false, texto: t("A exportação foi recusada por um administrador.") };
  if (a.status === "expirada")
    return { ok: false, texto: t("O pedido de exportação expirou sem aprovação.") };
  switch (a.acao) {
    case "criar_negocios":
      return { ok: true, texto: t("Os negócios foram criados com sucesso!") };
    case "incluir_tag":
      return { ok: true, texto: t("As tags foram adicionadas aos contatos.") };
    case "remover_tag":
      return { ok: true, texto: t("A tag foi removida do(s) contato(s).") };
    case "exportar":
      return { ok: true, texto: t("Os contatos foram exportados com sucesso.") };
    case "excluir":
      return { ok: true, texto: t("Os contatos foram excluídos com sucesso.") };
  }
}
