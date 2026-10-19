/**
 * O ASSISTENTE DA ESCALE NO COMPOSITOR (fork Escale, Fase 3B; C10; decisão 6
 * da seção 9: "Aura" é marca da Clint). O nome é provisório até o usuário
 * escolher; trocar é só aqui.
 */
export const NOME_DO_ASSISTENTE = "Assistente IA";

export const CHIPS_DO_ASSISTENTE = [
  { chave: "sugerir", rotulo: "Sugerir resposta", disponivel: true },
  { chave: "resumir", rotulo: "Resumir conversa", disponivel: false },
  { chave: "agendar", rotulo: "Agendar mensagem com texto da IA", disponivel: false },
  { chave: "campos", rotulo: "Preencher campos do CRM", disponivel: false },
] as const;
export type ChipDoAssistente = (typeof CHIPS_DO_ASSISTENTE)[number]["chave"];
