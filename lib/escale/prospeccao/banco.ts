import type pg from "pg";

import { capabilitiesOf } from "@/lib/channels/capabilities";
import type { ChannelProvider } from "@/lib/channels/types";
import type { CampaignConfig, Prospect, SearchInput } from "@/lib/prospecting/schema";

import type {
  DetalheDaProspeccao,
  EmpresaDaProspeccao,
  LinhaDeProspeccao,
  OpcoesDaProspeccao,
  PaginaDeProspeccoes,
  ProgressoDaEmpresa,
  SituacaoDaProspeccao,
  StatusDoMotor,
} from "./tipos";

/**
 * AS LEITURAS DA PROSPECÇÃO NA CASCA (fork Escale, Fase 8D). As tabelas da
 * prospecção são só do servidor (sem RLS para `authenticated`), então se lê
 * pelo pool, como o GET do original — sempre com `organization_id` da sessão
 * no `where`. Nada aqui escreve.
 */
type Consulta = Pick<pg.Pool, "query">;
type Linha = Record<string, unknown>;

/** O progresso de uma empresa: a mesma régua do GET do original (`app/api/v1/prospecting/route.ts`). */
export const PROGRESSO_SQL =
  "case when l.stage_id::text = c.config->>'qualified_stage_id' then 'qualified' when v.last_inbound_at is not null then 'replied' else p.status end";

const JUNCOES_DA_EMPRESA =
  "join prospecting_campaigns c on c.organization_id = p.organization_id and c.id = p.campaign_id left join crm_leads l on l.organization_id = p.organization_id and l.id = p.lead_id left join conversations v on v.organization_id = p.organization_id and v.id = p.conversation_id";

/**
 * A página da lista (D3, D4, D6). $1 organização, $2 padrão do nome (ou null),
 * $3 situações (vazia = todas), $4 uma campanha só (ou null), $5 limite,
 * $6 deslocamento. O total vem da janela, antes do `limit`.
 */
export const LINHAS_SQL = `
with base as (
  select c.id, c.name, c.config, c.created_at,
    case
      when c.search_status in ('starting', 'running') then 'buscando'
      when c.status = 'draft' and c.search_status in ('failed', 'unknown') then 'erro_na_busca'
      when c.status = 'draft' then 'rascunho'
      when c.status = 'running' then 'em_progresso'
      when c.status = 'paused' then 'pausada'
      else 'completa'
    end as situacao
  from prospecting_campaigns c
  where c.organization_id = $1
    and ($2::text is null or c.name ilike $2)
    and ($4::uuid is null or c.id = $4)
), pagina as (
  select b.*, count(*) over () as total
  from base b
  where cardinality($3::text[]) = 0 or b.situacao = any($3::text[])
  order by b.created_at desc, b.id
  limit $5 offset $6
)
select pag.id, pag.name, pag.situacao, pag.config->>'channel_session_id' as numero_id, pag.created_at, pag.total,
  k.encontradas, k.na_fila, k.abordadas, k.responderam, k.qualificadas, k.falhas, k.nao_abordadas, k.primeira_abordagem
from pagina pag
cross join lateral (
  select
    count(*)::int as encontradas,
    count(*) filter (where x.progresso in ('queued', 'sending'))::int as na_fila,
    count(*) filter (where x.progresso in ('sent', 'replied', 'qualified'))::int as abordadas,
    count(*) filter (where x.progresso in ('replied', 'qualified'))::int as responderam,
    count(*) filter (where x.progresso = 'qualified')::int as qualificadas,
    count(*) filter (where x.progresso = 'failed')::int as falhas,
    count(*) filter (where x.progresso = 'skipped')::int as nao_abordadas,
    min(x.attempted_at) as primeira_abordagem
  from (
    select p.attempted_at, ${PROGRESSO_SQL} as progresso
    from prospecting_candidates p
    ${JUNCOES_DA_EMPRESA}
    where p.organization_id = $1 and p.campaign_id = pag.id
  ) x
) k
order by pag.created_at desc, pag.id`;

export const CAMPANHA_SQL =
  "select status, search_status, search, config, cost_usd, skipped_count, error from prospecting_campaigns where organization_id = $1 and id = $2";

export const EMPRESAS_SQL = `select p.id, p.data, p.status, p.selected, p.error, p.lead_id, p.conversation_id, p.attempted_at, m.status as message_status, ${PROGRESSO_SQL} as progresso from prospecting_candidates p ${JUNCOES_DA_EMPRESA} left join messages m on m.organization_id = p.organization_id and m.id = p.message_id where p.organization_id = $1 and p.campaign_id = $2 order by p.created_at, p.id limit 5000`;

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null;
const inteiro = (v: unknown): number => Number(v ?? 0) || 0;
const textoOuNulo = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function linhaDoBanco(r: Linha): LinhaDeProspeccao {
  return {
    id: String(r.id),
    nome: String(r.name),
    situacao: r.situacao as SituacaoDaProspeccao,
    numeroId: textoOuNulo(r.numero_id),
    criadaEm: iso(r.created_at) ?? "",
    primeiraAbordagem: iso(r.primeira_abordagem),
    encontradas: inteiro(r.encontradas),
    naFila: inteiro(r.na_fila),
    abordadas: inteiro(r.abordadas),
    responderam: inteiro(r.responderam),
    qualificadas: inteiro(r.qualificadas),
    falhas: inteiro(r.falhas),
    naoAbordadas: inteiro(r.nao_abordadas),
  };
}

