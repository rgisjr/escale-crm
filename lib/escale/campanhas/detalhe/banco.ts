import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { lerPoolExtra } from "@/lib/campanhas/pool-de-numeros";
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

import type { FiltroDeDestinatariosCompilado } from "./filtros";
import { modeloDaCampanha } from "./mensagem";
import type {
  DadosDoDetalhe,
  InfoDaCampanha,
  LinhaDeDestinatario,
  NegociosDaCampanha,
  PaginaDeDestinatarios,
  SituacaoDoDestinatario,
  SituacaoDosNegocios,
} from "./tipos";

/**
 * A LEITURA DO DETALHE DA CAMPANHA (fork Escale, Fase 8C) — servidor. As
 * funções da 9310 (invoker) contam com a sessão de quem olha; aqui só se dá
 * nome às colunas. `bigint` e `numeric` chegam como texto pelo PostgREST.
 *
 * A campanha é lida só com as colunas que `infoDaLinha` e `modeloDaCampanha`
 * leem: `select("*")` trazia `audience_filter` e `escale_publico` (listas de
 * até 5.000 ids) a cada reconsulta de 10 s, sem a tela usar (G8-7).
 */
export const COLUNAS_DO_DETALHE =
  "id, name, status, channel_session_id, message_body, escale_mensagem, base_legal, lia_ref, " +
  "intervalo_segundos, teto_diario, teto_horario, janela_inicio_hora, janela_fim_hora, " +
  "started_at, scheduled_at, created_at";
type Numero = number | string | null | undefined;

const numero = (v: Numero): number => Number(v ?? 0);
const numeroOuNulo = (v: Numero): number | null =>
  v === null || v === undefined ? null : Number(v);
const textoOuNulo = (v: unknown): string | null => (typeof v === "string" ? v : null);

export const LIMITE_DA_GAVETA = 200;

export const ehIdDeCampanha = (id: string): boolean => z.string().uuid().safeParse(id).success;

async function chamar<T>(
  supabase: SupabaseClient,
  nome: string,
  args: Record<string, unknown>,
): Promise<T[]> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw new Error(error.message);
  if (Array.isArray(data)) return data as T[];
  return data ? [data as T] : [];
}

export function infoDaLinha(
  l: Readonly<Record<string, unknown>>,
  numerosExtras: string[],
): InfoDaCampanha {
  return {
    id: String(l.id),
    nome: String(l.name ?? ""),
    status: l.status as StatusDaCampanha,
    numeroId: String(l.channel_session_id ?? ""),
    numerosExtras,
    mensagem: textoOuNulo(l.message_body),
    modelo: modeloDaCampanha(l),
    baseLegal: String(l.base_legal ?? ""),
    liaRef: textoOuNulo(l.lia_ref),
    ritmo: {
      intervaloSegundos: numeroOuNulo(l.intervalo_segundos as Numero),
      tetoDiario: numeroOuNulo(l.teto_diario as Numero),
      tetoHorario: numeroOuNulo(l.teto_horario as Numero),
      janelaInicioHora: numeroOuNulo(l.janela_inicio_hora as Numero),
      janelaFimHora: numeroOuNulo(l.janela_fim_hora as Numero),
    },
    iniciadaEm: textoOuNulo(l.started_at),
    agendadaPara: textoOuNulo(l.scheduled_at),
    criadaEm: String(l.created_at ?? ""),
  };
}

type LinhaDoSumario = Record<
  | "adicionados"
  | "enviados"
  | "entregues"
  | "lidas"
  | "respondidas"
  | "leu_sem_resposta"
  | "erros"
  | "nao_enviados"
  | "aguardando"
  | "fora_da_lista",
  Numero
>;

type LinhaDoResultado = Record<
  | "negocios"
  | "valor_aberto_centavos"
  | "valor_ganho_centavos"
  | "mediana_segundos"
  | "benchmark"
  | "taxa_da_campanha",
  Numero
>;

export async function lerDetalheDaCampanha(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  orgId: string,
  id: string,
  fuso: string | Promise<string>,
): Promise<DadosDoDetalhe | null> {
  const base = { p_org: orgId, p_campanha: id };
  // A linha da campanha, o fuso e as 5 leituras saem juntos, não em série (G8-8).
  // Campanha que não existe só desperdiça as leituras (todas por invoker/organização).
  const [lida, sumario, ritmo, motivos, resultado, extras] = await Promise.all([
    supabase
      .from("campaigns")
      .select(COLUNAS_DO_DETALHE)
      .eq("organization_id", orgId)
      .eq("id", id)
      .maybeSingle(),
    chamar<LinhaDoSumario>(supabase, "fn_escale_sumario_da_campanha", base),
    Promise.resolve(fuso).then((p_fuso) =>
      chamar<{ hora: string; envios: Numero }>(supabase, "fn_escale_ritmo_da_campanha", {
        ...base,
        p_fuso,
      }),
    ),
    chamar<{ codigo: string | null; quantidade: Numero }>(
      supabase,
      "fn_escale_motivos_do_erro",
      base,
    ),
    chamar<LinhaDoResultado>(supabase, "fn_escale_resultado_da_campanha", base),
    lerPoolExtra(admin, orgId, id),
  ]);
  if (lida.error) throw new Error(lida.error.message);
  const linha = lida.data;
  if (!linha) return null;
  const s = sumario[0];
  const r = resultado[0];
  return {
    campanha: infoDaLinha(linha as unknown as Record<string, unknown>, extras),
    sumario: {
      adicionados: numero(s?.adicionados),
      enviados: numero(s?.enviados),
      entregues: numero(s?.entregues),
      lidas: numero(s?.lidas),
      respondidas: numero(s?.respondidas),
      leuSemResposta: numero(s?.leu_sem_resposta),
      erros: numero(s?.erros),
      naoEnviados: numero(s?.nao_enviados),
      aguardando: numero(s?.aguardando),
      foraDaLista: numero(s?.fora_da_lista),
    },
    ritmo: ritmo.map((p) => ({ hora: p.hora, envios: numero(p.envios) })),
    motivos: motivos.map((m) => ({ codigo: m.codigo, quantidade: numero(m.quantidade) })),
    resultado: {
      negocios: numero(r?.negocios),
      valorAbertoCentavos: numero(r?.valor_aberto_centavos),
      valorGanhoCentavos: numero(r?.valor_ganho_centavos),
      medianaSegundos: numeroOuNulo(r?.mediana_segundos),
      benchmark: numeroOuNulo(r?.benchmark),
      taxaDaCampanha: numeroOuNulo(r?.taxa_da_campanha),
    },
    fuso: await fuso,
  };
}

