/**
 * CAMPOS EDITÁVEIS DA FICHA (fork Escale, Fase 1H; C10, C14): regras puras do
 * editor em linha da Clint. Sem React e sem rede.
 *
 * - A caixa mostra o valor como texto (`valorParaLeitura`) e grava o que o
 *   tipo pede (`valorParaGravar`): número e moeda viram número (a moeda em
 *   REAIS, como o `CustomFieldsEditor` do original), data vira ISO, vazio vira null.
 * - "Ocultar vazios" é por tipo e fica no localStorage; o padrão da Clint é
 *   mostrar tudo (a flag `options.hidden` dela tem o nome invertido).
 * - O contato grava `custom_fields` INTEIRO (o PATCH do original substitui o
 *   objeto); nome, telefone e e-mail vão nas colunas.
 */
import type { CustomFieldType } from "@/components/contacts/CustomFieldsEditor";
import type { ContactPatch } from "@/lib/schemas/contacts";
import { PREFIXO_DA_CHAVE, normalizarLink } from "@/lib/leads/links-de-contato";

export type TipoDeCampoDaFicha = CustomFieldType;

export interface CampoEditavel {
  chave: string;
  rotulo: string;
  tipo: TipoDeCampoDaFicha;
  valor: unknown;
  opcoes?: { value: string; label: string }[];
  /** Fase 1F: o campo é exigido nesta etapa ("Campo obrigatório nesta etapa"). */
  obrigatorioNaEtapa?: boolean;
  /** Só leitura (o "Valor" de um negócio ganho ou perdido, por exemplo). */
  travado?: boolean;
}

/** As chaves fixas do contato; o resto vai em `custom_fields`. */
export const CHAVE_NOME = "nome";
export const CHAVE_TELEFONE = "telefone";
export const CHAVE_EMAIL = "email";
export const MAX_TAGS_DO_CONTATO = 20;

const SIMBOLO: Record<string, string> = {
  BRL: "R$",
  USD: "US$",
  EUR: "€",
  GBP: "£",
  ARS: "$",
  MXN: "$",
};
export const simboloDaMoeda = (moeda: string | null | undefined): string =>
  SIMBOLO[moeda ?? "BRL"] ?? moeda ?? "R$";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function campoVazio(bruto: unknown): boolean {
  if (bruto === null || bruto === undefined) return true;
  if (typeof bruto === "string") return bruto.trim() === "";
  if (Array.isArray(bruto)) return bruto.length === 0;
  return false;
}

export function textoDeReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function reaisDeTexto(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, "");
  if (!limpo) return null;
  // "1.500,50" → "1500.50"; "1500" → "1500"; "1,5" → "1.5".
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

export function dataBrDeIso(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

export function dataIsoDeBr(texto: string): string | null {
  const limpo = texto.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpo);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(limpo);
  const [a, m, d] = iso ? [iso[1], iso[2], iso[3]] : br ? [br[3], br[2], br[1]] : [];
  if (!a || !m || !d) return null;
  const data = new Date(Number(a), Number(m) - 1, Number(d));
  const bate =
    data.getFullYear() === Number(a) &&
    data.getMonth() === Number(m) - 1 &&
    data.getDate() === Number(d);
  return bate ? `${a}-${m}-${d}` : null;
}

/** O que a caixa mostra (null = "Clique aqui para adicionar"). */
export function valorParaLeitura(
  tipo: TipoDeCampoDaFicha,
  opcoes: { value: string; label: string }[] | undefined,
  bruto: unknown,
  t: (s: string) => string,
): string | null {
  if (campoVazio(bruto)) return null;
  const rotuloDa = (v: unknown) => opcoes?.find((o) => o.value === v)?.label ?? String(v);
  switch (tipo) {
    case "boolean":
      return bruto ? t("Sim") : t("Não");
    case "select":
      return rotuloDa(bruto);
    case "multiselect":
      return Array.isArray(bruto) ? bruto.map(rotuloDa).join(", ") || null : String(bruto);
    case "date":
      return typeof bruto === "string" ? dataBrDeIso(bruto) : String(bruto);
    case "currency":
      return typeof bruto === "number" ? textoDeReais(bruto) : String(bruto);
    default:
      return String(bruto);
  }
}

