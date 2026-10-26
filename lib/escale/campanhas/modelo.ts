import { renderizar, type ValoresDoDestinatario } from "@/lib/campanhas/renderizador";
import type { FontesDasVariaveis } from "@/lib/variaveis/resolver";

import { mensagemSchema, type MensagemDeModelo, type VariavelDoModelo } from "./assistente";

/**
 * AS VARIÁVEIS DO MODELO DA META (fork Escale, Fase 8B; PRD B6; N5, N6). Cada
 * slot vira um token do renderizador da campanha (`{{primeiro_nome}}`,
 * `{{lead.gancho}}`), e a MESMA régua decide o valor e a falta. A saudação fica
 * literal no snapshot e é resolvida no envio, como no texto livre.
 */
export const CAMPOS_BASICOS = [
  { campo: "nome", rotulo: "Nome" },
  { campo: "primeiro_nome", rotulo: "Primeiro nome" },
  { campo: "saudacao", rotulo: "Saudação" },
] as const;

const POSICIONAL = /\{\{\s*(\d{1,2})\s*\}\}/g;

/**
 * O token do renderizador. Desde a Frente V o campo pode ser um token da lista
 * única (`[CONTACT.FIRST_NAME]`), que vai como está; os valores antigos
 * (`primeiro_nome`, `lead.x`) seguem como `{{campo}}`.
 */
export const tokenDoCampo = (campo: string): string => (campo.startsWith("[") ? campo : `{{${campo}}}`);

/**
 * Na campanha, os tokens da lista única leem o que a preparação já tem de cada
 * destinatário: o nome e os campos personalizados do contato e do negócio
 * (`fontesDoDestinatario`). O seletor da campanha só oferece esses.
 */
export const CAMPOS_FIXOS_DA_CAMPANHA = new Set(["[CONTACT.NAME]", "[CONTACT.FIRST_NAME]", "[CONTACT.LAST_NAME]"]);
const FIXOS_DO_CONTATO = new Set(["NAME", "FIRST_NAME", "LAST_NAME", "ROLE", "EMAIL", "PHONE", "ID", "ORGANIZATION"]);
const FIXOS_DO_NEGOCIO = new Set(["DATE", "STATUS", "STAGE", "VALUE", "ID", "LATEST_MEETING_LINK", "LATEST_MEETING_DATETIME"]);

/** O token da lista única que a campanha sabe resolver (para o seletor e a prévia). */
export function tokenDaCampanha(token: string): boolean {
  if (CAMPOS_FIXOS_DA_CAMPANHA.has(token) || token === "{{saudacao}}") return true;
  const m = /^\[(DEAL|CONTACT)\.([A-Z0-9_]+)\]$/.exec(token);
  if (!m) return false;
  return m[1] === "DEAL" ? !FIXOS_DO_NEGOCIO.has(m[2]!) : !FIXOS_DO_CONTATO.has(m[2]!);
}

export function fontesDoDestinatario(v: ValoresDoDestinatario): FontesDasVariaveis {
  return {
    contato: { id: null, nome: v.nome, email: null, telefone: null, campos: v.contato ?? null },
    negocio: v.lead
      ? { id: null, criadoEm: null, status: null, etapa: null, valorCentavos: null, moeda: null, campos: v.lead }
      : null,
  };
}

/** `[DEAL.X]` → `{{lead.x}}` e `[CONTACT.X]` → `{{contato.x}}`: o que a audiência lê para saber que mapas buscar. */
function equivalenteAntigo(campo: string): string {
  const m = /^\[(DEAL|CONTACT)\.([A-Z0-9_]+)\]$/.exec(campo);
  if (!m || CAMPOS_FIXOS_DA_CAMPANHA.has(campo)) return tokenDoCampo(campo);
  return `{{${m[1] === "DEAL" ? "lead" : "contato"}.${m[2]!.toLowerCase()}}}`;
}

/** As variáveis numeradas do corpo, na ordem em que aparecem, sem repetir. */
export function variaveisDoCorpo(corpo: string): string[] {
  const vistas = new Set<string>();
  for (const m of corpo.matchAll(POSICIONAL)) vistas.add(m[1]!);
  return [...vistas];
}

/** Os tokens que o modelo usa: decide se a preparação busca os campos personalizados. */
export function tokensDoModelo(m: MensagemDeModelo): string {
  return Object.values(m.variaveis)
    .map((v) => (v.fonte === "campo" ? equivalenteAntigo(v.campo) : ""))
    .join(" ");
}

