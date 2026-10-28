/**
 * Executa a consulta com a sessão de quem olha (fork Escale, Fase 7A): transação `read only`,
 * `set local role authenticated` e as claims da pessoa, para a RLS das tabelas decidir o que
 * ela vê. A service role nunca entra. Teto de 8 s e de linhas.
 */
import type pg from "pg";

import { logger } from "@/lib/logger";

import { medidaPorId } from "../catalogo";
import { TEMPO_MAXIMO_MS } from "../catalogo/tipos";
import type { CampoDinamico } from "../catalogo/campos-personalizados";
import type { FiltroDoPainel, Pergunta } from "../pergunta";
import { ErroDoMotor } from "./erros";
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
  avisos: ("moedas_diferentes" | "filtro_do_painel_ignorado")[];
  ignorados: string[];
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

export async function consultar(
  pool: pg.Pool,
  sessao: Sessao,
  pergunta: Pergunta,
  painel?: FiltroDoPainel,
  deps: DependenciasDoExecutor = {},
): Promise<Resultado> {
  if (!sessao.userId) throw new ErroDoMotor("sem_sessao");
  const montado = montarSql(pergunta, painel, {
    orgId: sessao.orgId,
    fuso: sessao.fuso,
    agora: (deps.agora ?? (() => new Date()))(),
    camposDaOrg: deps.camposDaOrg ?? new Map(),
  });

  const inicio = Date.now();
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
    const resposta = await cliente.query({ text: montado.text, values: montado.values, rowMode: "array" });

    const monetarios = new Set(
      pergunta.indicadores.flatMap((id, i) => (medidaPorId(id)?.medida.moeda ? [`i${i}`] : [])),
    );
    const truncado = resposta.rows.length > pergunta.limite;
    const cruas = (truncado ? resposta.rows.slice(0, pergunta.limite) : resposta.rows) as unknown[][];
    const tabela = montarTabela(montado.colunas, cruas, monetarios);
    return {
      colunas: tabela.colunas,
      linhas: tabela.linhas,
      truncado,
      duracaoMs: Date.now() - inicio,
      avisos: [...tabela.avisos, ...(montado.ignorados.length ? (["filtro_do_painel_ignorado"] as const) : [])],
      ignorados: montado.ignorados,
    };
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

