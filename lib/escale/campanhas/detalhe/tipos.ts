import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

/**
 * AS FORMAS DO DETALHE DA CAMPANHA (fork Escale, Fase 8C). O servidor
 * (`banco.ts`) monta, a rota devolve e a janela lê — um tipo só dos dois lados.
 */

/** As contagens do Sumário (9310). Todas sobre os elegíveis, menos `foraDaLista`. */
export interface SumarioDaCampanha {
  adicionados: number;
  /** Saíram e não falharam (a régua da 8A). */
  enviados: number;
  entregues: number;
  /** Leram ou responderam. */
  lidas: number;
  respondidas: number;
  /** Leram e ainda não responderam. */
  leuSemResposta: number;
  erros: number;
  /** Cancelados, pulados, opt-out e pessoais: não vão receber. */
  naoEnviados: number;
  /** Ainda na fila (pendente, na fila, enviando). */
  aguardando: number;
  foraDaLista: number;
}

/** Uma barra do ritmo: a hora LOCAL (fuso da organização), sem fuso no texto. */
export interface PontoDoRitmo {
  hora: string;
  envios: number;
}

export interface MotivoDoErro {
  codigo: string | null;
  quantidade: number;
}

export interface ResultadoDaCampanha {
  negocios: number;
  valorAbertoCentavos: number;
  valorGanhoCentavos: number;
  medianaSegundos: number | null;
  /** Média das taxas de resposta (0 a 1) das 5 últimas concluídas, sem esta. */
  benchmark: number | null;
  taxaDaCampanha: number | null;
}

export interface ModeloDaCampanha {
  nome: string;
  idioma: string | null;
  categoria: string | null;
}

export interface RitmoDaCampanha {
  intervaloSegundos: number | null;
  tetoDiario: number | null;
  tetoHorario: number | null;
  janelaInicioHora: number | null;
  janelaFimHora: number | null;
}

export interface InfoDaCampanha {
  id: string;
  nome: string;
  status: StatusDaCampanha;
  numeroId: string;
  numerosExtras: string[];
  mensagem: string | null;
  modelo: ModeloDaCampanha | null;
  baseLegal: string;
  liaRef: string | null;
  ritmo: RitmoDaCampanha;
  iniciadaEm: string | null;
  agendadaPara: string | null;
  criadaEm: string;
}

export interface DadosDoDetalhe {
  campanha: InfoDaCampanha;
  sumario: SumarioDaCampanha;
  ritmo: PontoDoRitmo[];
  motivos: MotivoDoErro[];
  resultado: ResultadoDaCampanha;
  /** O fuso da organização (as datas da janela). */
  fuso: string;
}

export type SituacaoDoDestinatario =
  | "enviado"
  | "entregue"
  | "lida"
  | "respondido"
  | "erro"
  | "nao_enviado"
  | "aguardando"
  | "fora_da_lista";

export interface LinhaDeDestinatario {
  id: string;
  contatoId: string;
  telefone: string | null;
  nome: string;
  email: string | null;
  situacao: SituacaoDoDestinatario;
  /** Código do erro (situação "erro") ou da exclusão ("fora_da_lista"). */
  motivo: string | null;
  enviadoEm: string | null;
}

export interface PaginaDeDestinatarios {
  linhas: LinhaDeDestinatario[];
  total: number;
  pagina: number;
  porPagina: number;
}

export type SituacaoDosNegocios = "todos" | "abertos" | "ganhos";

export interface NegocioDaCampanha {
  id: string;
  contato: string;
  telefone: string | null;
  origem: string;
  status: "open" | "won" | "lost";
  valorCentavos: number | null;
  criadoEm: string;
}

export interface NegociosDaCampanha {
  linhas: NegocioDaCampanha[];
  total: number;
}
