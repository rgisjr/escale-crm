/** Um painel como a lista e o painel aberto o recebem (fork Escale, Fase 7B). */
export type PainelDaLista = {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  /** ISO. */
  criadoEm: string;
  padrao: boolean;
  /** Só vêm para gerente ou acima (a aba Permissões); para agente, listas vazias. */
  permissoesUsuarios: string[];
  permissoesPapeis: string[];
};

/** O que o modal "Informações do Dashboard" edita. */
export type EdicaoDoPainel = {
  nome: string;
  cor: string;
  icone: string;
  permissoesUsuarios: string[];
  permissoesPapeis: string[];
};
