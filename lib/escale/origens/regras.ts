/**
 * ORIGENS (fork Escale, Fase 1A): os funis da organização arrumados em GRUPOS,
 * como o painel "Origens" da V1 da Clint. Regras puras — o painel, a janela de
 * organizar e as rotas usam as mesmas, para nunca dizerem coisas diferentes.
 */
import { normalizar } from "@/lib/catalogo/busca";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";

export interface GrupoDeFunis {
  id: string;
  name: string;
}

export interface FunilDaOrigem {
  id: string;
  name: string;
  group_id: string | null;
}

/** O que o servidor lê e o que toda rota de escrita devolve, relido do banco. */
export interface Origens {
  grupos: GrupoDeFunis[];
  funis: FunilDaOrigem[];
}

export interface GrupoNaArvore extends GrupoDeFunis {
  funis: FunilDaOrigem[];
}

export interface ArvoreDeOrigens {
  grupos: GrupoNaArvore[];
  semGrupo: FunilDaOrigem[];
}

/** O mesmo teto do CHECK `crm_pipeline_groups_nome_valido` (migration 9001). */
export const NOME_DE_GRUPO_MAX = 60;

/** `erro` é chave do dicionário: a rota responde `t(erro)`. */
export type VereditoDeNome = { ok: true; nome: string } | { ok: false; erro: string };

const chave = (nome: string) => normalizar(nome).trim();

export function validarNomeDeGrupo(
  bruto: string,
  grupos: readonly GrupoDeFunis[],
  ignorarId: string | null,
): VereditoDeNome {
  const nome = bruto.trim().replace(/\s+/g, " ");
  if (!nome) return { ok: false, erro: "Dê um nome ao grupo." };
  if (nome.length > NOME_DE_GRUPO_MAX) {
    return { ok: false, erro: "O nome do grupo pode ter até 60 caracteres." };
  }
  // Mais estrito que o índice do banco (que só ignora caixa): "Obras" e "Óbras"
  // seriam dois grupos indistinguíveis no painel.
  const procurado = chave(nome);
  if (grupos.some((g) => g.id !== ignorarId && chave(g.name) === procurado)) {
    return { ok: false, erro: "Já existe um grupo com esse nome." };
  }
  return { ok: true, nome };
}

/**
 * Grupos em ordem de nome, cada um com os seus funis na ordem que veio (a
 * `position` da lista de funis). Funil sem grupo — ou apontando para um grupo
 * que não está na leitura — vai para "Sem grupo": nenhum funil some do painel.
 */
export function montarOrigens({ grupos, funis }: Origens): ArvoreDeOrigens {
  const ordenados = [...grupos].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  const existentes = new Set(ordenados.map((g) => g.id));
  return {
    grupos: ordenados.map((g) => ({ ...g, funis: funis.filter((f) => f.group_id === g.id) })),
    semGrupo: funis.filter((f) => f.group_id === null || !existentes.has(f.group_id)),
  };
}

/**
 * Busca da lupa: o grupo cujo nome casa aparece inteiro; senão, aparece só com
 * os funis que casam. Sem acento, sem caixa, sem pontuação (o `normalizar` da
 * busca do catálogo).
 */
export function filtrarArvore(arvore: ArvoreDeOrigens, busca: string): ArvoreDeOrigens {
  const termo = chave(busca);
  if (!termo) return arvore;
  const casa = (nome: string) => chave(nome).includes(termo);
  const grupos = arvore.grupos.flatMap((g) => {
    if (casa(g.name)) return [g];
    const funis = g.funis.filter((f) => casa(f.name));
    return funis.length > 0 ? [{ ...g, funis }] : [];
  });
  return { grupos, semGrupo: arvore.semGrupo.filter((f) => casa(f.name)) };
}

/** O funil aberto no quadro (`/app/pipelines/<id>`), ou `null` fora dele. */
export function funilDoCaminho(pathname: string): string | null {
  return /^\/app\/pipelines\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}

/** Duas letras para o ícone do grupo; palavras de até 2 letras ("de", "da") não contam. */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  const fortes = palavras.filter((p) => p.length > 2);
  const base = fortes.length > 0 ? fortes : palavras;
  if (base.length === 0) return "?";
  if (base.length === 1) return base[0]!.slice(0, 2).toUpperCase();
  return (base[0]![0]! + base[1]![0]!).toUpperCase();
}

/**
 * A cor do ícone do grupo: um tom da paleta das etiquetas — a paleta MEDIDA
 * para separação em dicromacia (`tests/unit/tags-cor-de-etiqueta.test.ts`) —,
 * escolhido pelo id, para o mesmo grupo ter sempre a mesma cor sem coluna nova.
 * Quem pinta usa `estiloDoChip`, que escolhe a frente legível.
 */
export function corDoGrupo(id: string): string {
  let soma = 0;
  for (const letra of id) soma = (soma + letra.charCodeAt(0)) % 9973;
  return PALETA_DE_ETIQUETAS[soma % PALETA_DE_ETIQUETAS.length]!;
}
