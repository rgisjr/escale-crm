/**
 * O catálogo como a tela do editor o usa (fork Escale, Fase 7D): o JSON do GET /catalogo, agrupado por
 * alvo (indicador, variável, tempo, filtro), com busca e o estado de cada item. Regras puras; o `sql`
 * nunca chega aqui.
 */
import type { CampoDinamico } from "../catalogo/campos-personalizados";
import type { Categoria, FonteDeOpcoes, FormatoDaColuna, ObjetoDeCampoDoCatalogo, TipoDeDimensao, Unidade } from "../catalogo/tipos";
import { limiteDoTipo } from "./tipos-de-grafico";
import type { RascunhoDoGrafico } from "./rascunho";

export type MedidaDaTela = {
  id: string;
  nome: string;
  unidade: Unidade;
  descricao?: string;
  apelidos: readonly string[];
  perguntas: readonly string[];
  antesDeUsar: string | null;
  /** Fase 7E: a medida lista registros no detalhamento. */
  temDetalhe?: boolean;
};
export type VariavelDaTela = {
  id: string;
  nome: string;
  tipo: TipoDeDimensao;
  opcoes: FonteDeOpcoes | null;
  descricao: string | null;
  ordemNatural: boolean;
};
export type TempoDaTela = { id: string; nome: string; padrao: boolean; descricao: string | null };
export type AssuntoDaTela = {
  id: string;
  nome: string;
  categoria: Categoria;
  umaLinhaPor: string;
  perguntas: readonly string[];
  medidas: readonly MedidaDaTela[];
  variaveis: readonly VariavelDaTela[];
  tempos: readonly TempoDaTela[];
  camposPersonalizados: readonly ObjetoDeCampoDoCatalogo[];
  colunasDoDetalhamento: ReadonlyArray<{ chave: string; nome: string; formato?: FormatoDaColuna | null }>;
};
export type CatalogoDaTela = {
  assuntos: readonly AssuntoDaTela[];
  camposPersonalizados: Record<ObjetoDeCampoDoCatalogo, readonly CampoDinamico[]>;
};

export type AlvoDoCatalogo = "indicador" | "variavel" | "tempo" | "filtro";

export type ItemDoCatalogo = {
  id: string;
  nome: string;
  /** Vazio nos campos personalizados (valem para todo assunto que aceita o objeto). */
  assunto: string;
  categoria: Categoria | null;
  unidade?: Unidade;
  tipo?: TipoDeDimensao;
  descricao?: string;
  apelidos: readonly string[];
  perguntas: readonly string[];
  antesDeUsar?: string;
  colunas?: readonly string[];
  opcoes?: FonteDeOpcoes | "campo";
  ordemNatural?: boolean;
  objeto?: ObjetoDeCampoDoCatalogo;
};
export type GrupoDoCatalogo = {
  id: string;
  nome: string;
  categoria: Categoria | null;
  umaLinhaPor?: string;
  perguntas: readonly string[];
  itens: readonly ItemDoCatalogo[];
};

export const ID_DO_GRUPO_DE_CAMPOS = "campos";
export const NOME_DO_GRUPO_DE_CAMPOS = "Campos personalizados";
export const NOME_DO_OBJETO: Record<ObjetoDeCampoDoCatalogo, string> = {
  negocio: "Negócio",
  contato: "Contato",
  empresa: "Empresa",
};
export const ROTULO_DA_UNIDADE: Record<Unidade, string> = {
  contagem: "contagem",
  valor: "valor",
  percentual: "percentual",
  duracao: "duração",
};
export const ROTULO_DO_TIPO: Record<TipoDeDimensao, string> = {
  texto: "texto",
  numero: "número",
  data: "data e hora",
  booleano: "sim/não",
};

const assuntoDoId = (id: string): string => id.slice(0, Math.max(id.indexOf("."), 0));

