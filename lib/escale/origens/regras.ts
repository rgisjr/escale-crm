/**
 * ORIGENS (fork Escale, Fases 1A e 1B): os funis da organização arrumados em
 * GRUPOS, como o painel "Origens" da Clint. Regras puras — o painel, as janelas,
 * a entrada de Negócios e as rotas usam as mesmas, para nunca dizerem coisas
 * diferentes.
 *
 * Toda origem tem grupo (migration 9002). `semGrupo` existe só como defesa: num
 * banco que ainda não aplicou a 9002, origem sem grupo continua aparecendo em
 * vez de sumir do painel.
 */
import { normalizar } from "@/lib/catalogo/busca";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";

/** O mesmo CHECK `crm_pipeline_groups_icone_valido` (migration 9002). */
export const ICONES_DE_GRUPO = ["iniciais", "funil", "pessoas", "predio", "loja", "megafone", "telefone"] as const;
export type IconeDeGrupo = (typeof ICONES_DE_GRUPO)[number];

/** Chave do dicionário de cada ícone: o rótulo do botão na janela Customizar. */
export const ROTULO_DO_ICONE: Record<IconeDeGrupo, string> = {
  iniciais: "Iniciais",
  funil: "Funil",
  pessoas: "Pessoas",
  predio: "Prédio",
  loja: "Loja",
  megafone: "Megafone",
  telefone: "Telefone",
};

export function iconeValido(valor: unknown): IconeDeGrupo {
  return (ICONES_DE_GRUPO as readonly unknown[]).includes(valor) ? (valor as IconeDeGrupo) : "iniciais";
}

/** Só um tom da paleta das etiquetas (a paleta MEDIDA para daltonismo). */
export function corValida(valor: unknown): string | null {
  return typeof valor === "string" && PALETA_DE_ETIQUETAS.includes(valor) ? valor : null;
}

export interface GrupoDeFunis {
  id: string;
  name: string;
  color: string | null;
  icon: IconeDeGrupo;
  is_archived: boolean;
}

export interface FunilDaOrigem {
  id: string;
  name: string;
  group_id: string | null;
  is_archived: boolean;
  is_default: boolean;
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
  /** Grupos ativos, por nome, com as origens vivas de cada um. */
  grupos: GrupoNaArvore[];
  /** Defesa para banco sem a 9002 — com ela, sempre vazio. */
  semGrupo: FunilDaOrigem[];
  /** Grupos arquivados com as origens vivas deles (voltam juntas ao desarquivar). */
  gruposArquivados: GrupoNaArvore[];
  /** Origens arquivadas uma a uma, fora de grupo arquivado. */
  funisArquivados: FunilDaOrigem[];
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
  // seriam dois grupos indistinguíveis no painel. Arquivado conta: o índice não
  // é parcial, e desarquivar não pode esbarrar num nome repetido.
  const procurado = chave(nome);
  if (grupos.some((g) => g.id !== ignorarId && chave(g.name) === procurado)) {
    return { ok: false, erro: "Já existe um grupo com esse nome." };
  }
  return { ok: true, nome };
}

export function montarOrigens({ grupos, funis }: Origens): ArvoreDeOrigens {
  const porNome = [...grupos].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  const vivos = funis.filter((f) => !f.is_archived);
  const comFunis = (g: GrupoDeFunis): GrupoNaArvore => ({ ...g, funis: vivos.filter((f) => f.group_id === g.id) });
  const existentes = new Set(grupos.map((g) => g.id));
  const arquivados = new Set(grupos.filter((g) => g.is_archived).map((g) => g.id));
  return {
    grupos: porNome.filter((g) => !g.is_archived).map(comFunis),
    semGrupo: vivos.filter((f) => f.group_id === null || !existentes.has(f.group_id)),
    gruposArquivados: porNome.filter((g) => g.is_archived).map(comFunis),
    funisArquivados: funis.filter((f) => f.is_archived && !(f.group_id !== null && arquivados.has(f.group_id))),
  };
}

/**
 * Busca da lupa: o grupo cujo nome casa aparece inteiro; senão, só com as
 * origens que casam. Sem acento, sem caixa, sem pontuação. Os arquivados não
 * entram na busca — ficam como estão.
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
  return { ...arvore, grupos, semGrupo: arvore.semGrupo.filter((f) => casa(f.name)) };
}

/**
 * O funil que o "Negócios" do menu do topo abre: o último aberto (cookie),
 * se ainda está vivo e visível; senão o padrão da organização; senão o
 * primeiro da lista (as origens vêm na `position`). `null` = nenhum funil
 * visível, e a entrada cai na lista de funis.
 */
export function escolherFunilInicial(origens: Origens, lembrado: string | null): string | null {
  const candidatos = funisVivos(origens);
  return (
    candidatos.find((f) => f.id === lembrado)?.id ??
    candidatos.find((f) => f.is_default)?.id ??
    candidatos[0]?.id ??
    null
  );
}

/**
 * Os funis "vivos": não arquivados e, se têm grupo, com o grupo ativo. Arquivar
 * um grupo só marca o grupo — os funis dele continuam `is_archived = false`, mas
 * somem da árvore do painel, então não valem como origem de nada.
 */
export function funisVivos(origens: Origens): FunilDaOrigem[] {
  const ativos = new Set(origens.grupos.filter((g) => !g.is_archived).map((g) => g.id));
  return origens.funis.filter((f) => !f.is_archived && (f.group_id === null || ativos.has(f.group_id)));
}

/**
 * O funil aberto no quadro (`/app/pipelines/<id>`), ou `null` fora dele. O
 * quadro de uma visualização mora em `/app/pipelines/visualizacoes/<id>` (Fase
 * 1C) e não é funil: sem a exceção, o "último funil aberto" viraria a palavra
 * "visualizacoes".
 */
export function funilDoCaminho(pathname: string): string | null {
  const id = /^\/app\/pipelines\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
  return id === "visualizacoes" ? null : id;
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

/** Cor automática: um tom da paleta escolhido pelo id, estável sem coluna. */
export function corDoGrupo(id: string): string {
  let soma = 0;
  for (const letra of id) soma = (soma + letra.charCodeAt(0)) % 9973;
  return PALETA_DE_ETIQUETAS[soma % PALETA_DE_ETIQUETAS.length]!;
}

/** A cor que o ícone mostra: a escolhida em Customizar, ou a automática. */
export function corEfetiva(grupo: Pick<GrupoDeFunis, "id" | "color">): string {
  return corValida(grupo.color) ?? corDoGrupo(grupo.id);
}
