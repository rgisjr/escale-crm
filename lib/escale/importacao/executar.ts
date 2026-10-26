/**
 * O CONSUMIDOR DA IMPORTAÇÃO (fork Escale, Fase 2F; migration 9107; molde de
 * `lib/escale/massa/executar.ts`). Roda no worker com o service role:
 * - 100 linhas por lote, 20 s por rodada; acabou o tempo, `retry`.
 * - O lote é marcado "processando" ANTES de agir (no máximo uma vez); a linha
 *   que ficou "processando" de uma rodada que caiu vira erro.
 * - O desfecho das linhas é gravado em blocos de 10 (uma chamada por bloco)
 *   (`fn_escale_gravar_desfechos_da_importacao`, 9407).
 * - Depois de cada lote, `fn_escale_contar_importacao` refaz as contagens e fecha
 *   a importação quando não sobra linha na fila.
 * - Importação cancelada para no lote seguinte.
 */
import type { HandlerCtx } from "@/lib/api/handlers/types";
import type { EventRow, HandlerResult } from "@/lib/event-log/dispatcher";

import { gravarPlano, idsGravados, type DependenciasDaGravacao } from "./aplicar";
import { classificar } from "./classificar";
import {
  lerContextoDaRodada,
  lerContextoDoLote,
  type ContextoDaRodada,
  type Importacao,
  type LinhaParaProcessar,
  type Membro,
} from "./contexto";

export const CONSUMIDOR_DA_IMPORTACAO = "escale-importacao.v1";
export const EVENTO_DA_IMPORTACAO = "contatos.importacao_requested";
export const LOTE = 100;
export const ORCAMENTO_MS = 20_000;
export const MENSAGEM_DA_INTERROMPIDA = "A importação foi interrompida nesta linha.";
const TENTATIVAS_ANTES_DE_DESISTIR = 4;
const TENTATIVAS_DA_GRAVACAO_DO_LOTE = 2;
const PAUSA_ENTRE_TENTATIVAS_MS = 250;
/** Quantos desfechos esperam na memória antes de irem ao banco: limita o que uma queda do worker deixa sem registro. */
export const DESFECHOS_POR_GRAVACAO = 10;
const COLUNAS_DA_LINHA = "id, numero, normalizado, repetida_de, resolucoes";

export interface Dependencias extends DependenciasDaGravacao {
  agora: () => number;
  lerMembros: (orgId: string) => Promise<Membro[]>;
}

const resultado = (status: HandlerResult["status"], detail?: string, retry_at?: string): HandlerResult => ({
  consumer_key: CONSUMIDOR_DA_IMPORTACAO,
  status,
  ...(detail ? { detail } : {}),
  ...(retry_at ? { retry_at } : {}),
});

const motivoDaFalha = (e: unknown) => (e instanceof Error ? e.message : String(e));
const ctxDe = (imp: Importacao): HandlerCtx => ({
  organization_id: imp.organization_id,
  actor: { type: "user", id: imp.user_id },
  requestId: imp.id,
});

/** Só a importação de negócio acha o dono pelo texto da planilha: nas outras, não vale ir buscar cada membro na conta. */
export async function membrosParaAImportacao(deps: Pick<Dependencias, "lerMembros">, imp: Pick<Importacao, "tipo" | "organization_id">): Promise<Membro[]> {
  return imp.tipo === "negocio" ? deps.lerMembros(imp.organization_id) : [];
}