type LinhaDaPagina = {
  destinatario_id: string;
  contato_id: string;
  telefone: string | null;
  nome: string | null;
  email: string | null;
  situacao: string;
  motivo: string | null;
  enviado_em: string | null;
  total: Numero;
};

/** O teto de linhas por resposta do PostgREST (`max_rows`, 1.000 no Supabase). */
const PAGINA_DO_BANCO = 1000;
/** O corte da própria função de seleção (`limit 100001`). */
const TETO_DA_SELECAO = 100_001;

export type AlvoDaSelecao = { destinatario_id: string; contato_id: string };

/**
 * Todos os alvos da seleção, página a página: o PostgREST corta cada resposta em
 * `max_rows` (1.000) e a função devolve até 100.001. Sem isto, "Selecionar todos
 * os N" agia só nos primeiros 1.000 e dizia que deu certo. A ordem da função é
 * fixa (created_at, id), então as faixas não se repetem nem pulam linha.
 */
export async function lerSelecaoDaCampanha(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<AlvoDaSelecao[]> {
  const todos: AlvoDaSelecao[] = [];
  while (todos.length < TETO_DA_SELECAO) {
    const { data, error } = await supabase
      .rpc("fn_escale_selecao_da_campanha", args)
      .range(todos.length, todos.length + PAGINA_DO_BANCO - 1);
    if (error) throw new Error(error.message);
    const linhas = (data ?? []) as AlvoDaSelecao[];
    if (linhas.length === 0) break;
    todos.push(...linhas);
  }
  return todos.slice(0, TETO_DA_SELECAO);
}

/**
 * Os destinatários até `teto` linhas, em páginas de 1.000 (o corte do
 * PostgREST). O fim é o total da 1ª página, não a página curta: o `max_rows` da
 * instalação pode ser menor que 1.000.
 */
export async function lerDestinatariosAteOTeto(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  filtro: FiltroDeDestinatariosCompilado,
  teto: number,
): Promise<PaginaDeDestinatarios> {
  let pagina = await lerDestinatarios(supabase, orgId, id, filtro, 1, PAGINA_DO_BANCO);
  const linhas = [...pagina.linhas];
  const alvo = Math.min(pagina.total, teto);
  let n = 1;
  while (linhas.length < alvo) {
    n += 1;
    pagina = await lerDestinatarios(supabase, orgId, id, filtro, n, PAGINA_DO_BANCO);
    if (pagina.linhas.length === 0) break;
    linhas.push(...pagina.linhas);
  }
  return { ...pagina, linhas: linhas.slice(0, teto), pagina: 1, porPagina: teto };
}

export async function lerDestinatarios(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  filtro: FiltroDeDestinatariosCompilado,
  pagina: number,
  porPagina: number,
): Promise<PaginaDeDestinatarios> {
  const linhas = await chamar<LinhaDaPagina>(supabase, "fn_escale_destinatarios_da_campanha", {
    p_org: orgId,
    p_campanha: id,
    p_filtros: filtro,
    p_limite: porPagina,
    p_deslocamento: (pagina - 1) * porPagina,
  });
  return {
    linhas: linhas.map((l): LinhaDeDestinatario => ({
      id: l.destinatario_id,
      contatoId: l.contato_id,
      telefone: l.telefone,
      nome: l.nome ?? "",
      email: l.email,
      situacao: l.situacao as SituacaoDoDestinatario,
      motivo: l.motivo,
      enviadoEm: l.enviado_em,
    })),
    total: numero(linhas[0]?.total),
    pagina,
    porPagina,
  };
}

type LinhaDoNegocio = {
  lead_id: string;
  contato: string | null;
  telefone: string | null;
  origem: string | null;
  status: "open" | "won" | "lost";
  valor_centavos: Numero;
  criado_em: string;
  total: Numero;
};

export async function lerNegocios(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  situacao: SituacaoDosNegocios,
): Promise<NegociosDaCampanha> {
  const linhas = await chamar<LinhaDoNegocio>(supabase, "fn_escale_negocios_da_campanha", {
    p_org: orgId,
    p_campanha: id,
    p_situacao: situacao,
    p_limite: LIMITE_DA_GAVETA,
  });
  return {
    linhas: linhas.map((l) => ({
      id: l.lead_id,
      contato: l.contato ?? "",
      telefone: l.telefone,
      origem: l.origem ?? "",
      status: l.status,
      valorCentavos: numeroOuNulo(l.valor_centavos),
      criadoEm: l.criado_em,
    })),
    total: numero(linhas[0]?.total),
  };
}
