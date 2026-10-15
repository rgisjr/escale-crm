import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { CustomFieldDef } from "@/lib/schemas/settings";
import type { Lead } from "@/lib/types/leads";

import { dadosDeFiltro } from "./dados-do-quadro";
import type { AlvoDeCampo, CondicaoDeCampo, OperadorDeCampo } from "./tipos";

/**
 * OS CAMPOS QUE O FILTRO "CAMPOS" OFERECE (fork Escale, Fase 1D).
 *
 * Os do NEGÓCIO são os campos personalizados das origens (`settings.fields`):
 * numa visualização, a união das origens, e o primeiro com a chave vence. Os do
 * CONTATO são os fixos que todo negócio tem (nome, e-mail, telefone): os campos
 * personalizados do contato chegam com os grupos de campos (Fase 2, Contatos).
 */
export type TipoFiltravel = "texto" | "opcao" | "opcoes" | "booleano" | "numero" | "data";

export interface CampoFiltravel {
  alvo: AlvoDeCampo;
  chave: string;
  /** O dos campos do contato é texto de interface (passa por `t()`); o do negócio é dado. */
  rotulo: string;
  tipo: TipoFiltravel;
  opcoes?: ReadonlyArray<{ value: string; label: string }>;
}

const TIPO_DO_CAMPO: Record<CustomFieldDef["type"], TipoFiltravel> = {
  text: "texto",
  textarea: "texto",
  email: "texto",
  phone: "texto",
  url: "texto",
  select: "opcao",
  multiselect: "opcoes",
  boolean: "booleano",
  number: "numero",
  currency: "numero",
  date: "data",
};

export const CAMPOS_DO_CONTATO: readonly CampoFiltravel[] = [
  { alvo: "contato", chave: "nome", rotulo: "Nome do contato", tipo: "texto" },
  { alvo: "contato", chave: "email", rotulo: "E-mail do contato", tipo: "texto" },
  { alvo: "contato", chave: "telefone", rotulo: "Telefone do contato", tipo: "texto" },
];

export function camposFiltraveis(settings: ReadonlyArray<Record<string, unknown> | null | undefined>): CampoFiltravel[] {
  const doNegocio = new Map<string, CampoFiltravel>();
  for (const s of settings) {
    for (const def of camposDoFunil(s ?? null)) {
      if (doNegocio.has(def.key)) continue;
      doNegocio.set(def.key, {
        alvo: "negocio",
        chave: def.key,
        rotulo: def.label,
        tipo: TIPO_DO_CAMPO[def.type],
        ...(def.options?.length ? { opcoes: def.options } : {}),
      });
    }
  }
  return [...doNegocio.values(), ...CAMPOS_DO_CONTATO];
}

export const chaveDoCampo = (c: { alvo: AlvoDeCampo; chave: string }) => `${c.alvo}:${c.chave}`;

const OPERADORES: Record<TipoFiltravel, readonly OperadorDeCampo[]> = {
  texto: ["contem", "preenchido", "vazio"],
  opcao: ["igual", "preenchido", "vazio"],
  opcoes: ["contem", "preenchido", "vazio"],
  booleano: ["igual"],
  numero: ["entre", "preenchido", "vazio"],
  data: ["entre", "preenchido", "vazio"],
};

export const operadoresDoTipo = (tipo: TipoFiltravel) => OPERADORES[tipo];

export function condicaoNova(campo: CampoFiltravel): CondicaoDeCampo {
  return {
    alvo: campo.alvo,
    chave: campo.chave,
    op: OPERADORES[campo.tipo][0]!,
    ...(campo.tipo === "booleano" ? { valor: "true" } : {}),
  };
}

function valorDoCampo(lead: Lead, c: Pick<CondicaoDeCampo, "alvo" | "chave">): unknown {
  if (c.alvo === "negocio") return lead.custom_fields?.[c.chave];
  if (c.chave === "nome") return dadosDeFiltro(lead)?.contato_nome ?? null;
  if (c.chave === "email") return lead.contact_email ?? null;
  if (c.chave === "telefone") return lead.contact_phone ?? null;
  return null;
}

const vazio = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Número escrito como número ou como texto ("1.500,00", "1500.5", "R$ 10"). O
 * campo de moeda do negócio já foi gravado das duas formas, conforme a tela.
 */
export function numeroDoValor(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const limpo = v.replace(/[^\d,.-]/g, "");
  // "1.500,00" e "1.000" (milhar com ponto) são do jeito brasileiro; "1500.5" é decimal com ponto.
  const milharComPonto = !limpo.includes(",") && /^-?\d{1,3}(\.\d{3})+$/.test(limpo);
  const normal = limpo.includes(",") || milharComPonto ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  if (normal === "" || normal === "-") return null;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/**
 * O negócio passa na condição? Condição incompleta (sem valor) não restringe:
 * a pessoa ainda está montando o filtro, e esconder tudo no meio do caminho
 * pareceria defeito.
 */
export function passaCondicao(lead: Lead, c: CondicaoDeCampo, campo?: CampoFiltravel): boolean {
  const v = valorDoCampo(lead, c);
  const tipo = campo?.tipo ?? "texto";
  if (c.op === "preenchido") return !vazio(v);
  if (c.op === "vazio") return vazio(v);
  if (c.op === "igual") {
    // "Não" vale também para o campo nunca preenchido.
    if (tipo === "booleano") return c.valor === "false" ? v !== true : v === true;
    if (!c.valor) return true;
    return !vazio(v) && String(v) === c.valor;
  }
  if (c.op === "contem") {
    const procurado = c.valor?.trim();
    if (!procurado) return true;
    if (vazio(v)) return false;
    if (Array.isArray(v)) return v.map(String).includes(procurado);
    return semAcento(String(v)).includes(semAcento(procurado));
  }
  if (!c.valor && !c.ate) return true;
  if (vazio(v)) return false;
  if (tipo === "data") {
    const dia = String(v).slice(0, 10);
    return (!c.valor || dia >= c.valor) && (!c.ate || dia <= c.ate);
  }
  const n = numeroDoValor(v);
  if (n === null) return false;
  const min = c.valor ? numeroDoValor(c.valor) : null;
  const max = c.ate ? numeroDoValor(c.ate) : null;
  return (min === null || n >= min) && (max === null || n <= max);
}
