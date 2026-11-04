/**
 * FORK ESCALE · 5D: as frases de recusa do modo fluxo, traduzidas por UMA tabela de chamadas literais.
 * O `t()` precisa ver o texto escrito (a cerca de espanhol não resolve `t(variavel)` que vem de estado), então
 * a tela passa a frase por aqui em vez de passar a variável direto.
 */
export function fraseDoFluxo(frase: string, t: (texto: string) => string): string {
  switch (frase) {
    case "Escreva a mensagem":
      return t("Escreva a mensagem");
    case "Dê um texto a cada botão":
      return t("Dê um texto a cada botão");
    case "Escolha o arquivo":
      return t("Escolha o arquivo");
    case "Revise a mensagem":
      return t("Revise a mensagem");
    case "Uma mensagem tem no máximo 8 itens.":
      return t("Uma mensagem tem no máximo 8 itens.");
    case "O primeiro item da lista não pode ser um atraso.":
      return t("O primeiro item da lista não pode ser um atraso.");
    case "Não é possível adicionar mais delay entre as mensagens.":
      return t("Não é possível adicionar mais delay entre as mensagens.");
    case "O último item da lista não pode ser um atraso.":
      return t("O último item da lista não pode ser um atraso.");
    case "O texto do botão deve ter no máximo 20 caracteres":
      return t("O texto do botão deve ter no máximo 20 caracteres");
    case "O tempo mínimo de resposta é de 1 minuto.":
      return t("O tempo mínimo de resposta é de 1 minuto.");
    case "O atraso mínimo é de 30 segundos.":
      return t("O atraso mínimo é de 30 segundos.");
    case "O atraso máximo é de 90 dias.":
      return t("O atraso máximo é de 90 dias.");
    case "Com mais de 3 opções, a mensagem vai como lista.":
      return t("Com mais de 3 opções, a mensagem vai como lista.");
    case "A automação passou do tamanho máximo (60 passos).":
      return t("A automação passou do tamanho máximo (60 passos).");
    default:
      return frase;
  }
}
