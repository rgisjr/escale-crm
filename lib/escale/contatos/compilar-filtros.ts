import { padraoRegexDeBusca } from "@/lib/contacts/busca-regex";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";

import {
  DONO_COM,
  DONO_SEM,
  enxugarFiltros,
  precisaDeValor,
  type CondicaoDoFiltro,
  type FiltrosDeContatos,
  type OpcaoDeTelefone,
  type OpDeTag,
  type Operador,
  type TipoDeCampo,
} from "./filtros";

/**
 * O FILTRO COMPILADO (fork Escale, Fase 2B): o que `fn_escale_contatos_do_filtro`
 * (9102) lê em `p_filtros`. Só o servidor compila: o navegador nunca manda regex
 * nem fuso. "Contém" vira o padrão sem acento do original (`padraoRegexDeBusca`,
 * que escapa tudo), as tags ficam minúsculas (`normalizarTags`) e os donos se
 * separam em pessoas, agentes de IA, "sem dono" e "com dono".
 */
export type CondicaoCompilada = {
  alvo: "contato" | "negocio";
  chave: string;
  tipo: TipoDeCampo;
  op: Operador;
  valor: string | null;
  padrao: string | null;
};

export type FiltroCompilado = {
  fuso: string;
  criado_de?: string;
  criado_ate?: string;
  telefone?: OpcaoDeTelefone;
  negocio?: {
    tem: "com" | "sem";
    origens: string[];
    etapas: string[];
    status: string[];
    donos_usuarios: string[];
    donos_agentes: string[];
    sem_dono: boolean;
    com_dono: boolean;
    motivos: string[];
  };
  tags?: {
    combinar: "e" | "ou";
    grupos: Array<{ modo: "e" | "ou"; condicoes: Array<{ op: OpDeTag; tag: string | null }> }>;
  };
  campos?: {
    combinar: "e" | "ou";
    grupos: Array<{ modo: "e" | "ou"; condicoes: CondicaoCompilada[] }>;
  };
};

const PREFIXO_DO_AGENTE = "agent:";

/** A tag como o banco compara: normalizada e minúscula (o gravado pode ter maiúscula de antes da #1224). */
const tagNormalizada = (tag: string): string =>
  (normalizarTags([tag])[0] ?? tag.trim()).toLowerCase();

function compilarCondicao(c: CondicaoDoFiltro): CondicaoCompilada {
  const valor = precisaDeValor(c.op) ? (c.valor ?? "").trim() : null;
  const comPadrao = (c.op === "contem" || c.op === "nao_contem") && valor !== null;
  return {
    alvo: c.alvo,
    chave: c.chave,
    tipo: c.tipo,
    op: c.op,
    valor,
    padrao: comPadrao ? padraoRegexDeBusca(valor.replace(/[()]/g, " ")) : null,
  };
}

export function compilarFiltros(entrada: FiltrosDeContatos, fuso: string): FiltroCompilado {
  const f = enxugarFiltros(entrada);
  const donos = f.negocio?.donos ?? [];
  return {
    fuso,
    ...(f.criadoEm?.de ? { criado_de: f.criadoEm.de } : {}),
    ...(f.criadoEm?.ate ? { criado_ate: f.criadoEm.ate } : {}),
    ...(f.telefone ? { telefone: f.telefone } : {}),
    ...(f.negocio
      ? {
          negocio: {
            tem: f.negocio.tem ?? "com",
            origens: f.negocio.origens ?? [],
            etapas: f.negocio.etapas ?? [],
            status: f.negocio.status ?? [],
            donos_usuarios: donos.filter(
              (d) => d !== DONO_SEM && d !== DONO_COM && !d.startsWith(PREFIXO_DO_AGENTE),
            ),
            donos_agentes: donos
              .filter((d) => d.startsWith(PREFIXO_DO_AGENTE))
              .map((d) => d.slice(PREFIXO_DO_AGENTE.length)),
            sem_dono: donos.includes(DONO_SEM),
            com_dono: donos.includes(DONO_COM),
            motivos: f.negocio.motivos ?? [],
          },
        }
      : {}),
    ...(f.tags
      ? {
          tags: {
            combinar: f.tags.combinar,
            grupos: f.tags.grupos.map((g) => ({
              modo: g.modo,
              condicoes: g.condicoes.map((c) => ({
                op: c.op,
                tag: c.op === "possui" || c.op === "nao_possui" ? tagNormalizada(c.tag) : null,
              })),
            })),
          },
        }
      : {}),
    ...(f.campos
      ? {
          campos: {
            combinar: f.campos.combinar,
            grupos: f.campos.grupos.map((g) => ({
              modo: g.modo,
              condicoes: g.condicoes.map(compilarCondicao),
            })),
          },
        }
      : {}),
  };
}
