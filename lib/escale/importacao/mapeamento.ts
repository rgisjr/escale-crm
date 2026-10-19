/**
 * O MAPEAMENTO DA IMPORTAÇÃO (fork Escale, Fase 2F; Clint `Me`, `Mt`, `yt`,
 * `Ot`): os destinos de cada coluna, agrupados como na Clint, e a sugestão
 * pelo cabeçalho. Os rótulos saem em pt; a tela traduz com `t()`.
 */
import type { Catalogo } from "@/lib/escale/campos/regras";

import type { ColunaMapeada, TipoDeImportacao } from "./regras";

export const PREFIXO_DO_CONTATO = "custom:";
export const PREFIXO_DA_EMPRESA = "org:";
export const PREFIXO_DO_NEGOCIO = "deal_custom:";

export interface CatalogosDaImportacao {
  contato: Catalogo;
  empresa: Catalogo;
  negocio: Catalogo;
}

export interface OpcaoDeDestino {
  valor: string;
  rotulo: string;
  grupo: string;
}

export const GRUPO_DO_DESTINO = {
  identificadores: "Identificadores",
  contato: "Contato",
  empresa: "Empresa",
  negocio: "Negócio",
  datas: "Datas do negócio",
} as const;

const FIXOS_DO_CONTATO: ReadonlyArray<[string, string]> = [
  ["name", "Nome"],
  ["email", "Email"],
  ["phone", "Telefone"],
  ["ddi", "DDI (código do país)"],
  ["instagram", "Instagram"],
  ["tag", "Tags"],
  ["birthdate", "Data de nascimento"],
  ["cpf", "CPF"],
];
const FIXOS_DA_EMPRESA: ReadonlyArray<[string, string]> = [
  ["company", "Nome da empresa"],
  ["org:cidade", "Cidade"],
  ["org:estado", "Estado"],
  ["org:cnpj", "CNPJ"],
];
const FIXOS_DO_NEGOCIO: ReadonlyArray<[string, string]> = [
  ["title", "Título"],
  ["value", "Valor"],
  ["origin_name", "Origem"],
  ["stage_name", "Etapa"],
  ["owner", "Dono"],
  ["status", "Status"],
];

const ordenados = (catalogo: Catalogo) =>
  [...catalogo.campos].sort((a, b) => a.posicao - b.posicao || a.chave.localeCompare(b.chave));

export function opcoesDoMapeamento(tipo: TipoDeImportacao, catalogos: CatalogosDaImportacao): OpcaoDeDestino[] {
  const lista: OpcaoDeDestino[] = [];
  const add = (valor: string, rotulo: string, grupo: string) => lista.push({ valor, rotulo, grupo });
  const g = GRUPO_DO_DESTINO;
  if (tipo === "negocio") add("deal_id", "ID do negócio", g.identificadores);
  add("id", "ID do contato", g.identificadores);
  for (const [v, r] of FIXOS_DO_CONTATO) add(v, r, g.contato);
  for (const c of ordenados(catalogos.contato)) add(`${PREFIXO_DO_CONTATO}${c.chave}`, c.definicao.label, g.contato);
  for (const [v, r] of FIXOS_DA_EMPRESA) add(v, r, g.empresa);
  for (const c of ordenados(catalogos.empresa)) add(`${PREFIXO_DA_EMPRESA}${c.chave}`, c.definicao.label, g.empresa);
  if (tipo === "negocio") {
    for (const [v, r] of FIXOS_DO_NEGOCIO) add(v, r, g.negocio);
    for (const c of ordenados(catalogos.negocio)) add(`${PREFIXO_DO_NEGOCIO}${c.chave}`, c.definicao.label, g.negocio);
    add("won_at", "Data de ganho", g.datas);
  }
  const vistos = new Set<string>();
  return lista.filter((o) => {
    if (vistos.has(o.valor)) return false;
    vistos.add(o.valor);
    return true;
  });
}

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** A regra por expressão da Clint (`Mt`), mais a origem por nome (nossa). */
function pelaExpressao(cabecalho: string, tipo: TipoDeImportacao): string {
  const o = cabecalho.toLowerCase().trim();
  const negocio = tipo === "negocio";
  if (/id.*contato|contato.*id|contact.?id/.test(o)) return "id";
  if (negocio && /id.*neg[óo]cio|neg[óo]cio.*id|deal.?id/.test(o)) return "deal_id";
  if (/^id$/.test(o)) return negocio ? "deal_id" : "id";
  if (/mail/.test(o)) return "email";
  if (/^(ddi|c[óo]d(igo)?\.?\s*(do\s+)?pa[íi]s|country.?code|dial.?code)$/.test(o)) return "ddi";
  if (/(phone|fone|telefone|celular|whats)/.test(o)) return "phone";
  if (/(nome|name)/.test(o)) return "name";
  if (/insta/.test(o)) return "instagram";
  if (/(empresa|company|organiza)/.test(o)) return "company";
  if (/tag/.test(o)) return "tag";
  if (/(t[íi]tulo|title)/.test(o)) return "title";
  if (/(valor|value|amount|pre[çc]o)/.test(o)) return "value";
  if (/(etapa|stage|fase)/.test(o)) return "stage_name";
  if (/(status|situa[çc][ãa]o)/.test(o)) return "status";
  if (negocio && /(data.*ganho|ganho.*data|data.*ganh|won.?date|win.?date)/.test(o)) return "won_at";
  if (negocio && /(origem|origin|funil|pipeline)/.test(o)) return "origin_name";
  return "none";
}

export function sugerirMapeamento(
  cabecalho: readonly string[],
  tipo: TipoDeImportacao,
  opcoes: readonly OpcaoDeDestino[],
): ColunaMapeada[] {
  const porRotulo = new Map<string, string>();
  for (const o of opcoes) {
    const chave = normalizar(o.rotulo);
    if (chave && !porRotulo.has(chave)) porRotulo.set(chave, o.valor);
  }
  const existentes = new Set(opcoes.map((o) => o.valor));
  const usados = new Set<string>();
  return cabecalho.map((csv) => {
    const regra = pelaExpressao(csv, tipo);
    const escolhido = regra === "ddi" ? regra : (porRotulo.get(normalizar(csv)) ?? regra);
    if (escolhido === "none" || !existentes.has(escolhido) || usados.has(escolhido)) return { csv, para: "none" };
    usados.add(escolhido);
    return { csv, para: escolhido };
  });
}

const IDENTIFICA_O_CONTATO = new Set(["id", "name", "email", "phone"]);
const IDENTIFICA_O_NEGOCIO = new Set(["title", "deal_id"]);

export function mapeamentoValido(mapa: readonly ColunaMapeada[], tipo: TipoDeImportacao): boolean {
  return mapa.some(
    (c) => IDENTIFICA_O_CONTATO.has(c.para) || (tipo === "negocio" && IDENTIFICA_O_NEGOCIO.has(c.para)),
  );
}

/** Há campo da empresa sem "Nome da empresa" (Clint `Ot`)? */
export function semNomeDaEmpresa(mapa: readonly ColunaMapeada[]): boolean {
  return mapa.some((c) => c.para.startsWith(PREFIXO_DA_EMPRESA)) && !mapa.some((c) => c.para === "company");
}

export function rotuloDoDestino(valor: string, opcoes: readonly OpcaoDeDestino[]): string {
  return opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;
}
