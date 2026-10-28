/**
 * Executa a consulta com a sessão de quem olha (fork Escale, Fase 7A): transação `read only`,
 * `set local role authenticated` e as claims da pessoa, para a RLS das tabelas decidir o que
 * ela vê. A service role nunca entra. Teto de 8 s e de linhas.
 */
import type pg from "pg";
import type { PoolClient } from "pg";

import { logger } from "@/lib/logger";

import { medidaPorId } from "../catalogo";
import { CELULAS_DA_MATRIZ, LINHAS_DO_CSV_DO_DETALHAMENTO_MAX, LINHAS_DO_DETALHAMENTO_MAX, TEMPO_MAXIMO_MS } from "../catalogo/tipos";
import type { CampoDinamico } from "../catalogo/campos-personalizados";
import type { Detalhamento, DetalhamentoParaCsv, FiltroDoPainel, Pergunta } from "../pergunta";
import { montarSqlDoDetalhamento, type ColunaDaPagina } from "./detalhamento";
import { ErroDoMotor } from "./erros";
import { hojeNoFuso, periodoAnterior, type IntervaloDeDias } from "./periodo";
import { montarTabela, type Linha } from "./series";
import { montarSql, type Coluna } from "./sql";

export interface Sessao {
  orgId: string;
  userId: string;
  fuso: string;
}
export interface Resultado {
  colunas: Coluna[];
  linhas: Linha[];
  truncado: boolean;
  duracaoMs: number;
  avisos: ("moedas_diferentes" | "filtro_do_painel_ignorado" | "granularidade_ajustada" | "comparacao_sem_periodo")[];
  ignorados: string[];
  /** Fase 7E: o período efetivo no fuso da organização e o dia de hoje (para a projeção). null = "Tudo". */
  periodo?: { de: string; ate: string; hoje: string } | null;
  /** Fase 7E: só com comparação, as linhas do ramo anterior já separadas. */
  comparacao?: { periodo: IntervaloDeDias; linhas: Linha[]; truncado: boolean };
}
export interface DependenciasDoExecutor {
  agora?: () => Date;
  camposDaOrg?: ReadonlyMap<string, CampoDinamico>;
}

const CODIGO_TEMPO_ESGOTADO = "57014";
const CODIGOS_DE_PERMISSAO_OU_TABELA = new Set(["42501", "42P01"]);

function traduzirErro(erro: unknown): ErroDoMotor {
  if (erro instanceof ErroDoMotor) return erro;
  const codigo = (erro as { code?: string } | null)?.code;
  if (codigo === CODIGO_TEMPO_ESGOTADO) return new ErroDoMotor("consulta_demorou");
  // A mensagem real fica no log do servidor; quem chama recebe só o código.
  logger.error("indicadores.consulta_falhou", { codigo, motivo: (erro as Error | null)?.message });
  return new ErroDoMotor("banco_indisponivel", CODIGOS_DE_PERMISSAO_OU_TABELA.has(codigo ?? "") ? "permissao" : "erro");
}

/**
 * A sequência de sessão de quem olha, comum à agregação e ao detalhamento: transação `read only`,
 * papel `authenticated`, claims da pessoa, teto de tempo, e `rollback` no fim.
 */
async function comSessao<T>(pool: pg.Pool, sessao: Sessao, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  if (!sessao.userId) throw new ErroDoMotor("sem_sessao");
  const cliente = await pool.connect().catch((erro: unknown) => {
    throw traduzirErro(erro);
  });
  let falhaAoDesfazer: Error | undefined;
  try {
    await cliente.query("begin read only");
    await cliente.query("set local role authenticated");
    await cliente.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: sessao.userId, role: "authenticated" }),
    ]);
    await cliente.query(`set local statement_timeout = '${TEMPO_MAXIMO_MS}'`);
    return await fn(cliente);
  } catch (erro) {
    throw traduzirErro(erro);
  } finally {
    try {
      await cliente.query("rollback");
    } catch (erro) {
      falhaAoDesfazer = erro as Error;
    }
    // Conexão que não conseguiu desfazer a transação é descartada, não devolvida ao pool.
    cliente.release(falhaAoDesfazer);
  }
}

const contextoDe = (sessao: Sessao, deps: DependenciasDoExecutor) => ({
  orgId: sessao.orgId,
  fuso: sessao.fuso,
  agora: (deps.agora ?? (() => new Date()))(),
  camposDaOrg: deps.camposDaOrg ?? new Map(),
});

/** Indicadores monetários: medidas com moeda e calculados em moeda cujo operando tem moeda. */
function colunasMonetarias(pergunta: Pergunta): Set<string> {
  const monetarios = new Set(pergunta.indicadores.flatMap((id, i) => (medidaPorId(id)?.medida.moeda ? [`i${i}`] : [])));
  pergunta.calculados.forEach((c, i) => {
    if (c.formato === "moeda" && [c.a, c.b].some((id) => medidaPorId(id)?.medida.moeda)) monetarios.add(`c${i}`);
  });
  return monetarios;
}

