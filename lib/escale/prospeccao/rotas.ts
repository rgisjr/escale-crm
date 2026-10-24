/**
 * PARA ONDE A PROSPECÇÃO LEVA (fork Escale, Fase 8D; D8, D9). A aba em si é
 * `rotaDaAba("prospeccao")` da 8A.
 */
export const ROTA_DA_NOVA_PROSPECCAO = "/app/campaigns/prospeccao/nova";
export const rotaDoRascunhoDaProspeccao = (id: string): string =>
  `${ROTA_DA_NOVA_PROSPECCAO}?id=${id}`;
export const rotaDaCopiaDaProspeccao = (id: string): string =>
  `${ROTA_DA_NOVA_PROSPECCAO}?copiar=${id}`;
/** A conversa abre como em Contatos e no flutuante (`/app/inbox?id=`). */
export const rotaDaConversa = (id: string): string => `/app/inbox?id=${id}`;
export const rotaDoAgente = (id: string): string => `/app/ai/agents/${id}`;
