import type { StatusDaCampanha } from "@/lib/campanhas/tipos";
import {
  dataEHoraBr,
  numeroBr,
  porcento,
  type TomDoStatus,
  type Traduzir,
} from "@/lib/escale/campanhas/apresentacao";

import type {
  InfoDaCampanha,
  MotivoDoErro,
  PontoDoRitmo,
  ResultadoDaCampanha,
  SituacaoDoDestinatario,
  SituacaoDosNegocios,
  SumarioDaCampanha,
} from "./tipos";

/**
 * O QUE O DETALHE DA CAMPANHA MOSTRA (fork Escale, Fase 8C; N3–N12). Funções
 * puras: o servidor conta, aqui se decide rótulo, percentual e texto. Os textos
 * passam por `t` (quem chama traduz).
 */

const pct = (parte: number, base: number): string => {
  const p = porcento(parte, base);
  return p === null ? "—" : `${p}%`;
};

// ─── Cartões do topo (009) ─────────────────────────────────────────────────

export interface CartaoDoTopo {
  chave: "adicionados" | "enviados" | "entregues" | "respondidas";
  rotulo: string;
  dica: string;
  valor: string;
  complemento?: string;
}

export function cartoesDoTopo(s: SumarioDaCampanha): CartaoDoTopo[] {
  return [
    {
      chave: "adicionados",
      rotulo: "Adicionados p/ envio",
      dica: "Contatos da lista que podem receber a mensagem.",
      valor: numeroBr(s.adicionados),
    },
    {
      chave: "enviados",
      rotulo: "Enviados",
      dica: "Mensagens que saíram do número.",
      valor: numeroBr(s.enviados),
    },
    {
      chave: "entregues",
      rotulo: "Entregues",
      dica: "Percentual sobre os enviados.",
      valor: pct(s.entregues, s.enviados),
      complemento: numeroBr(s.entregues),
    },
    {
      chave: "respondidas",
      rotulo: "Respondidas",
      dica: "Percentual sobre os enviados.",
      valor: pct(s.respondidas, s.enviados),
      complemento: numeroBr(s.respondidas),
    },
  ];
}

// ─── Funil (009) ───────────────────────────────────────────────────────────

export interface EtapaDoFunil {
  chave: string;
  rotulo: string;
  quantidade: number;
  porcento: number | null;
}

export function etapasDoFunil(s: SumarioDaCampanha): EtapaDoFunil[] {
  const etapas: Array<[string, string, number]> = [
    ["enviados", "Enviados", s.enviados],
    ["entregues", "Entregues", s.entregues],
    ["lidas", "Lidas", s.lidas],
    ["respondidas", "Respondidas", s.respondidas],
  ];
  return etapas.map(([chave, rotulo, quantidade]) => ({
    chave,
    rotulo,
    quantidade,
    porcento: porcento(quantidade, s.enviados),
  }));
}

// ─── Rosca (009) ───────────────────────────────────────────────────────────

export type ChaveDaFatia = "lida" | "entregue" | "enviado" | "erro" | "nao_enviado" | "aguardando";

export const ROTULO_DA_FATIA: Record<ChaveDaFatia, string> = {
  lida: "Lida",
  entregue: "Entregue",
  enviado: "Enviado",
  erro: "Erro",
  nao_enviado: "Não enviado",
  aguardando: "Aguardando envio",
};

export interface FatiaDaRosca {
  chave: ChaveDaFatia;
  quantidade: number;
}

/** Disjuntas, somam os adicionados; "Aguardando envio" (nosso) só com alguém na fila. */
export function fatiasDaRosca(s: SumarioDaCampanha): FatiaDaRosca[] {
  const fatias: FatiaDaRosca[] = [
    { chave: "lida", quantidade: s.lidas },
    { chave: "entregue", quantidade: Math.max(0, s.entregues - s.lidas) },
    { chave: "enviado", quantidade: Math.max(0, s.enviados - s.entregues) },
    { chave: "erro", quantidade: s.erros },
    { chave: "nao_enviado", quantidade: s.naoEnviados },
    { chave: "aguardando", quantidade: s.aguardando },
  ];
  return fatias.filter((f) => f.chave !== "aguardando" || f.quantidade > 0);
}

