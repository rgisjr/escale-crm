/**
 * AS LINHAS DA IMPORTAÇÃO (fork Escale, Fase 2F): ler o CSV (o leitor do
 * importador do original: UTF-8 ou windows-1252, `,` `;` ou tab), normalizar
 * cada linha pelo mapeamento e achar as repetidas no próprio arquivo. Puro:
 * roda na rota (o arquivo inteiro) e no navegador (só o cabeçalho).
 */
import { normalizePhoneBR, phoneLookupVariants } from "@/lib/channels/phone-variants";
import { decodificarCsv, normalizaData, parseCsv } from "@/lib/contacts/csv";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import type { Catalogo } from "@/lib/escale/campos/regras";
import { linkDoInstagram, telefoneE164 } from "@/lib/escale/contatos/regras";
import { lerCnpj } from "@/lib/escale/empresas/regras";
import { numeroDoValor } from "@/lib/escale/filtros/campos";
import { dataHoraIsoDeBr, dataIsoDeBr } from "@/lib/escale/negocio/campos";
import type { CustomFieldDef } from "@/lib/schemas/settings";

import {
  PREFIXO_DA_EMPRESA,
  PREFIXO_DO_CONTATO,
  PREFIXO_DO_NEGOCIO,
  type CatalogosDaImportacao,
} from "./mapeamento";
import type { ColunaMapeada, TipoDeImportacao } from "./regras";

export const ARQUIVO_MAX_BYTES = 25 * 1024 * 1024;
export const LINHAS_MAX = 50_000;
export const COLUNAS_MAX = 200;
export const CELULA_MAX = 2000;
export const TAGS_MAX = 20;

export type ValorDeCampo = string | number | boolean | string[];
export type DefinicaoDoCampo = Pick<CustomFieldDef, "type" | "label" | "options">;
export interface DefinicoesDosCampos {
  contato: Record<string, DefinicaoDoCampo>;
  empresa: Record<string, DefinicaoDoCampo>;
  negocio: Record<string, DefinicaoDoCampo>;
}
export type StatusDoNegocio = "open" | "won" | "lost";

export interface DadosDoNegocio {
  id: string | null;
  titulo: string | null;
  valorCentavos: number | null;
  valorInvalido: string | null;
  origem: string | null;
  etapa: string | null;
  dono: string | null;
  status: StatusDoNegocio | null;
  ganhoEm: string | null;
  campos: Record<string, ValorDeCampo>;
}