export function empresaDoBanco(r: Linha): EmpresaDaProspeccao {
  return {
    id: String(r.id),
    dados: r.data as Prospect,
    status: String(r.status),
    selecionada: r.selected !== false,
    erro: textoOuNulo(r.error),
    negocioId: textoOuNulo(r.lead_id),
    conversaId: textoOuNulo(r.conversation_id),
    abordadaEm: iso(r.attempted_at),
    statusDaMensagem: textoOuNulo(r.message_status),
    progresso: r.progresso as ProgressoDaEmpresa,
  };
}

export async function lerPaginaDeProspeccoes(
  db: Consulta,
  org: string,
  filtro: { padrao: string | null; situacoes: SituacaoDaProspeccao[] },
  pagina: number,
  porPagina: number,
): Promise<PaginaDeProspeccoes> {
  const { rows } = await db.query<Linha>(LINHAS_SQL, [
    org,
    filtro.padrao,
    filtro.situacoes,
    null,
    porPagina,
    (pagina - 1) * porPagina,
  ]);
  return { linhas: rows.map(linhaDoBanco), total: inteiro(rows[0]?.total), pagina, porPagina };
}

export async function lerDetalheDaProspeccao(
  db: Consulta,
  org: string,
  id: string,
): Promise<DetalheDaProspeccao | null> {
  const [linhas, campanhas, empresas] = await Promise.all([
    db.query<Linha>(LINHAS_SQL, [org, null, [], id, 1, 0]),
    db.query<Linha>(CAMPANHA_SQL, [org, id]),
    db.query<Linha>(EMPRESAS_SQL, [org, id]),
  ]);
  const l = linhas.rows[0];
  const c = campanhas.rows[0];
  if (!l || !c) return null;
  return {
    linha: linhaDoBanco(l),
    status: c.status as StatusDoMotor,
    statusDaBusca: String(c.search_status),
    busca: c.search as SearchInput,
    config: (c.config ?? null) as CampaignConfig | null,
    custoUsd: c.cost_usd === null || c.cost_usd === undefined ? null : Number(c.cost_usd),
    repetidas: inteiro(c.skipped_count),
    erro: textoOuNulo(c.error),
    empresas: empresas.rows.map(empresaDoBanco),
  };
}

function aceitaTextoLivre(provider: unknown): boolean {
  try {
    return capabilitiesOf(provider as ChannelProvider).freeformOutsideWindow;
  } catch {
    return false;
  }
}

/** As mesmas consultas do GET do original: agentes automáticos publicados, conexões, etapas abertas. */
export async function lerOpcoesDaProspeccao(
  db: Consulta,
  org: string,
): Promise<OpcoesDaProspeccao> {
  const [chave, agentes, numeros, etapas] = await Promise.all([
    db.query<Linha>("select organization_id from prospecting_settings where organization_id = $1", [
      org,
    ]),
    db.query<Linha>(
      "select id, name from ai_agents where organization_id = $1 and published_version_id is not null and archived_at is null and paused_at is null and operation_mode = 'automatic' order by name",
      [org],
    ),
    db.query<Linha>(
      "select id, display_name, phone_number, provider, status from channel_sessions where organization_id = $1 and archived_at is null order by created_at",
      [org],
    ),
    db.query<Linha>(
      "select s.id, s.name, s.pipeline_id, p.name as pipeline_name from crm_stages s join crm_pipelines p on p.id = s.pipeline_id and p.organization_id = s.organization_id where s.organization_id = $1 and not s.is_archived and not s.is_won and not s.is_lost order by p.name, s.position",
      [org],
    ),
  ]);
  return {
    configurada: chave.rows.length > 0,
    agentes: agentes.rows.map((a) => ({ id: String(a.id), nome: String(a.name) })),
    numeros: numeros.rows
      .filter((n) => aceitaTextoLivre(n.provider))
      .map((n) => ({
        id: String(n.id),
        nome: textoOuNulo(n.display_name) ?? textoOuNulo(n.phone_number) ?? String(n.id),
        telefone: textoOuNulo(n.phone_number),
        status: String(n.status),
      })),
    etapas: etapas.rows.map((e) => ({
      id: String(e.id),
      nome: String(e.name),
      funilId: String(e.pipeline_id),
      funilNome: String(e.pipeline_name),
    })),
  };
}
