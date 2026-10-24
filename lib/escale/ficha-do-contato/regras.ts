import { tiposDoGrupo, type ChaveDoGrupo } from "@/lib/escale/negocio/historico";
import type { Nota } from "@/lib/escale/negocio/notas";
import type { TimelineItemView } from "@/lib/types/contacts";

/**
 * A JANELA DO CONTATO (fork Escale, Fase 2E; C3; print 2b-10; Clint `index-BhVJ8kAx`).
 * Puras: abas, URL (N1), negócios (N9) e as notas soltas no histórico (N8).
 */
export const ABAS_DO_CONTATO = ["contato", "empresa", "negocios", "conversas", "arquivos", "historico"] as const;
export type AbaDoContato = (typeof ABAS_DO_CONTATO)[number];
export const ROTULO_DA_ABA_DO_CONTATO: Readonly<Record<AbaDoContato, string>> = {
  contato: "Contato",
  empresa: "Empresa",
  negocios: "Negócios",
  conversas: "Conversas",
  arquivos: "Arquivos",
  historico: "Histórico",
};

export const PARAM_ABA_DO_CONTATO = "ca";
export const PARAM_PAGINA_COMPLETA = "pagina";
export const ROTA_DA_LISTA_DE_CONTATOS = "/app/contacts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function contatoDaRota(caminho: string): string | null {
  const resto = caminho.startsWith(`${ROTA_DA_LISTA_DE_CONTATOS}/`)
    ? caminho.slice(ROTA_DA_LISTA_DE_CONTATOS.length + 1).split("/")[0]!
    : "";
  return UUID.test(resto) ? resto : null;
}

export function abaDoContato(valor: string | null): AbaDoContato {
  return (ABAS_DO_CONTATO as readonly string[]).includes(valor ?? "") ? (valor as AbaDoContato) : "contato";
}

const semAba = (qs: string) => {
  const p = new URLSearchParams(qs);
  p.delete(PARAM_ABA_DO_CONTATO);
  p.delete(PARAM_PAGINA_COMPLETA);
  return p;
};

export function rotaDoContatoAberto(id: string, qs: string, aba: AbaDoContato): string {
  const p = semAba(qs);
  if (aba !== "contato") p.set(PARAM_ABA_DO_CONTATO, aba);
  const texto = p.toString();
  return `${ROTA_DA_LISTA_DE_CONTATOS}/${id}${texto ? `?${texto}` : ""}`;
}

export function rotaDaListaSemContato(qs: string): string {
  const texto = semAba(qs).toString();
  return `${ROTA_DA_LISTA_DE_CONTATOS}${texto ? `?${texto}` : ""}`;
}

export const rotaDaPaginaCompleta = (id: string) => `${ROTA_DA_LISTA_DE_CONTATOS}/${id}?${PARAM_PAGINA_COMPLETA}=completa`;

export function abasVisiveis(temNegocios: boolean): AbaDoContato[] {
  return ABAS_DO_CONTATO.filter((a) => a !== "negocios" || temNegocios);
}

// ─── Negócios do contato (N9) ────────────────────────────────────────────────
export interface NegocioDoContato {
  id: string;
  titulo: string;
  origem_id: string;
  origem_nome: string;
  /** A origem está arquivada (o "Arquivado" da Clint). */
  origem_arquivada: boolean;
  etapa_nome: string | null;
  status: "open" | "won" | "lost";
  motivo_de_perda: string | null;
  valor_cents: number | null;
  moeda: string | null;
  dono_id: string | null;
  dono_nome: string | null;
  criado_em: string;
}

/** Os rótulos da `StatusDaFicha` (1G). */
export const ROTULO_DO_STATUS_DO_NEGOCIO: Readonly<Record<NegocioDoContato["status"], string>> = {
  open: "Aberto",
  won: "Ganho",
  lost: "Perdido",
};

export function negociosParaMostrar(negocios: readonly NegocioDoContato[], mostrarArquivados: boolean): NegocioDoContato[] {
  return negocios.filter((n) => mostrarArquivados || !n.origem_arquivada);
}

export const temPerdido = (negocios: readonly NegocioDoContato[]) => negocios.some((n) => n.status === "lost");

// ─── Notas soltas no histórico (N8) ──────────────────────────────────────────
export function notaComoItem(nota: Nota): TimelineItemView {
  return {
    id: `nota-${nota.id}`,
    organization_id: "",
    lead_id: "",
    contact_id: nota.contact_id,
    source_module: "escale",
    source_id: nota.id,
    type: "note",
    payload: { nota_id: nota.id },
    metadata: {},
    performed_at: nota.created_at,
    performed_by_user_id: nota.user_id,
    actor_kind: "user",
    actor_user_name: nota.user_nome,
  };
}

/**
 * A linha do tempo do contato (rota do original, por cursor) mais as notas
 * SOLTAS (sem negócio, que não têm linha em `crm_lead_activities`). Com mais
 * páginas por vir, só entram as notas até o item mais antigo já carregado.
 */
export function juntarNotasAoHistorico(
  itens: readonly TimelineItemView[],
  notas: readonly Nota[],
  temMais: boolean,
  grupo: ChaveDoGrupo,
): TimelineItemView[] {
  // Automações não tem tipos na rota (`null`), mas nota nunca é automação.
  const tipos = tiposDoGrupo(grupo);
  if (grupo === "automacoes" || (tipos !== null && !tipos.includes("note"))) return [...itens];
  const piso = temMais && itens.length > 0 ? itens[itens.length - 1]!.performed_at : null;
  const extras = notas
    .filter((n) => n.lead_id === null && (piso === null || n.created_at >= piso))
    .map(notaComoItem);
  return [...itens, ...extras].sort(
    (a, b) => b.performed_at.localeCompare(a.performed_at) || b.id.localeCompare(a.id),
  );
}