export async function consultar(
  pool: pg.Pool,
  sessao: Sessao,
  pergunta: Pergunta,
  painel?: FiltroDoPainel,
  deps: DependenciasDoExecutor = {},
): Promise<Resultado> {
  if (!sessao.userId) throw new ErroDoMotor("sem_sessao");
  const ctx = contextoDe(sessao, deps);
  const montado = montarSql(pergunta, painel, ctx);
  const inicio = Date.now();
  return comSessao(pool, sessao, async (cliente) => {
    const resposta = await cliente.query({ text: montado.text, values: montado.values, rowMode: "array" });
    const limite = pergunta.matrizDeTempo ? CELULAS_DA_MATRIZ : pergunta.limite;
    const posicaoDoPeriodo = montado.colunas.findIndex((c) => c.papel === "periodo");
    const cruas = resposta.rows as unknown[][];
    const doRamo = (ramo: "atual" | "anterior"): unknown[][] =>
      posicaoDoPeriodo < 0 ? cruas : cruas.filter((l) => l[posicaoDoPeriodo] === ramo);
    const cortar = (linhas: unknown[][]) => ({ truncado: linhas.length > limite, linhas: linhas.slice(0, limite) });
    const atual = cortar(doRamo("atual"));
    // A coluna `periodo` fica fora de `colunas`: ela só separa os ramos.
    const colunas = montado.colunas.filter((c) => c.papel !== "periodo");
    const semPeriodo = (linhas: unknown[][]) =>
      posicaoDoPeriodo < 0 ? linhas : linhas.map((l) => l.filter((_, i) => i !== posicaoDoPeriodo));
    const monetarios = colunasMonetarias(pergunta);
    const tabela = montarTabela(colunas, semPeriodo(atual.linhas), monetarios);
    const hoje = hojeNoFuso(ctx.agora, ctx.fuso);
    const avisos: Resultado["avisos"] = [
      ...tabela.avisos,
      ...(montado.ignorados.length ? (["filtro_do_painel_ignorado"] as const) : []),
      ...(montado.granularidadeAjustada ? (["granularidade_ajustada"] as const) : []),
      ...(montado.comparacaoSemPeriodo ? (["comparacao_sem_periodo"] as const) : []),
    ];
    let comparacao: Resultado["comparacao"];
    if (montado.comparacao && montado.periodo && pergunta.comparacao) {
      const anterior = cortar(doRamo("anterior"));
      comparacao = {
        periodo: periodoAnterior(montado.periodo, pergunta.comparacao.modo),
        linhas: montarTabela(colunas, semPeriodo(anterior.linhas), monetarios).linhas,
        truncado: anterior.truncado,
      };
    }
    return {
      colunas: tabela.colunas,
      linhas: tabela.linhas,
      truncado: atual.truncado,
      duracaoMs: Date.now() - inicio,
      avisos,
      ignorados: montado.ignorados,
      periodo: montado.periodo ? { ...montado.periodo, hoje } : null,
      ...(comparacao ? { comparacao } : {}),
    };
  });
}

export interface PaginaDoDetalhamento {
  colunas: ColunaDaPagina[];
  linhas: Record<string, unknown>[];
  total: number;
  /** O total bateu o teto de 10.000 linhas: a tela mostra "10.000+". */
  teto: boolean;
}

const linhaComoObjeto = (colunas: ColunaDaPagina[], cruas: unknown[]): Record<string, unknown> =>
  Object.fromEntries(colunas.map((c, i) => [c.chave, cruas[i] ?? null]));

export async function detalhar(
  pool: pg.Pool,
  sessao: Sessao,
  pedido: Detalhamento,
  deps: DependenciasDoExecutor = {},
): Promise<PaginaDoDetalhamento> {
  const montado = montarSqlDoDetalhamento(pedido, contextoDe(sessao, deps), "pagina");
  return comSessao(pool, sessao, async (cliente) => {
    const resposta = await cliente.query({ text: montado.text, values: montado.values, rowMode: "array" });
    const cruas = resposta.rows as unknown[][];
    const posicaoDoTotal = montado.colunas.length;
    const total = cruas.length ? Number(cruas[0]?.[posicaoDoTotal] ?? 0) : 0;
    return {
      colunas: montado.colunas,
      linhas: cruas.map((l) => linhaComoObjeto(montado.colunas, l)),
      total: Math.min(total, LINHAS_DO_DETALHAMENTO_MAX + 1),
      teto: total > LINHAS_DO_DETALHAMENTO_MAX,
    };
  });
}

/** O CSV do detalhamento na hora: até 20.000 linhas, lidas de uma vez (o teto existe para isso). */
export async function detalharParaCsv(
  pool: pg.Pool,
  sessao: Sessao,
  pedido: DetalhamentoParaCsv,
  aoReceberLinha: (linha: Record<string, unknown>) => void,
  deps: DependenciasDoExecutor = {},
): Promise<{ colunas: ColunaDaPagina[]; linhas: number; truncado: boolean }> {
  const montado = montarSqlDoDetalhamento(pedido, contextoDe(sessao, deps), "csv");
  return comSessao(pool, sessao, async (cliente) => {
    const resposta = await cliente.query({ text: montado.text, values: montado.values, rowMode: "array" });
    const cruas = resposta.rows as unknown[][];
    const truncado = cruas.length > LINHAS_DO_CSV_DO_DETALHAMENTO_MAX;
    const aproveitadas = truncado ? cruas.slice(0, LINHAS_DO_CSV_DO_DETALHAMENTO_MAX) : cruas;
    for (const l of aproveitadas) aoReceberLinha(linhaComoObjeto(montado.colunas, l));
    return { colunas: montado.colunas, linhas: aproveitadas.length, truncado };
  });
}
