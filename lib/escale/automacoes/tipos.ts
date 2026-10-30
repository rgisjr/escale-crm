import type { CorDaPasta, IconeDaPasta } from "./pastas";
import type { FormaDeMontar } from "./rotas";

export interface AutomacaoDaLista {
  id: string;
  nome: string;
  ativa: boolean;
  /** `automation_rules.updated_at` (a "Última alteração"). */
  atualizadaEm: string;
  pastaId: string | null;
  /** `null` = sem registro na casca (abre no fluxo, Q2). */
  forma: FormaDeMontar | null;
  favorita: boolean;
  /** Ids dos agentes das ações "Mensagem pela IA", já filtrados pelos agentes conhecidos (Q1). */
  agentes: string[];
}

export interface PastaDeAutomacao {
  id: string;
  nome: string;
  cor: CorDaPasta;
  icone: IconeDaPasta;
}

export interface AgenteDaLista {
  id: string;
  nome: string;
}

export interface ListaDeAutomacoes {
  automacoes: AutomacaoDaLista[];
  pastas: PastaDeAutomacao[];
  agentes: AgenteDaLista[];
}

export type Visao =
  | { tipo: "todas" }
  | { tipo: "favoritos" }
  | { tipo: "pasta"; id: string }
  | { tipo: "sem_pasta" };

export type StatusDoFiltro = "ativa" | "pausada";
/** "sem_agente" ou o id de um agente. */
export type AgenteDoFiltro = string;

export interface FiltrosDaLista {
  visao: Visao;
  busca: string;
  status: readonly StatusDoFiltro[];
  agentes: readonly AgenteDoFiltro[];
}

export type ColunaDeOrdem = "nome" | "status" | "atualizada";
export interface Ordem {
  coluna: ColunaDeOrdem;
  direcao: "asc" | "desc";
}
export const ORDEM_PADRAO: Ordem = { coluna: "atualizada", direcao: "desc" };
