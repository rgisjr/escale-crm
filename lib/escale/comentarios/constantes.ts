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
/** FORK ESCALE · Fase 10A (D10): as origens de mensagem que o eco `message.sent` reconhece. A 10D acrescenta "direct". */
export const ORIGENS_DO_ECO = ["comentario", "comentario_manual"] as const;

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
