import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { formatarTelefone, instagramDoLink } from "@/lib/escale/contatos/regras";
import { celula } from "@/lib/escale/exportar/csv-do-quadro";
import { lerLinks } from "@/lib/leads/links-de-contato";

/**
 * O CSV DA EXPORTAÇÃO DE CONTATOS (fork Escale, Fase 2B). Montado no servidor
 * (o consumidor da ação), com a guarda de fórmula da 1E (`celula`), BOM UTF-8
 * para o Excel e datas no fuso da organização, no formato brasileiro.
 */
export type ContatoExportado = {
  name: string | null;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown> | null;
  birthdate: string | null;
  source: string | null;
  created_at: string;
  last_activity_at: string | null;
};

export const COLUNAS_EXPORTADAS =
  "id, name, display_name, email, phone_number, tags, custom_fields, birthdate, source, created_at, last_activity_at";

export const CABECALHO_DO_CSV = [
  "Nome",
  "Telefone",
  "E-mail",
  "Instagram",
  "Tags",
  "Data de nascimento",
  "Origem",
  "Criado em",
  "Última atividade",
] as const;

export function dataHoraBr(iso: string | null, fuso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(", ", " ");
}

/** "1990-05-01" → "01/05/1990" (dia sem fuso: é data de calendário). */
export function diaBr(dia: string | null): string {
  if (!dia) return "";
  const [a, m, d] = dia.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function linhaDoCsv(c: ContatoExportado, fuso: string): string[] {
  const links = lerLinks(c.custom_fields ?? {}) as Record<string, string>;
  return [
    nomeDoContato(c) ?? "",
    formatarTelefone(c.phone_number),
    c.email ?? "",
    instagramDoLink(links.instagram ?? null) ?? "",
    (c.tags ?? []).join("; "),
    diaBr(c.birthdate),
    c.source ?? "",
    dataHoraBr(c.created_at, fuso),
    dataHoraBr(c.last_activity_at, fuso),
  ];
}

export function csvDeContatos(linhas: readonly string[][]): string {
  const corpo = [[...CABECALHO_DO_CSV], ...linhas].map((l) => l.map(celula).join(",")).join("\r\n");
  return `﻿${corpo}\r\n`;
}

/** "contatos-2026-10-17.csv", com o dia no fuso da organização. */
export function nomeDoArquivoDeContatos(agora: number, fuso: string): string {
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(agora));
  return `contatos-${dia}.csv`;
}
