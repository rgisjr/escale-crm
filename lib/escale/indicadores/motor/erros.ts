export type CodigoDoErroDoMotor =
  | "pergunta_invalida"
  | "consulta_demorou"
  | "fila_cheia"
  | "sem_sessao"
  | "banco_indisponivel"
  | "sem_detalhamento";

/** Aviso (não erro) que o motor devolve junto do resultado quando a comparação não tem período. */
export const AVISO_COMPARACAO_SEM_PERIODO = "comparacao_sem_periodo";

/** Erro do motor de Indicadores; a rota troca o código por uma resposta HTTP e um texto traduzido. */
export class ErroDoMotor extends Error {
  constructor(
    public readonly codigo: CodigoDoErroDoMotor,
    detalhe?: string,
  ) {
    super(detalhe ?? codigo);
    this.name = "ErroDoMotor";
  }
}
