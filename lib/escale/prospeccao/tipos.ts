import type { CampaignConfig, Prospect, SearchInput } from "@/lib/prospecting/schema";

/**
 * AS FORMAS DA PROSPECÇÃO NA CASCA (fork Escale, Fase 8D). O servidor
 * (`banco.ts`) monta, as rotas devolvem e as telas leem — um tipo só dos dois
 * lados. O motor é o do original (`lib/prospecting/`), que não muda.
 */

/** A situação mostrada na coluna Status (D3), derivada de `status` + `search_status`. */
export const SITUACOES_DA_PROSPECCAO = [
  "buscando",
  "erro_na_busca",
  "rascunho",
  "em_progresso",
  "pausada",
  "completa",
] as const;
export type SituacaoDaProspeccao = (typeof SITUACOES_DA_PROSPECCAO)[number];

/** O progresso de uma empresa: o status do motor, ou `replied`/`qualified` pela régua do original (D4). */
export const PROGRESSOS_DA_EMPRESA = [
  "new",
  "queued",
  "sending",
  "sent",
  "skipped",
  "failed",
  "replied",
  "qualified",
] as const;
export type ProgressoDaEmpresa = (typeof PROGRESSOS_DA_EMPRESA)[number];

export interface ContagemDaProspeccao {
  encontradas: number;
  naFila: number;
  /** Receberam a primeira mensagem (inclui quem respondeu e quem se qualificou). */
  abordadas: number;
  /** Responderam (inclui as qualificadas). */
  responderam: number;
  qualificadas: number;
  falhas: number;
  naoAbordadas: number;
}

export interface LinhaDeProspeccao extends ContagemDaProspeccao {
  id: string;
  nome: string;
  situacao: SituacaoDaProspeccao;
  /** O número da configuração; `null` antes de iniciar. */
  numeroId: string | null;
  criadaEm: string;
  /** A primeira abordagem (a "Data de início", A3). */
  primeiraAbordagem: string | null;
}

export interface PaginaDeProspeccoes {
  linhas: LinhaDeProspeccao[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface EmpresaDaProspeccao {
  id: string;
  dados: Prospect;
  /** O status do motor (`new`, `queued`, `sending`, `sent`, `skipped`, `failed`). */
  status: string;
  selecionada: boolean;
  erro: string | null;
  negocioId: string | null;
  conversaId: string | null;
  abordadaEm: string | null;
  statusDaMensagem: string | null;
  progresso: ProgressoDaEmpresa;
}

export type StatusDoMotor = "draft" | "running" | "paused" | "completed";

export interface DetalheDaProspeccao {
  linha: LinhaDeProspeccao;
  status: StatusDoMotor;
  statusDaBusca: string;
  busca: SearchInput;
  config: CampaignConfig | null;
  custoUsd: number | null;
  /** Resultados repetidos ou indisponíveis que a busca desconsiderou. */
  repetidas: number;
  erro: string | null;
  empresas: EmpresaDaProspeccao[];
}

export interface OpcoesDaProspeccao {
  configurada: boolean;
  agentes: { id: string; nome: string }[];
  /** Só os números que aceitam iniciar conversa com texto livre (não oficiais). */
  numeros: { id: string; nome: string; telefone: string | null; status: string }[];
  etapas: { id: string; nome: string; funilId: string; funilNome: string }[];
}

export interface FiltrosDaProspeccao {
  busca?: string;
  situacoes?: SituacaoDaProspeccao[];
}
