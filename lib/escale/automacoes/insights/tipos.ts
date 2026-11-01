import type {
  AutomationRuleRunActionResult,
  AutomationRunStatus,
} from "@/hooks/webhooks/useAutomationRules";

export type PeriodoDosInsights = "7d" | "30d" | "90d" | "tudo";

/** Um passo do resumo: as contagens de `actions_result[indice]` com aquele `tipo` (I5). */
export interface PassoDoResumo {
  indice: number;
  tipo: string;
  sucesso: number;
  erro: number;
  esperando: number;
}

export interface ResumoDaAutomacao {
  total: number;
  sucesso: number;
  parcial: number;
  falhou: number;
  adiado: number;
  /** ISO da execução mais recente da regra, fora do período (I4); null sem nenhuma. */
  ultima: string | null;
  passos: PassoDoResumo[];
}

/** O resultado de um passo como a tela agrupa (I6). */
export type ResultadoDoPasso = "sucesso" | "erro" | "esperando";

export interface ContatoDaExecucao {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  temFoto: boolean;
}
export interface NegocioDaExecucao {
  id: string;
  titulo: string;
}

export interface LinhaDaExecucao {
  id: string;
  status: AutomationRunStatus;
  criadaEm: string;
  eventoId: string | null;
  resultados: AutomationRuleRunActionResult[];
  contato: ContatoDaExecucao | null;
  negocio: NegocioDaExecucao | null;
}

/** A posição de uma ação na fila do motor e o tipo dela (I5). */
export interface ReferenciaDeAcao {
  indice: number;
  tipo: string;
}

/** O tipo dos cartões de um passo "Ações" que junta várias ações. */
export const TIPO_DO_CARTAO_DO_GRUPO = "grupo_de_acoes";

/**
 * O filtro da listagem. No painel, filtra pelo status da execução; num passo, pelo
 * resultado das ações dele (um passo "Ações" da tela pode juntar várias, daí a lista).
 * `tipoDoCartao` diz quais cartões o passo tem (o tipo da ação, ou o do grupo).
 */
export type FiltroDasExecucoes =
  | { origem: "painel"; situacoes: AutomationRunStatus[] }
  | {
      origem: "passo";
      acoes: ReferenciaDeAcao[];
      tipoDoCartao: string;
      resultados: ResultadoDoPasso[];
    }
  | { origem: "condicoes" };

/** Um número clicável (painel ou nó). `filtro` null = não abre a listagem (Última execução). */
export interface CartaoDeNumero {
  chave: string;
  rotulo: string;
  valor: number | string;
  filtro: FiltroDasExecucoes | null;
  dica?: string;
}