function itensDeCampos(cat: CatalogoDaTela): ItemDoCatalogo[] {
  const objetos = new Set(cat.assuntos.flatMap((a) => a.camposPersonalizados));
  return (Object.keys(NOME_DO_OBJETO) as ObjetoDeCampoDoCatalogo[])
    .filter((o) => objetos.has(o))
    .flatMap((objeto) =>
      (cat.camposPersonalizados[objeto] ?? []).map(
        (c): ItemDoCatalogo => ({
          id: c.id,
          nome: `${NOME_DO_OBJETO[objeto]} ${c.nome}`,
          assunto: "",
          categoria: null,
          tipo: c.tipo,
          apelidos: [],
          perguntas: [],
          opcoes: "campo",
          objeto,
        }),
      ),
    );
}

export function gruposDoAlvo(cat: CatalogoDaTela, alvo: AlvoDoCatalogo): GrupoDoCatalogo[] {
  const base = (a: AssuntoDaTela) => ({
    id: a.id,
    nome: a.nome,
    categoria: a.categoria,
    umaLinhaPor: a.umaLinhaPor,
    perguntas: a.perguntas,
  });
  const grupos: GrupoDoCatalogo[] = cat.assuntos.map((a) => {
    const comum = { assunto: a.id, categoria: a.categoria };
    let itens: ItemDoCatalogo[];
    if (alvo === "indicador") {
      itens = a.medidas.map((m) => ({
        ...comum,
        id: m.id,
        nome: m.nome,
        unidade: m.unidade,
        ...(m.descricao ? { descricao: m.descricao } : {}),
        apelidos: m.apelidos,
        perguntas: m.perguntas,
        ...(m.antesDeUsar ? { antesDeUsar: m.antesDeUsar } : {}),
        colunas: a.colunasDoDetalhamento.map((c) => c.nome),
      }));
    } else if (alvo === "tempo") {
      itens = a.tempos.map((t) => ({
        ...comum,
        id: t.id,
        nome: t.nome,
        tipo: "data" as const,
        ...(t.descricao ? { descricao: t.descricao } : {}),
        apelidos: [],
        perguntas: [],
      }));
    } else {
      itens = a.variaveis.map((v) => ({
        ...comum,
        id: v.id,
        nome: v.nome,
        tipo: v.tipo,
        ...(v.descricao ? { descricao: v.descricao } : {}),
        apelidos: [],
        perguntas: [],
        ...(v.opcoes ? { opcoes: v.opcoes } : {}),
        ...(v.ordemNatural ? { ordemNatural: true } : {}),
      }));
    }
    return { ...base(a), itens };
  });
  const comItens = grupos.filter((g) => g.itens.length > 0);
  if (alvo === "variavel" || alvo === "filtro") {
    const campos = itensDeCampos(cat);
    if (campos.length > 0) {
      comItens.push({ id: ID_DO_GRUPO_DE_CAMPOS, nome: NOME_DO_GRUPO_DE_CAMPOS, categoria: null, perguntas: [], itens: campos });
    }
  }
  return comItens;
}

/** "Campos personalizados" aparece em "todos" e na categoria do assunto fixado (`assuntoFixado`). */
export function filtrarPorCategoria(
  grupos: readonly GrupoDoCatalogo[],
  categoria: Categoria | "todos",
  categoriaDoAssuntoFixado?: Categoria | null,
): GrupoDoCatalogo[] {
  if (categoria === "todos") return [...grupos];
  return grupos.filter((g) =>
    g.id === ID_DO_GRUPO_DE_CAMPOS ? categoriaDoAssuntoFixado === categoria : g.categoria === categoria,
  );
}

const normalizar = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export type Achado = {
  grupo: GrupoDoCatalogo;
  itens: Array<{ item: ItemDoCatalogo; apelido?: { texto: string; de: number; ate: number } }>;
};

/** Sem acento nem maiúscula; casa por nome, apelido e pergunta e, quando é pelo apelido, devolve o trecho a destacar. */
export function buscarNaTela(grupos: readonly GrupoDoCatalogo[], termo: string): Achado[] {
  const alvo = normalizar(termo.trim());
  if (!alvo) return [];
  const achados: Achado[] = [];
  for (const grupo of grupos) {
    const itens: Achado["itens"] = [];
    for (const item of grupo.itens) {
      if (normalizar(item.nome).includes(alvo)) {
        itens.push({ item });
        continue;
      }
      const apelido = item.apelidos.find((a) => normalizar(a).includes(alvo));
      if (apelido) {
        const de = normalizar(apelido).indexOf(alvo);
        itens.push({ item, apelido: { texto: apelido, de, ate: de + alvo.length } });
        continue;
      }
      if (item.perguntas.some((p) => normalizar(p).includes(alvo))) itens.push({ item });
    }
    if (itens.length > 0) achados.push({ grupo, itens });
  }
  return achados;
}