export interface DadosDaLinha {
  id: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  nascimento: string | null;
  cpf: string | null;
  tags: string[];
  campos: Record<string, ValorDeCampo>;
  empresa: string | null;
  cnpj: { formatado: string; normalizado: string } | null;
  camposDaEmpresa: Record<string, ValorDeCampo>;
  negocio: DadosDoNegocio | null;
  invalidos: { id?: string; email?: string; telefone?: string; negocioId?: string };
  descartados: Array<{ campo: string; valor: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALOR_LIMPO = /^(r\$)?\s*-?[\d.,]+$/i;

function definicoesDe(catalogo: Catalogo): Record<string, DefinicaoDoCampo> {
  return Object.fromEntries(
    catalogo.campos.map((c) => [c.chave, { type: c.definicao.type, label: c.definicao.label, options: c.definicao.options }]),
  );
}

export function definicoesDosCatalogos(catalogos: CatalogosDaImportacao): DefinicoesDosCampos {
  return {
    contato: definicoesDe(catalogos.contato),
    empresa: definicoesDe(catalogos.empresa),
    negocio: definicoesDe(catalogos.negocio),
  };
}

const naoVazia = (linha: readonly string[]) => linha.some((c) => c.trim() !== "");

export function lerPlanilha(bytes: ArrayBuffer | Uint8Array): { cabecalho: string[]; linhas: string[][] } | { erro: string } {
  if (bytes.byteLength > ARQUIVO_MAX_BYTES) return { erro: "O arquivo passa de 25 MB." };
  const decodificado = decodificarCsv(bytes);
  if ("erro" in decodificado) return { erro: decodificado.erro };
  const todas = parseCsv(decodificado.texto).filter(naoVazia);
  const [cabecalho, ...linhas] = todas;
  if (!cabecalho || linhas.length === 0) return { erro: "O arquivo não tem linhas para importar." };
  if (linhas.length > LINHAS_MAX) return { erro: "O arquivo passa de 50.000 linhas." };
  if (cabecalho.length > COLUNAS_MAX) return { erro: "O arquivo passa de 200 colunas." };
  return { cabecalho: cabecalho.map((c) => c.trim()), linhas };
}

/** Só o cabeçalho (o navegador lê os primeiros 64 KB). */
export function lerCabecalho(bytes: ArrayBuffer | Uint8Array): string[] | null {
  const decodificado = decodificarCsv(bytes);
  if ("erro" in decodificado) return null;
  const primeira = parseCsv(decodificado.texto).find(naoVazia);
  return primeira ? primeira.map((c) => c.trim()).slice(0, COLUNAS_MAX) : null;
}

const semAcento = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

function opcaoDe(def: DefinicaoDoCampo, texto: string): string | null {
  const alvo = semAcento(texto);
  const achada = (def.options ?? []).find((o) => semAcento(o.label) === alvo || semAcento(o.value) === alvo);
  return achada?.value ?? null;
}

const SIM = new Set(["sim", "s", "yes", "y", "true", "1", "verdadeiro", "x"]);
const NAO = new Set(["nao", "n", "no", "false", "0", "falso"]);

export function valorDoCampo(def: DefinicaoDoCampo, texto: string): { ok: true; valor: ValorDeCampo } | { ok: false } {
  const v = texto.trim().slice(0, CELULA_MAX);
  switch (def.type) {
    case "number":
    case "currency": {
      const n = VALOR_LIMPO.test(v) ? numeroDoValor(v) : null;
      return n === null ? { ok: false } : { ok: true, valor: n };
    }
    case "date": {
      const d = dataIsoDeBr(v);
      return d ? { ok: true, valor: d } : { ok: false };
    }
    case "datetime": {
      const d = dataHoraIsoDeBr(v) ?? (dataIsoDeBr(v) ? `${dataIsoDeBr(v)}T00:00` : null);
      return d ? { ok: true, valor: d } : { ok: false };
    }
    case "select": {
      const o = opcaoDe(def, v);
      return o ? { ok: true, valor: o } : { ok: false };
    }
    case "multiselect": {
      const partes = v.split(/[;,|]/).map((p) => p.trim()).filter(Boolean);
      const valores = partes.map((p) => opcaoDe(def, p));
      return valores.length > 0 && valores.every((x): x is string => x !== null)
        ? { ok: true, valor: [...new Set(valores)] }
        : { ok: false };
    }
    case "boolean": {
      const b = semAcento(v);
      if (SIM.has(b)) return { ok: true, valor: true };
      if (NAO.has(b)) return { ok: true, valor: false };
      return { ok: false };
    }
    case "email":
      return EMAIL.test(v) ? { ok: true, valor: v.toLowerCase() } : { ok: false };
    default:
      return { ok: true, valor: v };
  }
}

function statusDoTexto(texto: string): StatusDoNegocio | null {
  const t = semAcento(texto);
  if (["aberto", "aberta", "em aberto", "open"].includes(t)) return "open";
  if (["ganho", "ganha", "won", "venda", "vendido"].includes(t)) return "won";
  if (["perdido", "perdida", "lost"].includes(t)) return "lost";
  return null;
}

/** "Interpretar o valor" (Clint `CREATE_WITH_PARSED_VALUE`): os números do texto, em centavos. */
export function interpretarValor(texto: string): number | null {
  const n = numeroDoValor(texto.replace(/[^\d,.-]/g, ""));
  return n === null || n < 0 ? null : Math.round(n * 100);
}

const negocioVazio = (): DadosDoNegocio => ({
  id: null,
  titulo: null,
  valorCentavos: null,
  valorInvalido: null,
  origem: null,
  etapa: null,
  dono: null,
  status: null,
  ganhoEm: null,
  campos: {},
});

export function normalizarLinha(
  celulas: readonly string[],
  mapa: readonly ColunaMapeada[],
  tipo: TipoDeImportacao,
  definicoes: DefinicoesDosCampos,
): DadosDaLinha {
  const l: DadosDaLinha = {
    id: null,
    nome: null,
    email: null,
    telefone: null,
    instagram: null,
    nascimento: null,
    cpf: null,
    tags: [],
    campos: {},
    empresa: null,
    cnpj: null,
    camposDaEmpresa: {},
    negocio: tipo === "negocio" ? negocioVazio() : null,
    invalidos: {},
    descartados: [],
  };
  const descartar = (campo: string, valor: string) => l.descartados.push({ campo, valor });
  let telefoneBruto: string | null = null;
  let ddi: string | null = null;

  mapa.forEach((coluna, i) => {
    const v = (celulas[i] ?? "").trim().slice(0, CELULA_MAX);
    const para = coluna.para;
    if (!v || !para || para === "none") return;
    const n = l.negocio;
    if (para === "id") {
      if (UUID.test(v)) l.id = v.toLowerCase();
      else l.invalidos.id = v;
    } else if (para === "deal_id") {
      if (n && UUID.test(v)) n.id = v.toLowerCase();
      else l.invalidos.negocioId = v;
    } else if (para === "name") l.nome = v.slice(0, 200);
    else if (para === "email") {
      const e = v.toLowerCase();
      if (EMAIL.test(e)) l.email = e;
      else l.invalidos.email = v;
    } else if (para === "phone") telefoneBruto = v;
    else if (para === "ddi") ddi = v.replace(/\D/g, "") || null;
    else if (para === "instagram") {
      const link = linkDoInstagram(v);
      if (link) l.instagram = link;
      else descartar(para, v);
    } else if (para === "tag") l.tags = normalizarTags(v.split(/[;,|]/)).slice(0, TAGS_MAX);
    else if (para === "birthdate") {
      const d = normalizaData(v);
      if (d) l.nascimento = d;
      else descartar(para, v);
    } else if (para === "cpf") {
      const d = v.replace(/\D/g, "");
      if (d.length === 11) l.cpf = d;
      else descartar(para, v);
    } else if (para === "company") l.empresa = v.slice(0, 200);
    else if (para === "org:cnpj") {
      const c = lerCnpj(v);
      if (c.ok && c.normalizado && c.formatado) l.cnpj = { formatado: c.formatado, normalizado: c.normalizado };
      else descartar(para, v);
    } else if (para === "org:cidade") l.camposDaEmpresa.cidade = v.slice(0, 200);
    else if (para === "org:estado") l.camposDaEmpresa.estado = v.toUpperCase().slice(0, 2);
    else if (para.startsWith(PREFIXO_DA_EMPRESA)) {
      const chave = para.slice(PREFIXO_DA_EMPRESA.length);
      const def = definicoes.empresa[chave];
      const lido = def ? valorDoCampo(def, v) : ({ ok: false } as const);
      if (lido.ok) l.camposDaEmpresa[chave] = lido.valor;
      else descartar(para, v);
    } else if (para.startsWith(PREFIXO_DO_CONTATO)) {
      const chave = para.slice(PREFIXO_DO_CONTATO.length);
      const def = definicoes.contato[chave];
      const lido = def ? valorDoCampo(def, v) : ({ ok: false } as const);
      if (lido.ok) l.campos[chave] = lido.valor;
      else descartar(para, v);
    } else if (n) {
      if (para === "title") n.titulo = v.slice(0, 200);
      else if (para === "value") {
        const valor = VALOR_LIMPO.test(v) ? numeroDoValor(v) : null;
        if (valor !== null && valor >= 0) n.valorCentavos = Math.round(valor * 100);
        else n.valorInvalido = v;
      } else if (para === "origin_name") n.origem = v;
      else if (para === "stage_name") n.etapa = v;
      else if (para === "owner") n.dono = v;
      else if (para === "status") {
        const s = statusDoTexto(v);
        if (s) n.status = s;
        else descartar(para, v);
      } else if (para === "won_at") {
        const d = dataIsoDeBr(v) ?? dataHoraIsoDeBr(v)?.slice(0, 10) ?? null;
        if (d) n.ganhoEm = d;
        else descartar(para, v);
      } else if (para.startsWith(PREFIXO_DO_NEGOCIO)) {
        const chave = para.slice(PREFIXO_DO_NEGOCIO.length);
        const def = definicoes.negocio[chave];
        const lido = def ? valorDoCampo(def, v) : ({ ok: false } as const);
        if (lido.ok) n.campos[chave] = lido.valor;
        else descartar(para, v);
      }
    }
  });

  if (telefoneBruto) {
    const e164 = ddi ? telefoneE164(ddi, telefoneBruto) : normalizePhoneBR(telefoneBruto);
    if (e164) l.telefone = e164;
    else l.invalidos.telefone = telefoneBruto;
  }
  return l;
}

/** O índice da primeira linha com o mesmo e-mail ou telefone (Clint `DUPLICATE_IN_BATCH`); null na primeira. */
export function marcarRepetidas(linhas: readonly DadosDaLinha[]): Array<number | null> {
  const vistas = new Map<string, number>();
  return linhas.map((l, i) => {
    const chaves = [
      ...(l.email ? [`e:${l.email}`] : []),
      ...(l.telefone ? phoneLookupVariants(l.telefone).map((v) => `t:${v}`) : []),
    ];
    const primeira = chaves.map((c) => vistas.get(c)).find((x) => x !== undefined);
    if (primeira !== undefined) return primeira;
    for (const c of chaves) vistas.set(c, i);
    return null;
  });
}