export type ValorParaGravar = { ok: true; valor: unknown } | { ok: false; erro: string };

/** O texto digitado vira o valor do tipo. Vazio vira null (apaga). */
export function valorParaGravar(tipo: TipoDeCampoDaFicha, texto: string): ValorParaGravar {
  const limpo = texto.trim();
  if (!limpo) return { ok: true, valor: null };
  switch (tipo) {
    case "number": {
      const n = Number(limpo.replace(/\./g, "").replace(",", "."));
      return Number.isFinite(n) ? { ok: true, valor: n } : { ok: false, erro: "Digite um número." };
    }
    case "currency": {
      const n = reaisDeTexto(limpo);
      return n === null ? { ok: false, erro: "Digite um valor." } : { ok: true, valor: n };
    }
    case "date": {
      const iso = dataIsoDeBr(limpo);
      return iso
        ? { ok: true, valor: iso }
        : { ok: false, erro: "Digite uma data válida (dd/mm/aaaa)." };
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)
        ? { ok: true, valor: limpo }
        : { ok: false, erro: "Necessário ser um email válido." };
    case "url": {
      const url = normalizarLink(/^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`);
      return url ? { ok: true, valor: url } : { ok: false, erro: "Digite um endereço válido." };
    }
    case "phone": {
      const tel = telefoneParaGravar(limpo);
      return tel.ok ? { ok: true, valor: tel.valor } : tel;
    }
    default:
      return { ok: true, valor: limpo };
  }
}

export type TelefoneParaGravar = { ok: true; valor: string } | { ok: false; erro: string };

/** Canônico `+DDI…` (o `PHONE_REGEX` do original: `^\+\d{8,15}$`). */
export function telefoneParaGravar(texto: string): TelefoneParaGravar {
  const limpo = texto.trim();
  if (!limpo) return { ok: false, erro: "Para apagar o telefone, use a ficha do contato." };
  const digitos = limpo.replace(/\D/g, "");
  const comDdi = limpo.startsWith("+")
    ? digitos
    : digitos.length === 10 || digitos.length === 11
      ? `55${digitos}`
      : digitos;
  return /^\d{8,15}$/.test(comDdi)
    ? { ok: true, valor: `+${comDdi}` }
    : { ok: false, erro: "O telefone informado está inválido." };
}

export function filtrarCampos(
  campos: readonly CampoEditavel[],
  busca: string,
  ocultarVazios: boolean,
): CampoEditavel[] {
  const termo = semAcento(busca.trim());
  return campos.filter(
    (c) =>
      (!termo || semAcento(c.rotulo).includes(termo)) && (!ocultarVazios || !campoVazio(c.valor)),
  );
}

export const CHAVE_DOS_VAZIOS = (tipo: string) => `escale_campos_vazios_${tipo}`;

/** true = ocultar os vazios. O padrão (sem nada guardado) é mostrar tudo. */
export function lerOcultarVazios(
  storage: { getItem: (k: string) => string | null } | null,
  tipo: string,
): boolean {
  try {
    return storage?.getItem(CHAVE_DOS_VAZIOS(tipo)) === "1";
  } catch {
    return false;
  }
}

/**
 * O PATCH do contato para UMA chave. `custom_fields` vai inteiro (o handler do
 * original substitui o objeto). E-mail e telefone vazios não geram patch (o
 * schema não aceita apagar; Q4).
 */
export function patchDoContato(
  contato: { custom_fields: Record<string, unknown> | null | undefined },
  chave: string,
  valor: unknown,
): ContactPatch | null {
  if (chave === CHAVE_NOME) return campoVazio(valor) ? null : { name: String(valor) };
  if (chave === CHAVE_TELEFONE) return campoVazio(valor) ? null : { phone_number: String(valor) };
  if (chave === CHAVE_EMAIL) return campoVazio(valor) ? null : { email: String(valor) };
  const atual = { ...(contato.custom_fields ?? {}) };
  if (chave.startsWith(PREFIXO_DA_CHAVE)) {
    const url = campoVazio(valor) ? null : normalizarLink(String(valor));
    if (url) atual[chave] = url;
    else delete atual[chave];
    return { custom_fields: atual };
  }
  if (campoVazio(valor)) delete atual[chave];
  else atual[chave] = valor;
  return { custom_fields: atual };
}
