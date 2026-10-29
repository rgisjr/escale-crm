import { z } from "zod";

import { normalizar } from "@/lib/catalogo/busca";
import type { TagsDoFiltro } from "@/lib/escale/contatos/filtros";

import { perguntaSchema, type FiltroFixo } from "../pergunta";
import type { ModeloNaLista } from "./tipos";

/** O que a pessoa preenche no passo "Configure filtros" (U11). */
export const filtrosDoModeloSchema = z
  .object({
    gruposDeOrigem: z.array(z.string().uuid()).max(100).default([]),
    origens: z.array(z.string().uuid()).max(100).default([]),
    usuarios: z.array(z.string().uuid()).max(100).default([]),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  })
  .strict();
export type FiltrosDoModelo = z.infer<typeof filtrosDoModeloSchema>;

const LIMITE_DO_NOME = 80;

/** U11: tags escolhidas → forma da 2B ("possui" qualquer uma); vazio → undefined. */
export function tagsDoModelo(tags: readonly string[]): TagsDoFiltro | undefined {
  if (tags.length === 0) return undefined;
  return { combinar: "e", grupos: [{ modo: "ou", condicoes: tags.map((tag) => ({ op: "possui" as const, tag })) }] };
}

/** U3: troca só as chaves preenchidas; divisor e pergunta inválida voltam como vieram. Não muta a entrada. */
export function aplicarFiltrosDoModelo(pergunta: unknown, filtros: FiltrosDoModelo): unknown {
  if (!pergunta || typeof pergunta !== "object" || (pergunta as { divisor?: unknown }).divisor === true) return pergunta;
  if (!perguntaSchema.safeParse(pergunta).success) return pergunta;
  const tags = tagsDoModelo(filtros.tags);
  const troca: FiltroFixo = {
    ...(filtros.usuarios.length ? { usuarios: [...filtros.usuarios] } : {}),
    ...(filtros.gruposDeOrigem.length ? { gruposDeOrigem: [...filtros.gruposDeOrigem] } : {}),
    ...(filtros.origens.length ? { origens: [...filtros.origens] } : {}),
    ...(tags ? { tags } : {}),
  };
  if (Object.keys(troca).length === 0) return pergunta;
  const atual = (pergunta as { filtroFixo?: FiltroFixo }).filtroFixo ?? {};
  return { ...(pergunta as object), filtroFixo: { ...atual, ...troca } };
}

/** U5: "{nome} 2", cortado para caber em 80. */
export function nomeDoPainelDoModelo(nome: string): string {
  const sufixo = " 2";
  return `${nome.slice(0, LIMITE_DO_NOME - sufixo.length)}${sufixo}`;
}

/** U7: categoria + busca (sem acento nem maiúscula) + ordem alfabética pt-BR. Devolve cópia. */
export function modelosDaCategoria(
  todos: readonly ModeloNaLista[],
  categoria: "todos" | "meus",
  busca: string,
): ModeloNaLista[] {
  const termo = normalizar(busca);
  return todos
    .filter((m) => categoria === "todos" || m.origem === "organizacao")
    .filter((m) => !termo || normalizar(m.nome).includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }) || a.id.localeCompare(b.id));
}

/** Para o rótulo dos chips do editor: quantos valores por chave. */
export function contarFiltros(f: FiltroFixo | undefined): { usuarios: number; gruposDeOrigem: number; origens: number; tags: number } {
  return {
    usuarios: f?.usuarios?.length ?? 0,
    gruposDeOrigem: f?.gruposDeOrigem?.length ?? 0,
    origens: f?.origens?.length ?? 0,
    tags: f?.tags?.grupos.reduce((soma, g) => soma + g.condicoes.length, 0) ?? 0,
  };
}
