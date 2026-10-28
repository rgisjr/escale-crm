/**
 * Tipos do catálogo de Indicadores (fork Escale, Fase 7A). O catálogo é código: o cliente
 * manda só ids, e o motor troca cada id pelo fragmento SQL daqui. Nenhum identificador SQL
 * vem do navegador.
 */
export const UNIDADES = ["contagem", "valor", "percentual", "duracao"] as const;
export type Unidade = (typeof UNIDADES)[number];
export const CATEGORIAS = ["negocios", "atividades", "conversas", "ligacoes", "campanhas"] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export type TipoDeDimensao = "texto" | "numero" | "data" | "booleano";
/** De onde a tela busca as opções do seletor múltiplo do filtro (7D). */
export type FonteDeOpcoes =
  | "etapas"
  | "origens"
  | "grupos_de_origem"
  | "usuarios"
  | "status_do_negocio"
  | "motivos_de_perda"
  | "moedas"
  | "canais"
  | "numeros"
  | "tipos_de_atividade"
  | "status_da_conversa"
  | "status_da_campanha"
  | "campanhas"
  | "tags"
  | "fontes";
export type ObjetoDeCampoDoCatalogo = "negocio" | "contato" | "empresa";
export type ChaveDoFiltroDoPainel = "usuario" | "origem" | "grupo_de_origem" | "tags";

export interface Textos {
  nome: string;
  descricao: string;
  apelidos: readonly string[];
  perguntas: readonly string[];
  antesDeUsar?: string;
}
export interface Medida extends Textos {
  /** `<assunto>.<chave>`, ex.: "negocio.ganhos" */
  id: string;
  unidade: Unidade;
  /** Expressão agregada; só aliases declarados em `Assunto.joins` ou o alias da base. */
  sql: string;
  /** Soma/média de `value_cents`: o motor acrescenta `count(distinct b.currency)` e avisa se > 1. */
  moeda?: boolean;
  /** Aliases de join necessários. */
  precisa?: readonly string[];
}
export interface Dimensao {
  id: string;
  nome: string;
  tipo: TipoDeDimensao;
  /** A chave (o que agrupa e o que o filtro compara). */
  sql: string;
  /** O rótulo humano, quando é outra coluna (nome da etapa). Sem ele, o rótulo é a chave. */
  rotuloSql?: string;
  precisa?: readonly string[];
  opcoes?: FonteDeOpcoes;
  /** Dimensão multivalorada por `lateral unnest`: conta uma linha por valor. */
  multivalorada?: boolean;
  /** A chave é uuid: a comparação do filtro vai por `::text` para um id inválido nunca derrubar a consulta. */
  uuid?: boolean;
  /** Fase 7D (S10): expressão da ordem natural (ex.: "s.position"); só aliases de `precisa`. Nunca sai para o navegador. */
  ordemNatural?: string;
  /** Fase 7D (S6): texto do detalhe no catálogo (vazio até a 7G). */
  descricao?: string;
}
export interface CampoDeTempo {
  id: string;
  nome: string;
  /** Expressão timestamptz. */
  sql: string;
  padrao?: boolean;
  precisa?: readonly string[];
  /** Fase 7D (S6): texto do detalhe no catálogo (vazio até a 7G). */
  descricao?: string;
}
export interface ColunaDoDetalhamento {
  chave: string;
  nome: string;
  sql: string;
  precisa?: readonly string[];
}
export interface JoinDoAssunto {
  sql: string;
  precisa?: readonly string[];
}
export interface Assunto {
  id: string;
  nome: string;
  categoria: Categoria;
  /** "Uma linha por negócio." */
  umaLinhaPor: string;
  perguntas: readonly string[];
  /** Ex.: "public.crm_leads" com alias "b". */
  base: { tabela: string; alias: string; condicaoFixa?: string };
  /** alias → cláusula completa do join (a ordem de declaração é a ordem no SQL). */
  joins: Readonly<Record<string, JoinDoAssunto>>;
  medidas: readonly Medida[];
  dimensoes: readonly Dimensao[];
  tempos: readonly CampoDeTempo[];
  /** Como cada filtro do painel se aplica; ausente = o assunto não aceita (a Clint: Chat só aceita Campos). */
  filtroDoPainel: Partial<Record<ChaveDoFiltroDoPainel, { sql: string; precisa?: readonly string[] }>>;
  /** Objetos cujos campos personalizados entram como variável, filtro e coluna, e a expressão jsonb de cada um. */
  camposPersonalizados: Partial<Record<ObjetoDeCampoDoCatalogo, { sql: string; precisa?: readonly string[] }>>;
  colunasDoDetalhamento: readonly ColunaDoDetalhamento[];
}

export const INDICADORES_POR_PERGUNTA_MAX = 5;
export const VARIAVEIS_POR_PERGUNTA_MAX = 2;
export const CONDICOES_MAX = 20;
export const LINHAS_MAX = 5000;
export const TEMPO_MAXIMO_MS = 8000;
export const DIAS_MAX_POR_HORA = 31;