export async function contarImportacao(deps: Pick<Dependencias, "db">, id: string): Promise<string> {
  const { data, error } = await deps.db.rpc("fn_escale_contar_importacao", { p_importacao: id });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function processarLinhas(
  deps: Dependencias,
  rodada: ContextoDaRodada,
  linhas: readonly LinhaParaProcessar[],
): Promise<void> {
  if (linhas.length === 0) return;
  const imp = rodada.importacao;
  const contexto = await lerContextoDoLote(deps.db, rodada, linhas);
  const ctx = ctxDe(imp);
  const quemGrava = { id: imp.id, organization_id: imp.organization_id, user_id: imp.user_id, podeGanhar: rodada.podeGanhar };
  const desfechos: Record<string, unknown>[] = [];
  for (const linha of linhas) {
    const desfecho = classificar(linha.normalizado, linha.repetida_de, contexto(linha), imp.decisoes, linha.resolucoes);
    let mudanca: Record<string, unknown>;
    if (desfecho.tipo === "importar") {
      try {
        const r = await gravarPlano(deps, ctx, quemGrava, desfecho.plano);
        mudanca = {
          status: "importada",
          motivo: null,
          detalhe: desfecho.detalhe,
          com_aviso: Object.keys(desfecho.detalhe.avisos).length > 0,
          contato_id: r.contatoId,
          negocio_id: r.negocioId,
          mensagem: null,
        };
      } catch (e) {
        const { contatoId, negocioId } = idsGravados(e);
        mudanca = {
          status: "erro",
          motivo: null,
          detalhe: desfecho.detalhe,
          com_aviso: false,
          mensagem: motivoDaFalha(e).slice(0, 500),
          // O que já foi gravado antes da falha fica registrado (sem isso a linha parece não ter feito nada).
          ...(contatoId ? { contato_id: contatoId } : {}),
          ...(negocioId ? { negocio_id: negocioId } : {}),
        };
      }
    } else {
      mudanca = {
        status: desfecho.tipo === "pular" ? "pulada" : "revisar",
        motivo: desfecho.motivo,
        detalhe: desfecho.detalhe,
        com_aviso: false,
        mensagem: null,
      };
    }
    desfechos.push({ id: linha.id, ...mudanca });
    if (desfechos.length >= DESFECHOS_POR_GRAVACAO) await gravarDesfechos(deps, imp.id, desfechos.splice(0));
  }
  if (desfechos.length > 0) await gravarDesfechos(deps, imp.id, desfechos);
}

/** Grava o desfecho do lote inteiro de uma vez; uma segunda tentativa cobre falha passageira do banco. */
async function gravarDesfechos(
  deps: Pick<Dependencias, "db">,
  importacaoId: string,
  desfechos: readonly Record<string, unknown>[],
): Promise<void> {
  let erro: { message: string } | null = null;
  for (let tentativa = 0; tentativa < TENTATIVAS_DA_GRAVACAO_DO_LOTE; tentativa++) {
    const r = await deps.db.rpc("fn_escale_gravar_desfechos_da_importacao", {
      p_importacao: importacaoId,
      p_desfechos: desfechos,
    });
    if (!r.error) return;
    erro = r.error;
    if (tentativa + 1 < TENTATIVAS_DA_GRAVACAO_DO_LOTE) await new Promise((ok) => setTimeout(ok, PAUSA_ENTRE_TENTATIVAS_MS));
  }
  throw new Error(erro?.message ?? "falha ao gravar o lote");
}

export async function processarImportacao(row: EventRow, deps: Dependencias): Promise<HandlerResult> {
  const id = typeof row.payload?.importacao_id === "string" ? row.payload.importacao_id : null;
  if (!id) return resultado("skipped", "sem_importacao_id");
  const lida = await deps.db
    .from("crm_importacoes")
    .select("id, organization_id, user_id, tipo, status, decisoes, configuracao")
    .eq("id", id)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (lida.error) return resultado("error", lida.error.message);
  if (!lida.data) return resultado("skipped", "importacao_inexistente");
  const imp = lida.data as Importacao;
  if (imp.status !== "na_fila" && imp.status !== "importando") return resultado("ok", "fora_da_fila");

  try {
    if (imp.status === "na_fila") {
      const marcada = await deps.db.from("crm_importacoes").update({ status: "importando" }).eq("id", imp.id).eq("status", "na_fila");
      if (marcada.error) throw new Error(marcada.error.message);
    }
    const sobras = await deps.db
      .from("crm_importacoes_linhas")
      .update({ status: "erro", mensagem: MENSAGEM_DA_INTERROMPIDA })
      .eq("importacao_id", imp.id)
      .eq("status", "processando");
    if (sobras.error) throw new Error(sobras.error.message);

    const rodada = await lerContextoDaRodada(deps.db, { ...imp, status: "importando" }, await membrosParaAImportacao(deps, imp));
    const inicio = deps.agora();
    while (deps.agora() - inicio < ORCAMENTO_MS) {
      const estado = await deps.db.from("crm_importacoes").select("status").eq("id", imp.id).maybeSingle();
      if ((estado.data as { status?: string } | null)?.status === "cancelada") return resultado("ok", "cancelada");
      const { data, error } = await deps.db
        .from("crm_importacoes_linhas")
        .select(COLUNAS_DA_LINHA)
        .eq("importacao_id", imp.id)
        .eq("status", "na_fila")
        .order("numero", { ascending: true })
        .limit(LOTE);
      if (error) throw new Error(error.message);
      const linhas = (data ?? []) as LinhaParaProcessar[];
      if (linhas.length === 0) {
        await contarImportacao(deps, imp.id);
        return resultado("ok");
      }
      const marcadas = await deps.db
        .from("crm_importacoes_linhas")
        .update({ status: "processando" })
        .in(
          "id",
          linhas.map((l) => l.id),
        )
        .eq("status", "na_fila");
      if (marcadas.error) throw new Error(marcadas.error.message);
      await processarLinhas(deps, rodada, linhas);
      await contarImportacao(deps, imp.id);
    }
    return resultado("retry", "orcamento", new Date(deps.agora() + 1000).toISOString());
  } catch (e) {
    if (row.attempts >= TENTATIVAS_ANTES_DE_DESISTIR) {
      await deps.db
        .from("crm_importacoes")
        .update({ status: "falhou", codigo_do_erro: "PIPELINE_FAILED", concluida_em: new Date(deps.agora()).toISOString() })
        .eq("id", imp.id);
      return resultado("ok", "falhou");
    }
    return resultado("error", motivoDaFalha(e));
  }
}
