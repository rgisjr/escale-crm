/**
 * As opções do seletor múltiplo do filtro (fork Escale, Fase 7D) — servidor. Tabelas do CRM para o que
 * tem tabela, listas fixas para o que tem vocabulário, e os valores reais pelo próprio motor para o resto
 * (com a RLS de quem pede).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { membrosAtivos } from "@/lib/escale/acesso/membros";

import { CATALOGO, dimensaoPorId } from "../catalogo";
import type { CampoDinamico } from "../catalogo/campos-personalizados";
import { lerCampoDinamico } from "../catalogo/campos-personalizados";
import type { FonteDeOpcoes } from "../catalogo/tipos";
import type { Resultado } from "../motor/executar";
import type { Pergunta } from "../pergunta";
import { OPCOES_FIXAS, type OpcaoDoFiltro } from "./opcoes-fixas";

const LIMITE = 500;
const LIMITE_PELO_MOTOR = 200;
const SEM_NOME = "Sem nome";

export type DependenciasDasOpcoes = {
  supabase: SupabaseClient;
  orgId: string;
  /** Roda uma pergunta pelo motor com a sessão de quem pede (fila e cache da 7A inclusos). */
  consultar: (pergunta: Pergunta) => Promise<Resultado>;
  camposDaOrg: ReadonlyMap<string, CampoDinamico>;
  semNome?: string;
};

type Linha = Record<string, unknown>;
const texto = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

async function ler(consulta: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Linha[]> {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return (data ?? []) as Linha[];
}

async function dasEtapas(sb: SupabaseClient, orgId: string): Promise<OpcaoDoFiltro[]> {
  const [origens, etapas] = await Promise.all([
    ler(sb.from("crm_pipelines").select("id, name").eq("organization_id", orgId).order("name").limit(LIMITE)),
    ler(
      sb
        .from("crm_stages")
        .select("id, name, pipeline_id, position")
        .eq("organization_id", orgId)
        .order("position")
        .limit(LIMITE),
    ),
  ]);
  const nomeDaOrigem = new Map(origens.map((o) => [texto(o.id), texto(o.name)]));
  return etapas.map((e) => ({
    valor: texto(e.id),
    rotulo: texto(e.name),
    grupo: nomeDaOrigem.get(texto(e.pipeline_id)) ?? "",
  }));
}

const simples =
  (tabela: string, nome: string) =>
  async (sb: SupabaseClient, orgId: string): Promise<OpcaoDoFiltro[]> =>
    (await ler(sb.from(tabela).select(`id, ${nome}`).eq("organization_id", orgId).order(nome).limit(LIMITE))).map(
      (l) => ({ valor: texto(l.id), rotulo: texto(l[nome]) }),
    );

async function dosNumeros(sb: SupabaseClient, orgId: string): Promise<OpcaoDoFiltro[]> {
  const linhas = await ler(
    sb.from("channel_sessions").select("id, display_name, phone_number").eq("organization_id", orgId).limit(LIMITE),
  );
  return linhas
    .map((l) => ({ valor: texto(l.id), rotulo: texto(l.display_name) || texto(l.phone_number) }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
}

async function dosUsuarios(sb: SupabaseClient, orgId: string, semNome: string): Promise<OpcaoDoFiltro[]> {
  const membros = await membrosAtivos(sb, orgId);
  if (!membros.ok) throw new Error(membros.causa.message);
  if (membros.ids.length === 0) return [];
  const perfis = await ler(sb.from("profiles").select("id, full_name").in("id", membros.ids).limit(LIMITE));
  const nomes = new Map(perfis.map((p) => [texto(p.id).toLowerCase(), texto(p.full_name).trim()]));
  return membros.ids
    .map((id) => ({ valor: id, rotulo: nomes.get(id) || semNome }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
}

const DE_TABELA: Partial<Record<FonteDeOpcoes, (sb: SupabaseClient, orgId: string) => Promise<OpcaoDoFiltro[]>>> = {
  etapas: dasEtapas,
  origens: simples("crm_pipelines", "name"),
  grupos_de_origem: simples("crm_pipeline_groups", "name"),
  campanhas: simples("campaigns", "name"),
  numeros: dosNumeros,
};

function primeiraContagem(assuntoId: string): string | null {
  const assunto = CATALOGO.find((a) => a.id === assuntoId);
  return assunto?.medidas.find((m) => m.unidade === "contagem")?.id ?? assunto?.medidas[0]?.id ?? null;
}

/** Os valores distintos pelo motor: "quantidade por essa variável", com a RLS de quem pede. */
async function peloMotor(dimensaoId: string, deps: DependenciasDasOpcoes): Promise<OpcaoDoFiltro[]> {
  const medida = primeiraContagem(dimensaoId.slice(0, dimensaoId.indexOf(".")));
  if (!medida) return [];
  const resultado = await deps.consultar({
    indicadores: [medida],
    variaveis: [dimensaoId],
    filtro: { modo: "todas", condicoes: [], grupos: [] },
    ordem: { por: medida, direcao: "desc" },
    limite: LIMITE_PELO_MOTOR,
    calculados: [],
    filtroQuantitativo: [],
    matrizDeTempo: false,
  });
  const vistos = new Set<string>();
  const saida: OpcaoDoFiltro[] = [];
  for (const linha of resultado.linhas) {
    const valor = texto(linha.v0);
    if (valor === "" || vistos.has(valor)) continue;
    vistos.add(valor);
    saida.push({ valor, rotulo: texto(linha.v0_rotulo ?? linha.v0) });
  }
  return saida;
}

/** `null` = a dimensão não existe (a rota responde 404); lista vazia = existe, sem opções (o valor é digitado). */
export async function lerOpcoesDaDimensao(
  dimensaoId: string,
  deps: DependenciasDasOpcoes,
): Promise<OpcaoDoFiltro[] | null> {
  if (lerCampoDinamico(dimensaoId)) {
    const definicao = deps.camposDaOrg.get(dimensaoId);
    if (!definicao) return null;
    return (definicao.opcoes ?? []).map((o) => ({ valor: o.value, rotulo: o.label }));
  }
  const achada = dimensaoPorId(dimensaoId);
  if (!achada) return null;
  const fonte = achada.dimensao.opcoes;
  if (!fonte) return achada.dimensao.tipo === "texto" ? peloMotor(dimensaoId, deps) : [];
  const fixas = OPCOES_FIXAS[fonte];
  if (fixas) return fixas;
  if (fonte === "usuarios") return dosUsuarios(deps.supabase, deps.orgId, deps.semNome ?? SEM_NOME);
  const daTabela = DE_TABELA[fonte];
  if (daTabela) return daTabela(deps.supabase, deps.orgId);
  return peloMotor(dimensaoId, deps);
}
