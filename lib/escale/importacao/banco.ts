/**
 * AS ESCRITAS E LEITURAS DAS IMPORTAÇÕES (fork Escale, Fase 2F). Leitura pela
 * sessão (a RLS só deixa gerente+); escrita pelo service role, sempre depois de
 * a rota conferir o papel e com a organização da sessão.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { lerCatalogo } from "@/lib/escale/campos/banco";

import type { CatalogosDaImportacao } from "./mapeamento";
import { definicoesDosCatalogos, lerPlanilha, marcarRepetidas, normalizarLinha } from "./linhas";
import { PAGINA_DA_LISTA, type ImportacaoLida, type PedidoDeImportacao } from "./tipos";

export class ErroDaImportacao extends Error {
  constructor(
    public readonly codigo: "arquivo" | "mapeamento" | "origem" | "ganho" | "nao_encontrada" | "estado",
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const LOTE_DE_GRAVACAO = 1000;
const COLUNAS_DA_IMPORTACAO =
  "id, user_id, tipo, arquivo, nivel, status, total, importadas, revisar, puladas, erros, avisos, codigo_do_erro, linhas_apagadas_em, mapeamento, configuracao, created_at, concluida_em";

export async function catalogosDaOrganizacao(sb: SupabaseClient, orgId: string): Promise<CatalogosDaImportacao> {
  const [contato, empresa, negocio] = await Promise.all([
    lerCatalogo(sb, orgId, "contato"),
    lerCatalogo(sb, orgId, "empresa"),
    lerCatalogo(sb, orgId, "negocio"),
  ]);
  return { contato, empresa, negocio };
}

/** A origem e a etapa da configuração são da organização, não arquivadas, e a etapa é aberta. */
async function conferirDestino(sb: SupabaseClient, orgId: string, pedido: PedidoDeImportacao) {
  if (pedido.tipo !== "negocio") return;
  const { origemId, etapaId } = pedido.configuracao;
  const { data } = await sb
    .from("crm_stages")
    .select("id, pipeline_id, is_archived, is_won, is_lost, crm_pipelines!inner(is_archived)")
    .eq("organization_id", orgId)
    .eq("id", etapaId ?? "")
    .maybeSingle();
  const e = data as { pipeline_id: string; is_archived: boolean; is_won: boolean; is_lost: boolean; crm_pipelines: { is_archived: boolean } } | null;
  if (!e || e.pipeline_id !== origemId || e.is_archived || e.is_won || e.is_lost || e.crm_pipelines.is_archived) {
    throw new ErroDaImportacao("origem", "Selecione a etapa para continuar.");
  }
}

export async function criarImportacao(
  sb: SupabaseClient,
  admin: SupabaseClient,
  ctx: { orgId: string; userId: string; papel: string; pedido: PedidoDeImportacao; nomeDoArquivo: string; bytes: Uint8Array },
): Promise<{ id: string; total: number }> {
  const { orgId, userId, pedido } = ctx;
  if (pedido.tipo === "negocio" && pedido.configuracao.status === "won" && ctx.papel !== "admin") {
    throw new ErroDaImportacao("ganho", "Só administrador importa negócio ganho.");
  }
  await conferirDestino(sb, orgId, pedido);

  const lida = lerPlanilha(ctx.bytes);
  if ("erro" in lida) throw new ErroDaImportacao("arquivo", lida.erro);
  const mesmoCabecalho =
    lida.cabecalho.length === pedido.mapeamento.length && lida.cabecalho.every((c, i) => c === pedido.mapeamento[i]?.csv);
  if (!mesmoCabecalho) throw new ErroDaImportacao("mapeamento", "O arquivo mudou. Escolha o arquivo de novo.");

  const definicoes = definicoesDosCatalogos(await catalogosDaOrganizacao(sb, orgId));
  const normalizadas = lida.linhas.map((celulas) => normalizarLinha(celulas, pedido.mapeamento, pedido.tipo, definicoes));
  const repetidas = marcarRepetidas(normalizadas);

  const criada = await admin
    .from("crm_importacoes")
    .insert({
      organization_id: orgId,
      user_id: userId,
      tipo: pedido.tipo,
      arquivo: ctx.nomeDoArquivo.slice(0, 200) || "arquivo.csv",
      mapeamento: pedido.mapeamento,
      configuracao: pedido.configuracao,
      decisoes: pedido.decisoes,
      nivel: pedido.nivel,
    })
    .select("id")
    .single();
  if (criada.error) throw criada.error;
  const id = (criada.data as { id: string }).id;

  try {
    for (let i = 0; i < lida.linhas.length; i += LOTE_DE_GRAVACAO) {
      const lote = lida.linhas.slice(i, i + LOTE_DE_GRAVACAO).map((celulas, j) => {
        const k = i + j;
        const repetida = repetidas[k];
        return {
          importacao_id: id,
          organization_id: orgId,
          numero: k + 2,
          bruto: celulas,
          normalizado: normalizadas[k],
          repetida_de: repetida === null || repetida === undefined ? null : repetida + 2,
        };
      });
      const { error } = await admin.from("crm_importacoes_linhas").insert(lote);
      if (error) throw error;
    }
    await admin.rpc("fn_escale_apagar_linhas_antigas", { p_org: orgId });
    const fila = await admin.rpc("fn_escale_enfileirar_importacao", { p_importacao: id });
    if (fila.error) throw fila.error;
    return { id, total: Number(fila.data) };
  } catch (err) {
    await admin.from("crm_importacoes").delete().eq("id", id);
    throw err;
  }
}

export async function listarImportacoes(
  sb: SupabaseClient,
  orgId: string,
  consulta: { tipo: "todas" | "contato" | "negocio"; pagina: number },
): Promise<{ itens: ImportacaoLida[]; total: number }> {
  const de = (consulta.pagina - 1) * PAGINA_DA_LISTA;
  let q = sb
    .from("crm_importacoes")
    .select(COLUNAS_DA_IMPORTACAO, { count: "exact" })
    .eq("organization_id", orgId)
    .neq("status", "preparando")
    .order("created_at", { ascending: false })
    .range(de, de + PAGINA_DA_LISTA - 1);
  if (consulta.tipo !== "todas") q = q.eq("tipo", consulta.tipo);
  const { data, error, count } = await q;
  if (error) throw error;
  const itens = (data ?? []) as unknown as ImportacaoLida[];
  const origens = [...new Set(itens.map((i) => i.configuracao?.origemId).filter((x): x is string => !!x))];
  const nomes = new Map<string, string>();
  if (origens.length > 0) {
    const o = await sb.from("crm_pipelines").select("id, name").eq("organization_id", orgId).in("id", origens);
    for (const p of (o.data ?? []) as Array<{ id: string; name: string }>) nomes.set(p.id, p.name);
  }
  return {
    itens: itens.map((i) => ({ ...i, origem_nome: i.configuracao?.origemId ? (nomes.get(i.configuracao.origemId) ?? null) : null })),
    total: count ?? 0,
  };
}

export async function lerImportacao(sb: SupabaseClient, orgId: string, id: string): Promise<ImportacaoLida | null> {
  const { data, error } = await sb.from("crm_importacoes").select(COLUNAS_DA_IMPORTACAO).eq("organization_id", orgId).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const i = data as unknown as ImportacaoLida;
  let origem_nome: string | null = null;
  if (i.configuracao?.origemId) {
    const o = await sb.from("crm_pipelines").select("name").eq("organization_id", orgId).eq("id", i.configuracao.origemId).maybeSingle();
    origem_nome = (o.data as { name?: string } | null)?.name ?? null;
  }
  return { ...i, origem_nome };
}
