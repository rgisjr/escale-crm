/** FORK ESCALE · Fase 10B: o gatilho de comentário e o passo Instagram. */
export const GATILHO_DE_COMENTARIO = "comment.received" as const;
export const PASSO_DO_INSTAGRAM = "send_instagram_message" as const;
export const PLATAFORMAS_DE_COMENTARIO = ["instagram", "facebook"] as const;
export type PlataformaDeComentario = (typeof PLATAFORMAS_DE_COMENTARIO)[number];

export const MAXIMO_DE_CAMINHOS = 10;
export const MAXIMO_DE_PUBLICACOES = 20;
export const MAXIMO_DE_VARIACOES = 5;
export const MAXIMO_DA_RESPOSTA = 300;
export const MAXIMO_DE_PALAVRAS = 20;
export const MAXIMO_DA_PALAVRA = 60;
export const MAXIMO_DO_TEXTO = 1000;
export const MAXIMO_DO_TEXTO_COM_BOTAO = 640;
export const MAXIMO_DE_BOTOES = 3;
export const MAXIMO_DO_TITULO_DO_BOTAO = 20;
/** Meta, Private Replies: até 7 dias depois do comentário. */
export const PRAZO_DA_RESPOSTA_PRIVADA_MS = 7 * 24 * 60 * 60 * 1000;
/** Clint: components.automation.InstagramCommentTriggerConfig.replyDefaultText. */
export const TEXTO_PADRAO_DA_RESPOSTA = "Te respondi no direct, dá uma olhada!";
export const ID_DO_CAMINHO_UNICO = "qualquer";
/** Janela em que o eco do Zernio casa com a mensagem que a automação gravou (D13). */
export const JANELA_DO_ECO_MS = 15 * 60 * 1000;
/** FORK ESCALE · Fase 10A (D10): as origens de mensagem que o eco `message.sent` reconhece. A 10D acrescentou "direct". */
export const ORIGENS_DO_ECO = ["comentario", "comentario_manual", "direct"] as const;

/** FORK ESCALE · Fase 10A: a caixa de comentários. */
export const MAXIMO_DO_TEXTO_A_MAO = 1000;
export const COMENTARIOS_POR_PAGINA = 50;
export const PUBLICACOES_POR_PAGINA = 25;
/** D13: uma ação `enviando` mais velha que isto foi interrompida (o processo caiu no meio). */
export const ACAO_INTERROMPIDA_MS = 2 * 60 * 1000;
export const ACOES_NO_COMENTARIO = ["resposta", "direct", "ocultar", "reexibir", "apagar", "curtir", "descurtir"] as const;
export type AcaoNoComentario = (typeof ACOES_NO_COMENTARIO)[number];
export const PERIODOS_DA_CAIXA = ["7d", "30d", "90d", "tudo"] as const;
export type PeriodoDaCaixa = (typeof PERIODOS_DA_CAIXA)[number];
export const ORDENS_DA_CAIXA = ["recentes", "mais_comentarios"] as const;
export type OrdemDaCaixa = (typeof ORDENS_DA_CAIXA)[number];
export const FILTROS_DOS_COMENTARIOS = ["todos", "sem_resposta", "respondidos", "ocultos", "contatos"] as const;
export type FiltroDosComentarios = (typeof FILTROS_DOS_COMENTARIOS)[number];

/** FORK ESCALE · Fase 10D: os gatilhos de direct do Instagram (D1). */
export const GATILHO_DE_MENSAGEM_DO_INSTAGRAM = "instagram.message_received" as const;
export const GATILHO_DE_MENCAO_EM_STORY = "instagram.story_mention" as const;
export const GATILHO_DE_RESPOSTA_A_STORY = "instagram.story_reply" as const;
export const GATILHOS_DE_DIRECT = [
  GATILHO_DE_MENSAGEM_DO_INSTAGRAM,
  GATILHO_DE_MENCAO_EM_STORY,
  GATILHO_DE_RESPOSTA_A_STORY,
] as const;
export type GatilhoDeDirect = (typeof GATILHOS_DE_DIRECT)[number];
/** Os gatilhos em que o passo Instagram funciona (D8 + D9 da 10B). */
export const GATILHOS_DO_PASSO_DO_INSTAGRAM = [GATILHO_DE_COMENTARIO, ...GATILHOS_DE_DIRECT] as const;

/** Operadores do gatilho de mensagem da Clint (D3), na ordem do seletor. */
export const OPERADORES_DO_FILTRO = [
  "igual",
  "contem",
  "palavra_inteira",
  "comeca_com",
  "termina_com",
  "nao_contem",
] as const;
export type OperadorDoFiltro = (typeof OPERADORES_DO_FILTRO)[number];
/** Clint: label.tIs, tContains, tContainsWholeWord, tStartsWith, tEndsWith, tDoesntContain. */
export const ROTULO_DO_OPERADOR: Readonly<Record<OperadorDoFiltro, string>> = {
  igual: "É",
  contem: "Contém",
  palavra_inteira: "Contém palavra inteira",
  comeca_com: "Começa com",
  termina_com: "Termina com",
  nao_contem: "Não contém",
};

/** D6: quanto a IA fica quieta na conversa depois de um direct que casou com uma automação. */
export const SILENCIO_DA_AUTOMACAO_MS = 10 * 60 * 1000;
export const MOTIVO_DO_SILENCIO = "automacao_do_instagram";
/** D8: janela da Meta para mensagem comum depois da última mensagem da pessoa. */
export const JANELA_DA_MENSAGEM_MS = 24 * 60 * 60 * 1000;
/** D13 */
export const PREFIXO_DO_LIBERAR = "escale:liberar:";
export const TEXTO_PADRAO_DO_LIBERAR = "Para receber o link, siga a conta e toque em Já estou seguindo.";
export const TITULO_PADRAO_DO_LIBERAR = "Já estou seguindo";
export const TEXTO_PADRAO_DE_QUEM_NAO_SEGUE = "Ainda não encontramos o seu follow. Siga a conta e toque de novo.";
export const MAXIMO_DE_TOQUES_NO_LIBERAR = 3;
/** D10 */
export const MAXIMO_DE_HORAS_DA_REPETICAO = 720;
/** D5 */
export const CACHE_DAS_REGRAS_DE_DIRECT_MS = 30_000;
/** D15 */
export const SO_NO_FACEBOOK = "Curtir comentário só está disponível no Facebook.";
