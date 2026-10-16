import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import type { Stage } from "@/lib/kanban/types";
import type { CustomFieldDef } from "@/lib/schemas/settings";
import type { Lead } from "@/lib/types/leads";

/**
 * O CSV DOS CARDS DE UMA ORIGEM (fork Escale, Fase 1E; Clint: "Exportar"). Sai
 * do que a tela mostra — o recorte com os filtros e a RLS de quem olha —, então
 * exporta exatamente o que a pessoa vê, como na Clint.
 *
 * Texto que começa com `=`, `+`, `-`, `@`, tab ou CR ganha um apóstrofo na
 * frente: sem isso, um título "=HYPERLINK(...)" vindo de um formulário vira
 * fórmula ao abrir no Excel (injeção de fórmula em CSV, OWASP). Número não
 * passa pela guarda: o valor negativo continua número (`numeroBr`).
 *
 * Datas e números saem no formato brasileiro (regra do produto): dd/mm/aaaa no
 * fuso de quem exporta e vírgula decimal. Como o separador do CSV segue sendo a
 * vírgula, a célula "1500,00" sai entre aspas pelo escape do RFC 4180.
 */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

/** Um número já formatado em pt-BR (`-10,00`): passa direto, sem a guarda de fórmula. */
export class NumeroBr {
  constructor(readonly texto: string) {}
}

export const numeroBr = (texto: string): NumeroBr => new NumeroBr(texto);

/** Valor em centavos como número pt-BR com duas casas: `150000` vira `1500,00`; `-1000` vira `-10,00`. */
export const reaisDeCentavos = (centavos: number): NumeroBr =>
  numeroBr((centavos / 100).toFixed(2).replace(".", ","));

/** ISO vira dd/mm/aaaa no horário local de quem exporta; data inválida ou ausente sai vazia. */
export function dataBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${d.getFullYear()}`;
}

function textoDoItem(item: unknown): string {
  return item !== null && typeof item === "object" ? (JSON.stringify(item) ?? "") : String(item);
}

function escapar(texto: string): string {
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function celula(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof NumeroBr) return escapar(valor.texto);
  // Número de verdade (campo personalizado): vírgula decimal, sem a guarda de fórmula.
  if (typeof valor === "number") return escapar(String(valor).replace(".", ","));
  let texto = Array.isArray(valor) ? valor.map(textoDoItem).join(", ") : textoDoItem(valor);
  if (INICIO_DE_FORMULA.test(texto)) texto = `'${texto}`;
  return escapar(texto);
}

export interface EntradaDoCsv {
  leads: readonly Lead[];
  stages: readonly Stage[];
  /** Os campos personalizados da origem (`settings.fields`): uma coluna cada, no fim. */
  campos: readonly CustomFieldDef[];
  nomeDoDono: (lead: Lead) => string;
  t: (texto: string) => string;
}

/** select/multiselect: o rótulo da opção, que é o que a tela mostra (o `value` é código interno). */
function valorDoCampo(campo: CustomFieldDef, valor: unknown): unknown {
  if (!campo.options?.length || valor == null) return valor;
  const rotulo = new Map(campo.options.map((o) => [o.value, o.label]));
  return Array.isArray(valor)
    ? valor.map((v) => rotulo.get(String(v)) ?? v)
    : (rotulo.get(String(valor)) ?? valor);
}

export function csvDoQuadro({ leads, stages, campos, nomeDoDono, t }: EntradaDoCsv): string {
  const etapa = new Map(stages.map((s) => [s.id, s.name]));
  const status: Record<string, string> = {
    open: t("Em aberto"),
    won: t("Ganho"),
    lost: t("Perdido"),
  };
  const cabecalho = [
    t("Título"),
    t("Etapa"),
    t("Status"),
    t("Valor"),
    t("Moeda"),
    t("Dono do negócio"),
    t("Nome do contato"),
    t("Telefone"),
    t("E-mail"),
    t("Tags"),
    t("Criado em"),
    t("Atualizado em"),
    ...campos.map((c) => c.label),
  ];
  const linhas = leads.map((l) => [
    l.title,
    etapa.get(l.stage_id) ?? "",
    status[l.status] ?? l.status,
    l.value_cents == null ? "" : reaisDeCentavos(l.value_cents),
    l.currency ?? "",
    nomeDoDono(l),
    dadosDeFiltro(l)?.contato_nome ?? "",
    l.contact_phone ?? "",
    l.contact_email ?? "",
    l.tags,
    dataBr(l.created_at),
    dataBr(l.updated_at),
    ...campos.map((c) => valorDoCampo(c, l.custom_fields?.[c.key]) ?? ""),
  ]);
  return `${[cabecalho, ...linhas].map((linha) => linha.map(celula).join(",")).join("\r\n")}\r\n`;
}

/** `negocios-<origem sem acento>-<AAAA-MM-DD>.csv`. */
export function nomeDoArquivo(origem: string, hoje: Date): string {
  const base =
    origem
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "origem";
  // Data LOCAL de quem exporta: em UTC, depois das 21h no Brasil o arquivo sairia com o dia seguinte.
  const dia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  return `negocios-${base}-${dia}.csv`;
}
