import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { buscaValeConsulta, normalizarTermoDeBusca } from "@/lib/inbox/termo-de-busca";

import {
  PREFIXO_DO_AGENTE,
  SEM_ATENDENTE,
  SEM_DONO,
  enxugarFiltrosDoPainel,
  type FiltrosDoPainel,
  type Marca,
  type StatusDaFila,
  type TipoDeDataDoNegocio,
} from "./filtros-da-fila";

/**
 * O FILTRO COMPILADO (fork Escale, Fase 3D): o que `fn_escale_conversa_passa`
 * (9204) lê. Só o servidor compila: o navegador nunca manda padrão de busca nem
 * fuso. A busca segue o handler do original (`normalizarTermoDeBusca`; o `*` que
 * ele põe vira `%` do `ilike`, e `%`/`_` digitados são escapados); as tags ficam
 * minúsculas (a régua da 2B); os donos se separam em pessoas, agentes e "sem dono".
 */
export type FiltroDaFilaCompilado = {
  fuso: string;
  marcas?: Marca[];
  criada_de?: string;
  criada_ate?: string;
  status?: StatusDaFila[];
  atendentes?: string[];
  sem_atendente?: boolean;
  agentes?: string[];
  setores?: string[];
  grupos?: "conversas" | "grupos";
  negocio?: {
    fuso: string;
    tem: "com" | "sem";
    status: string[];
    motivos: string[];
    donos_usuarios: string[];
    donos_agentes: string[];
    sem_dono: boolean;
    grupos: string[];
    origens: string[];
    etapas: string[];
    data_tipo?: TipoDeDataDoNegocio;
    data_de?: string;
    data_ate?: string;
  };
  tags?: {
    combinar: "e" | "ou";
    grupos: Array<{ modo: "e" | "ou"; condicoes: Array<{ op: string; tag: string | null }> }>;
  };
  canais?: string[];
  busca?: { padrao: string; digitos: string | null };
};

const DIGITOS_MIN = 4;
const tagNormalizada = (tag: string): string =>
  (normalizarTags([tag])[0] ?? tag.trim()).toLowerCase();

/** O padrão do `ilike` e os dígitos do telefone (só a partir de 4, como o original). */
export function padraoDaBusca(bruto: string): { padrao: string; digitos: string | null } | null {
  if (!buscaValeConsulta(bruto)) return null;
  const termo = normalizarTermoDeBusca(bruto).trim();
  const escapado = termo.replace(/[\\%_]/g, (m) => `\\${m}`).replace(/\*/g, "%");
  const digitos = termo.replace(/\D/g, "");
  return { padrao: `%${escapado}%`, digitos: digitos.length >= DIGITOS_MIN ? digitos : null };
}

export function compilarFiltrosDaFila(
  painel: FiltrosDoPainel,
  busca: string | undefined,
  fuso: string,
): FiltroDaFilaCompilado {
  const f = enxugarFiltrosDoPainel(painel);
  const c = f.conversas;
  const n = f.negocios;
  const atendentes = c?.atendentes ?? [];
  const donos = n?.donos ?? [];
  const padrao = busca ? padraoDaBusca(busca) : null;
  return {
    fuso,
    ...(c?.marcas ? { marcas: c.marcas } : {}),
    ...(c?.criadaEm?.de ? { criada_de: c.criadaEm.de } : {}),
    ...(c?.criadaEm?.ate ? { criada_ate: c.criadaEm.ate } : {}),
    ...(c?.status ? { status: c.status } : {}),
    ...(atendentes.length
      ? {
          atendentes: atendentes.filter((a) => a !== SEM_ATENDENTE),
          sem_atendente: atendentes.includes(SEM_ATENDENTE),
        }
      : {}),
    ...(c?.agentes ? { agentes: c.agentes } : {}),
    ...(c?.setores ? { setores: c.setores } : {}),
    ...(f.grupos ? { grupos: f.grupos } : {}),
    ...(n
      ? {
          negocio: {
            fuso,
            tem: n.tem ?? "com",
            status: n.status ?? [],
            motivos: n.motivos ?? [],
            donos_usuarios: donos.filter((d) => d !== SEM_DONO && !d.startsWith(PREFIXO_DO_AGENTE)),
            donos_agentes: donos
              .filter((d) => d.startsWith(PREFIXO_DO_AGENTE))
              .map((d) => d.slice(PREFIXO_DO_AGENTE.length)),
            sem_dono: donos.includes(SEM_DONO),
            grupos: n.grupos ?? [],
            origens: n.origens ?? [],
            etapas: n.etapas ?? [],
            ...(n.data ? { data_tipo: n.data.tipo } : {}),
            ...(n.data?.de ? { data_de: n.data.de } : {}),
            ...(n.data?.ate ? { data_ate: n.data.ate } : {}),
          },
        }
      : {}),
    ...(f.contatos?.tags
      ? {
          tags: {
            combinar: f.contatos.tags.combinar,
            grupos: f.contatos.tags.grupos.map((g) => ({
              modo: g.modo,
              condicoes: g.condicoes.map((k) => ({
                op: k.op,
                tag: k.op === "possui" || k.op === "nao_possui" ? tagNormalizada(k.tag) : null,
              })),
            })),
          },
        }
      : {}),
    ...(f.canais ? { canais: f.canais } : {}),
    ...(padrao ? { busca: padrao } : {}),
  };
}