export const leuSemResposta = (
  s: SumarioDaCampanha,
): { porcento: number | null; quantidade: number } => ({
  porcento: porcento(s.leuSemResposta, s.enviados),
  quantidade: s.leuSemResposta,
});

// ─── Motivos do erro (010) ─────────────────────────────────────────────────

const somaDasFalhas = (motivos: readonly MotivoDoErro[]) =>
  motivos.reduce((a, m) => a + m.quantidade, 0);

/** "3 motivos em 4 falhas de envio". */
export function resumoDosMotivos(motivos: readonly MotivoDoErro[], t: Traduzir): string {
  const n = motivos.length;
  const f = somaDasFalhas(motivos);
  const textoDosMotivos = n === 1 ? t("1 motivo") : t("{n} motivos").replace("{n}", numeroBr(n));
  const textoDasFalhas =
    f === 1 ? t("1 falha de envio") : t("{n} falhas de envio").replace("{n}", numeroBr(f));
  return t("{motivos} em {falhas}")
    .replace("{motivos}", textoDosMotivos)
    .replace("{falhas}", textoDasFalhas);
}

export const seloDasFalhas = (n: number, t: Traduzir): string =>
  n === 1 ? t("1 falha") : t("{n} falhas").replace("{n}", numeroBr(n));

/** "% sobre não entregues" (010): a parte das falhas da amostra. */
export const porcentoDoMotivo = (
  quantidade: number,
  motivos: readonly MotivoDoErro[],
): number | null => porcento(quantidade, somaDasFalhas(motivos));

// ─── Resultado (011) ───────────────────────────────────────────────────────

const decimalBr = (n: number): string =>
  (Math.round(n * 10) / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** "Tempo mediano até resposta" em min, h ou dias (material 3). */
export function textoDoTempoMediano(segundos: number | null, t: Traduzir): string {
  if (segundos === null || !Number.isFinite(segundos))
    return t("Não foi possível calcular o tempo de resposta.");
  if (segundos < 3600) return `${Math.max(1, Math.round(segundos / 60))} ${t("min")}`;
  if (segundos < 86_400) return `${decimalBr(segundos / 3600)} ${t("h")}`;
  return `${decimalBr(segundos / 86_400)} ${t("dias")}`;
}

export interface Comparacao {
  media: number | null;
  estaCampanha: number | null;
  /** `true` pinta "Esta campanha" de vermelho (011); `false`, de verde. */
  abaixo: boolean | null;
}

export function comparacaoDoBenchmark(r: ResultadoDaCampanha): Comparacao {
  const media = r.benchmark === null ? null : Math.round(r.benchmark * 100);
  const estaCampanha = r.taxaDaCampanha === null ? null : Math.round(r.taxaDaCampanha * 100);
  return {
    media,
    estaCampanha,
    abaixo: media === null || estaCampanha === null ? null : estaCampanha < media,
  };
}

/** "R$ 14.680,92" (o espaço comum, não o duro do Intl). */
export function reaisBr(centavos: number | null): string {
  if (centavos === null) return "—";
  return (centavos / 100)
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/\u00a0/g, " ");
}

export const ROTULO_DO_STATUS_DO_NEGOCIO: Record<"open" | "won" | "lost", string> = {
  open: "Em aberto",
  won: "Ganho",
  lost: "Perdido",
};

export const TITULO_DA_GAVETA: Record<SituacaoDosNegocios, string> = {
  todos: "Negócios criados por esta campanha",
  abertos: "Negócios em aberto criados por esta campanha",
  ganhos: "Negócios ganhos criados por esta campanha",
};

// ─── Ritmo e rodapé ────────────────────────────────────────────────────────

/** "2026-09-10T12:00:00" → "12:00"; com mais de um dia na amostra, "10/09 12:00". */
export function rotuloDaHora(hora: string, variosDias: boolean): string {
  const [data = "", resto = ""] = hora.split("T");
  const [, mes = "", dia = ""] = data.split("-");
  const hh = resto.slice(0, 5);
  return variosDias ? `${dia}/${mes} ${hh}` : hh;
}

export const varreDias = (pontos: readonly PontoDoRitmo[]): boolean =>
  new Set(pontos.map((p) => p.hora.slice(0, 10))).size > 1;