export function valoresDoModelo(
  m: MensagemDeModelo,
  valores: ValoresDoDestinatario,
  quando?: { agora: Date; fuso: string },
): { valores: Record<string, string>; faltando: string[] } {
  const saida: Record<string, string> = {};
  const faltando: string[] = [];
  for (const [chave, v] of Object.entries(m.variaveis)) {
    if (v.fonte === "fixo") {
      saida[chave] = v.valor;
      continue;
    }
    const r = renderizar(
      tokenDoCampo(v.campo),
      v.campo.startsWith("[") ? { ...valores, fontes: fontesDoDestinatario(valores) } : valores,
      quando,
    );
    if (r.faltando.length === 0) {
      saida[chave] = r.texto;
      continue;
    }
    const alternativo = (v.alternativo ?? "").trim();
    if (alternativo !== "") saida[chave] = alternativo;
    else faltando.push(chave);
  }
  return { valores: saida, faltando };
}

/** O corpo legível com os valores no lugar de `{{n}}` (o que fica no snapshot e na conversa). */
export function corpoComValores(corpo: string, valores: Readonly<Record<string, string>>): string {
  return corpo.replace(POSICIONAL, (literal, n: string) => valores[n] ?? literal);
}

/** O trecho em volta da variável, como a Clint mostra: "…Oi, {{1}}! Tudo bem?…". */
export function trechoDaVariavel(corpo: string, chave: string, raio = 12): string {
  const achado = new RegExp(`\\{\\{\\s*${chave.replace(/[^0-9]/g, "")}\\s*\\}\\}`).exec(corpo);
  if (!achado || !/^\d+$/.test(chave)) return `{{${chave}}}`;
  const inicio = achado.index;
  const fim = inicio + achado[0].length;
  const de = Math.max(0, inicio - raio);
  const ate = Math.min(corpo.length, fim + raio);
  const texto = `${corpo.slice(de, inicio)}{{${chave}}}${corpo.slice(fim, ate)}`
    .replace(/\s+/g, " ")
    .trim();
  return `${de > 0 ? "…" : ""}${texto}${ate < corpo.length ? "…" : ""}`;
}

export function variavelResolvida(v: VariavelDoModelo | undefined): boolean {
  if (!v) return false;
  return v.fonte === "fixo" ? v.valor.trim() !== "" : true;
}

export function contagemResolvida(
  chaves: readonly string[],
  variaveis: Readonly<Record<string, VariavelDoModelo>>,
): { feitas: number; total: number } {
  return {
    feitas: chaves.filter((c) => variavelResolvida(variaveis[c])).length,
    total: chaves.length,
  };
}

export type EntradaDoEnvio =
  | { type: "text"; body: string }
  | {
      type: "template";
      body: string;
      template_name: string;
      template_language: string;
      template_values: Record<string, string>;
    };

function valoresCongelados(variables: unknown): Record<string, string> {
  const modelo = (variables as { modelo?: unknown } | null | undefined)?.modelo;
  if (!modelo || typeof modelo !== "object" || Array.isArray(modelo)) return {};
  return Object.fromEntries(
    Object.entries(modelo as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === "string",
    ),
  );
}

/**
 * O que a rodada (e o teste) entrega ao `sendMessageHandler`. Campanha sem
 * modelo (texto livre, ou do formulário antigo) segue `type: "text"`, igual a
 * hoje. Com modelo, os valores congelados na preparação passam pelo
 * renderizador na hora do envio (a saudação é da hora em que sai).
 */
export function entradaDoEnvio(
  mensagem: unknown,
  corpo: string,
  variables: unknown,
  quando: { agora: Date; fuso: string },
  nome: string | null,
): EntradaDoEnvio {
  const m = mensagemSchema.safeParse(mensagem);
  if (!m.success || m.data.tipo !== "modelo") return { type: "text", body: corpo };
  const valores = Object.fromEntries(
    Object.entries(valoresCongelados(variables)).map(([k, v]) => [
      k,
      renderizar(v, { nome }, quando).texto,
    ]),
  );
  return {
    type: "template",
    body: corpo,
    template_name: m.data.nome,
    template_language: m.data.idioma,
    template_values: valores,
  };
}

/** O modelo da campanha, quando a mensagem é modelo (campanha do original e texto livre: `null`). */
export function modeloDaCampanha(mensagem: unknown): MensagemDeModelo | null {
  const m = mensagemSchema.safeParse(mensagem);
  return m.success && m.data.tipo === "modelo" ? m.data : null;
}
