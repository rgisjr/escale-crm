import {
  NOME_MAX,
  NOME_MIN,
  POS_ENVIO_PADRAO,
  PUBLICO_VAZIO,
  type Assistente,
  type PosEnvio,
  type PublicoDaCampanha,
} from "./assistente";
import { contagemResolvida, variaveisDoCorpo } from "./modelo";
import type { NumeroDaCampanha } from "./numeros";
import { publicoVazio } from "./publico";

/** O ESTADO DO ASSISTENTE (fork Escale, Fase 8B; N14). Puro: a tela só despacha. */
export const PASSOS_DO_ASSISTENTE = [
  "Configure a sua campanha",
  "Escolha seus contatos",
  "Configurações opcionais",
  "Confirme seu envio",
] as const;
export type Passo = 0 | 1 | 2 | 3;

export const ASSISTENTE_VAZIO: Assistente = {
  nome: "",
  numeroId: "",
  mensagem: { tipo: "texto", texto: "" },
  quando: { modo: "agora" },
  baseLegal: "consent",
  lia: null,
  publico: PUBLICO_VAZIO,
  posEnvio: POS_ENVIO_PADRAO,
  agenteId: null,
  ritmo: {},
  numerosExtras: [],
};

export interface EstadoDoAssistente {
  passo: Passo;
  campanhaId: string | null;
  dados: Assistente;
  /** O "Próximo" foi apertado com erro: os avisos aparecem. */
  tentou: boolean;
  publicoAntigo: boolean;
  /** A importação do .csv em andamento: vive aqui para sobreviver à troca de passo (B8-6). */
  importacaoId: string | null;
}

export type AcaoDoAssistente =
  | { tipo: "mudar"; campos: Partial<Assistente> }
  | { tipo: "mudarPosEnvio"; campos: Partial<PosEnvio> }
  | { tipo: "mudarPublico"; publico: PublicoDaCampanha }
  | { tipo: "irPara"; passo: Passo }
  | { tipo: "tentou" }
  | { tipo: "importacao"; id: string | null }
  | { tipo: "salvo"; campanhaId: string }
  | { tipo: "carregar"; campanhaId: string; dados: Assistente; publicoAntigo: boolean }
  | { tipo: "reiniciar" };

export const estadoInicial = (): EstadoDoAssistente => ({
  passo: 0,
  campanhaId: null,
  dados: ASSISTENTE_VAZIO,
  tentou: false,
  publicoAntigo: false,
  importacaoId: null,
});

export function redutorDoAssistente(
  e: EstadoDoAssistente,
  a: AcaoDoAssistente,
): EstadoDoAssistente {
  switch (a.tipo) {
    case "mudar":
      return { ...e, dados: { ...e.dados, ...a.campos } };
    case "mudarPosEnvio":
      return { ...e, dados: { ...e.dados, posEnvio: { ...e.dados.posEnvio, ...a.campos } } };
    case "mudarPublico":
      return { ...e, dados: { ...e.dados, publico: a.publico }, publicoAntigo: false };
    case "irPara":
      return { ...e, passo: a.passo, tentou: false };
    case "tentou":
      return { ...e, tentou: true };
    case "importacao":
      return { ...e, importacaoId: a.id };
    case "salvo":
      return { ...e, campanhaId: a.campanhaId };
    case "carregar":
      return {
        passo: 0,
        campanhaId: a.campanhaId,
        dados: a.dados,
        tentou: false,
        publicoAntigo: a.publicoAntigo,
        importacaoId: null,
      };
    case "reiniciar":
      return estadoInicial();
  }
}

/** Trocar de número muda o tipo de mensagem que ele aceita (N4, N5) e tira o rodízio do oficial (P3). */
export function aoTrocarNumero(dados: Assistente, numero: NumeroDaCampanha): Partial<Assistente> {
  const extras = numero.oficial ? [] : dados.numerosExtras.filter((id) => id !== numero.id);
  if (numero.oficial && dados.mensagem.tipo !== "modelo") {
    return {
      numeroId: numero.id,
      numerosExtras: extras,
      mensagem: { tipo: "modelo", nome: "", idioma: "", categoria: null, corpo: "", variaveis: {} },
    };
  }
  if (!numero.oficial && dados.mensagem.tipo === "modelo") {
    return { numeroId: numero.id, numerosExtras: extras, mensagem: { tipo: "texto", texto: "" } };
  }
  return { numeroId: numero.id, numerosExtras: extras };
}

/** O agendamento que "Criar agendamento" propõe: daqui a uma hora, em minutos redondos de 5. */
export function quandoPadrao(agora: Date): string {
  const d = new Date(agora.getTime() + 60 * 60_000);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(Math.ceil(d.getUTCMinutes() / 5) * 5);
  return d.toISOString();
}

export interface ContextoDosErros {
  numero: NumeroDaCampanha | null;
  agora: Date;
}

/** Os avisos de cada passo, em português (a tela traduz). Vazio = pode avançar. */
export function errosDoPasso(
  passo: Passo,
  d: Assistente,
  ctx: ContextoDosErros,
): Record<string, string> {
  const erros: Record<string, string> = {};
  if (passo === 0) {
    const nome = d.nome.trim();
    if (nome.length < NOME_MIN) erros.nome = "O nome da campanha deve ter pelo menos 3 caracteres.";
    if (nome.length > NOME_MAX) erros.nome = "O nome da campanha deve ter no máximo 80 caracteres.";
    if (!d.numeroId || !ctx.numero) erros.numeroId = "Escolha o dispositivo de WhatsApp.";
    if (d.mensagem.tipo === "texto") {
      if (d.mensagem.texto.trim() === "") erros.mensagem = "Escreva a mensagem.";
    } else if (d.mensagem.nome === "") {
      erros.mensagem = "Escolha um modelo de mensagem.";
    } else {
      const chaves = variaveisDoCorpo(d.mensagem.corpo);
      const { feitas, total } = contagemResolvida(chaves, d.mensagem.variaveis);
      if (feitas < total) erros.mensagem = "Resolva as variáveis do modelo para avançar.";
    }
    if (d.quando.modo === "agendar") {
      const em = new Date(d.quando.em);
      if (Number.isNaN(em.getTime())) erros.quando = "Você precisa selecionar uma data.";
      else if (em.getTime() <= ctx.agora.getTime())
        erros.quando = "A hora selecionada não pode ser menor que o horário atual.";
    }
    if (d.baseLegal === "legitimate_interest" && (d.lia ?? "").trim() === "") {
      erros.lia = "Interesse legítimo exige a referência da avaliação (LIA).";
    }
  }
  if (passo === 1 && publicoVazio(d.publico))
    erros.publico = "Você deve selecionar pelo menos um contato.";
  if (passo === 2 && d.posEnvio.origemId && !d.posEnvio.etapaId)
    erros.etapaId = "Selecione uma etapa";
  return erros;
}