/** "Enviado em 10/09/2026 12:39" (011); antes do envio, a agenda ou a criação. */
export function rodapeDoSumario(
  c: Pick<InfoDaCampanha, "iniciadaEm" | "agendadaPara" | "criadaEm">,
  t: Traduzir,
  fuso?: string,
): string {
  if (c.iniciadaEm) return `${t("Enviado em")} ${dataEHoraBr(c.iniciadaEm, fuso)}`;
  if (c.agendadaPara)
    return t("Agendada para {data}").replace("{data}", dataEHoraBr(c.agendadaPara, fuso));
  return `${t("Criado em")} ${dataEHoraBr(c.criadaEm, fuso)}`;
}

// ─── Detalhes (012) ────────────────────────────────────────────────────────

/** O selo da linha (material 3, status do contato no WhatsApp; os dois últimos são nossos). */
export const ROTULO_DA_SITUACAO: Record<SituacaoDoDestinatario, string> = {
  enviado: "Enviado",
  entregue: "Recebido",
  lida: "Lido",
  respondido: "Respondido",
  erro: "Erro",
  nao_enviado: "Não enviado",
  aguardando: "Envio em andamento",
  fora_da_lista: "Fora da lista",
};

export const TOM_DA_SITUACAO: Record<SituacaoDoDestinatario, TomDoStatus> = {
  enviado: "cinza",
  entregue: "azul",
  lida: "verde",
  respondido: "verde",
  erro: "vermelho",
  nao_enviado: "laranja",
  aguardando: "ciano",
  fora_da_lista: "granito",
};

const ANTES_DO_ENVIO: ReadonlySet<StatusDaCampanha> = new Set(["draft", "ready", "scheduled"]);

/** "Excluir selecionados" só enquanto ninguém recebeu (PRD C12). */
export const podeTirarDaLista = (status: StatusDaCampanha, enviados: number): boolean =>
  ANTES_DO_ENVIO.has(status) && enviados === 0;

export const COLUNAS_DOS_DESTINATARIOS = [
  "telefone",
  "nome",
  "email",
  "situacao",
  "enviado_em",
  "motivo",
] as const;
export type ColunaDosDestinatarios = (typeof COLUNAS_DOS_DESTINATARIOS)[number];

export const ROTULO_DA_COLUNA: Record<ColunaDosDestinatarios, string> = {
  telefone: "Telefone",
  nome: "Nome",
  email: "Email",
  situacao: "Status",
  enviado_em: "Enviado em",
  motivo: "Motivo",
};

/** As de 012; "Enviado em" e "Motivo" começam escondidas. */
export const COLUNAS_PADRAO: readonly ColunaDosDestinatarios[] = [
  "telefone",
  "nome",
  "email",
  "situacao",
];
export const CHAVE_DAS_COLUNAS = "escale:campanha:colunas-dos-destinatarios";

/** O que o `localStorage` guardou → colunas válidas, na ordem fixa; o resto volta ao padrão. */
export function colunasDoTexto(texto: string | null): ColunaDosDestinatarios[] {
  if (!texto) return [...COLUNAS_PADRAO];
  try {
    const lido: unknown = JSON.parse(texto);
    if (!Array.isArray(lido)) return [...COLUNAS_PADRAO];
    const escolhidas = COLUNAS_DOS_DESTINATARIOS.filter((c) => lido.includes(c));
    return escolhidas.length > 0 ? escolhidas : [...COLUNAS_PADRAO];
  } catch {
    return [...COLUNAS_PADRAO];
  }
}

export const POR_PAGINA_DOS_DESTINATARIOS = [10, 20, 50, 100] as const;
export const POR_PAGINA_PADRAO_DOS_DESTINATARIOS = 20;

/** "1 a 20 de 30 contatos" (012). */
export function textoDoIntervalo(
  pagina: number,
  porPagina: number,
  total: number,
  t: Traduzir,
): string {
  if (total <= 0) return t("0 contatos");
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);
  return t("{inicio} a {fim} de {total} contatos")
    .replace("{inicio}", numeroBr(inicio))
    .replace("{fim}", numeroBr(fim))
    .replace("{total}", numeroBr(total));
}

export const textoDoTotal = (total: number, t: Traduzir): string =>
  total === 1 ? t("1 contato") : t("{n} contatos").replace("{n}", numeroBr(total));