/** O assunto do rascunho: o do primeiro id (não campo personalizado) de qualquer seção. */
export function assuntoDoRascunho(r: RascunhoDoGrafico): string | null {
  const ids = [
    ...r.indicadores,
    ...r.variaveis,
    ...(r.tempo.campo ? [r.tempo.campo] : []),
    ...r.filtro.flatMap((c) => c.condicoes.map((x) => x.campo).filter((x): x is string => x !== null)),
  ];
  const achado = ids.find((id) => !id.startsWith("campo:"));
  return achado ? assuntoDoId(achado) : null;
}

export type EstadoDoItem = "livre" | "ja_adicionado" | "outro_assunto" | "no_limite";

export function estadoDoItem(
  item: ItemDoCatalogo,
  r: RascunhoDoGrafico,
  alvo: AlvoDoCatalogo,
  cat: CatalogoDaTela,
): EstadoDoItem {
  const jaTem =
    (alvo === "indicador" && r.indicadores.includes(item.id)) ||
    (alvo === "variavel" && r.variaveis.includes(item.id)) ||
    (alvo === "tempo" && r.tempo.campo === item.id);
  if (jaTem) return "ja_adicionado";
  const fixado = assuntoDoRascunho(r);
  if (fixado) {
    if (item.objeto) {
      const aceita = cat.assuntos.find((a) => a.id === fixado)?.camposPersonalizados.includes(item.objeto);
      if (!aceita) return "outro_assunto";
    } else if (item.assunto && item.assunto !== fixado) {
      return "outro_assunto";
    }
  }
  if (alvo === "indicador" && r.indicadores.length >= limiteDoTipo(r.tipo)) return "no_limite";
  if (alvo === "variavel" && r.variaveis.length >= VARIAVEIS_MAX) return "no_limite";
  return "livre";
}

const VARIAVEIS_MAX = 2;

/** "{Assunto} {item}" (como a coluna do motor); campo: "{Objeto} {campo}"; id desconhecido → o próprio id. */
export function nomeDoChip(id: string, cat: CatalogoDaTela): string {
  const campo = /^campo:(negocio|contato|empresa):/.exec(id);
  if (campo) {
    const objeto = campo[1] as ObjetoDeCampoDoCatalogo;
    const def = cat.camposPersonalizados[objeto]?.find((c) => c.id === id);
    return def ? `${NOME_DO_OBJETO[objeto]} ${def.nome}` : id;
  }
  const assunto = cat.assuntos.find((a) => a.id === assuntoDoId(id));
  const item = assunto
    ? [...assunto.medidas, ...assunto.variaveis, ...assunto.tempos].find((x) => x.id === id)
    : undefined;
  return assunto && item ? `${assunto.nome} ${item.nome}` : id;
}

export function tipoDoCampo(id: string, cat: CatalogoDaTela): TipoDeDimensao | null {
  const campo = /^campo:(negocio|contato|empresa):/.exec(id);
  if (campo) return cat.camposPersonalizados[campo[1] as ObjetoDeCampoDoCatalogo]?.find((c) => c.id === id)?.tipo ?? null;
  return cat.assuntos.find((a) => a.id === assuntoDoId(id))?.variaveis.find((v) => v.id === id)?.tipo ?? null;
}

/** A variável do catálogo (para as opções e a ordem natural), ou `undefined` se for campo personalizado. */
export function variavelDoCatalogo(id: string, cat: CatalogoDaTela): VariavelDaTela | undefined {
  return cat.assuntos.find((a) => a.id === assuntoDoId(id))?.variaveis.find((v) => v.id === id);
}
