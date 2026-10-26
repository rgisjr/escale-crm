/**
 * AS VARIÁVEIS DA MENSAGEM DA ATIVIDADE (fork Escale, Fase 1I; P10).
 *
 * Desde a Frente V a lista e a troca saem da LISTA ÚNICA
 * (`lib/variaveis/catalogo.ts`) e do resolvedor único
 * (`lib/variaveis/resolver.ts`). Este módulo só adapta o formato da 1I:
 * a atividade guarda o texto com as variáveis e a troca é feita na tela, na
 * hora de mostrar o balão e de enviar (a Clint também resolve no front).
 * Variável sem valor vira vazio; checkout e campos sem dado no Escale também
 * (D2); a desconhecida fica como está.
 */
import {
  chaveDaVariavel,
  filtrarGrupos,
  gruposComCampos,
  type CampoDaVariavel,
} from "@/lib/variaveis/catalogo";
import { resolverTexto, type FontesDasVariaveis } from "@/lib/variaveis/resolver";

export { chaveDaVariavel, type CampoDaVariavel };

export interface VariavelDaMensagem {
  nome: string;
  rotulo: string;
}

export interface GrupoDeVariaveis {
  grupo: string;
  itens: readonly VariavelDaMensagem[];
}

/**
 * Os grupos da lista única. Os campos personalizados da origem (`settings.fields`,
 * que guardam o valor no negócio e no contato) entram no fim de Negócio e de Contato.
 */
export function gruposDeVariaveis(campos: readonly CampoDaVariavel[] = []): GrupoDeVariaveis[] {
  return gruposComCampos({ negocio: campos, contato: campos }).map((g) => ({
    grupo: g.grupo,
    itens: g.itens.map((i) => ({ nome: i.token, rotulo: i.rotulo })),
  }));
}

export interface DadosDasVariaveis {
  contato: {
    nome: string | null;
    email: string | null;
    telefone: string | null;
    id?: string | null;
    cargo?: string | null;
  };
  negocio: {
    etapa: string | null;
    /** Já em texto (R$ 1.234,56). */
    valor: string | null;
    id?: string | null;
    criadoEm?: string | null;
    status?: string | null;
  };
  usuario: { nome: string | null; email: string | null };
  /** A empresa DO CONTATO (D14). O nome da conta é `conta`. */
  empresa: { nome: string | null; cidade?: string | null; estado?: string | null };
  conta?: { nome: string | null };
  ultimoAgendamento?: { link: string | null; inicio: string | null } | null;
  /** Os campos personalizados, já em texto, pela variável inteira (`"[DEAL.PLANO]": "Ouro"`). */
  campos?: Readonly<Record<string, string>>;
  fuso?: string | null;
}

export function fontesDaAtividade(d: DadosDasVariaveis): FontesDasVariaveis {
  return {
    contato: {
      id: d.contato.id ?? null,
      nome: d.contato.nome,
      email: d.contato.email,
      telefone: d.contato.telefone,
      cargo: d.contato.cargo ?? null,
    },
    negocio: {
      id: d.negocio.id ?? null,
      criadoEm: d.negocio.criadoEm ?? null,
      status: d.negocio.status ?? null,
      etapa: d.negocio.etapa,
      valorCentavos: null,
      moeda: null,
    },
    empresa: { nome: d.empresa.nome, cidade: d.empresa.cidade ?? null, estado: d.empresa.estado ?? null },
    usuario: d.usuario,
    conta: d.conta ?? null,
    ultimoAgendamento: d.ultimoAgendamento ?? null,
    prontos: { ...(d.campos ?? {}), "[DEAL.VALUE]": d.negocio.valor ?? "" },
    fuso: d.fuso ?? null,
  };
}

export function resolverVariaveis(texto: string, d: DadosDasVariaveis): string {
  return resolverTexto(texto, fontesDaAtividade(d), { vazio: "vazio" }).texto;
}

export function filtrarVariaveis(
  busca: string,
  t: (s: string) => string,
  campos: readonly CampoDaVariavel[] = [],
): GrupoDeVariaveis[] {
  return filtrarGrupos(gruposComCampos({ negocio: campos, contato: campos }), busca, t).map((g) => ({
    grupo: g.grupo,
    itens: g.itens.map((i) => ({ nome: i.token, rotulo: i.rotulo })),
  }));
}

export function inserirNoCursor(
  texto: string,
  inicio: number,
  fim: number,
  variavel: string,
): { texto: string; cursor: number } {
  const a = Math.max(0, Math.min(inicio, texto.length));
  const b = Math.max(a, Math.min(fim, texto.length));
  return { texto: texto.slice(0, a) + variavel + texto.slice(b), cursor: a + variavel.length };
}
