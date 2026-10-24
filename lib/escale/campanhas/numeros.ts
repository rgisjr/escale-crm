/**
 * OS NÚMEROS DO ASSISTENTE (fork Escale, Fase 8B; N4). "Oficial" é a capacidade
 * do canal (não aceita texto livre fora da janela), nunca o nome do provedor
 * (cerca `lint:channels`). `provider` só viaja para `useModelosDeMensagem`.
 */
export interface NumeroDaCampanha {
  id: string;
  nome: string;
  telefone: string | null;
  conectado: boolean;
  oficial: boolean;
  provider: string | null;
  setor: string | null;
}

export const GRUPO_OFICIAL = "WhatsApp Oficial";
export const GRUPO_NAO_OFICIAL = "WhatsApp não oficial";

export const grupoDoNumero = (n: Pick<NumeroDaCampanha, "oficial">): string =>
  n.oficial ? GRUPO_OFICIAL : GRUPO_NAO_OFICIAL;
