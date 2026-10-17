import { fotoDoContato } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";

/**
 * OS RECENTES DO PAINEL ORIGENS (fork Escale, Fase 1E; Clint superior,
 * `LAST_LEADS` e `PIN_LEAD`): os negócios abertos por último e os fixados. Moram
 * no navegador, por organização e pessoa. Tudo o que volta do navegador passa por
 * `lerRecentes`: o `localStorage` é de quem usa a máquina.
 */
export const FIXADOS_MAX = 5;
export const RECENTES_GUARDADOS = 20;
/** Quantos cada bloco mostra antes do "Ver mais". */
export const VISIVEIS = 5;

export interface NegocioRecente {
  id: string;
  titulo: string;
  origemId: string;
  /** O nome da origem quando o negócio foi aberto (o detalhe da linha). */
  origem: string;
  telefone: string | null;
  foto: string | null;
}

export interface Recentes {
  fixados: NegocioRecente[];
  recentes: NegocioRecente[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEXTO_MAX = 200;
const VAZIO: Recentes = { fixados: [], recentes: [] };
/**
 * A foto vale SÓ se é o caminho que `fotoDoContato` guarda:
 * `/api/v1/contacts/<uuid>/avatar`, da própria página. Nada de https de outro
 * domínio, `//dominio`, `javascript:`/`data:` nem tab/quebra de linha no meio
 * (o navegador tira tab e quebra de linha da URL: uma barra, tab, barra e o domínio viram `//dominio`).
 */
const FOTO_VALIDA = /^\/api\/v1\/contacts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar$/i;

export const chaveDosRecentes = (orgId: string, userId: string) =>
  `escale:negocios-recentes:v2:${orgId}:${userId}`;

function textoOuNulo(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v.slice(0, TEXTO_MAX) : null;
}

/** Telefone sem espaços nas pontas; em branco vira `null` (o ícone cinza, e não um `tel:` vivo). */
function telefoneOuNulo(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, TEXTO_MAX) : null;
}

/** O mesmo negócio duas vezes na mesma lista: fica o primeiro. */
function semRepetidos(lista: NegocioRecente[]): NegocioRecente[] {
  const vistos = new Set<string>();
  return lista.filter((x) => !vistos.has(x.id) && vistos.add(x.id));
}

function lerItem(item: unknown): NegocioRecente[] {
  if (!item || typeof item !== "object") return [];
  const { id, titulo, origemId, origem, telefone, foto } = item as Record<string, unknown>;
  const valido =
    typeof id === "string" &&
    UUID.test(id) &&
    typeof origemId === "string" &&
    UUID.test(origemId) &&
    typeof titulo === "string" &&
    typeof origem === "string";
  if (!valido) return [];
  // O `localStorage` não escolhe o que a página carrega: só o caminho do avatar do próprio site.
  const fotoLida = textoOuNulo(foto);
  return [
    {
      id,
      origemId,
      titulo: titulo.slice(0, TEXTO_MAX),
      origem: origem.slice(0, TEXTO_MAX),
      telefone: telefoneOuNulo(telefone),
      foto: fotoLida && FOTO_VALIDA.test(fotoLida) ? fotoLida : null,
    },
  ];
}

export function lerRecentes(bruto: string | null): Recentes {
  if (!bruto) return VAZIO;
  let lido: unknown;
  try {
    lido = JSON.parse(bruto);
  } catch {
    return VAZIO;
  }
  if (!lido || typeof lido !== "object") return VAZIO;
  const { fixados, recentes } = lido as Record<string, unknown>;
  const fix = semRepetidos(Array.isArray(fixados) ? fixados.flatMap(lerItem) : []).slice(
    0,
    FIXADOS_MAX,
  );
  const ids = new Set(fix.map((x) => x.id));
  const rec = semRepetidos(Array.isArray(recentes) ? recentes.flatMap(lerItem) : [])
    .filter((x) => !ids.has(x.id))
    .slice(0, RECENTES_GUARDADOS);
  return { fixados: fix, recentes: rec };
}

/** O aberto vai para o topo dos recentes; se está fixado, só o dado dele é atualizado. Devolve estado NOVO. */
export function comRecente(estado: Recentes, novo: NegocioRecente): Recentes {
  if (estado.fixados.some((x) => x.id === novo.id)) {
    return { ...estado, fixados: estado.fixados.map((x) => (x.id === novo.id ? novo : x)) };
  }
  return {
    ...estado,
    recentes: [novo, ...estado.recentes.filter((x) => x.id !== novo.id)].slice(
      0,
      RECENTES_GUARDADOS,
    ),
  };
}

export function fixar(estado: Recentes, id: string): Recentes | "limite" {
  const item = estado.recentes.find((x) => x.id === id);
  if (!item) return estado;
  if (estado.fixados.length >= FIXADOS_MAX) return "limite";
  return {
    fixados: [...estado.fixados, item],
    recentes: estado.recentes.filter((x) => x.id !== id),
  };
}

export function desafixar(estado: Recentes, id: string): Recentes {
  const item = estado.fixados.find((x) => x.id === id);
  if (!item) return estado;
  return {
    fixados: estado.fixados.filter((x) => x.id !== id),
    recentes: [item, ...estado.recentes].slice(0, RECENTES_GUARDADOS),
  };
}

/** Fase 1G (N3): o Recente abre a ficha do negócio (os Recentes só existem com a casca). */
export const linkDoRecente = (r: NegocioRecente) => `/app/negocios/${r.id}`;

export function recenteDoLead(lead: Lead, origem: string): NegocioRecente {
  return {
    id: lead.id,
    titulo: lead.title,
    origemId: lead.pipeline_id,
    origem,
    telefone: telefoneOuNulo(lead.contact_phone),
    foto: fotoDoContato(lead),
  };
}
