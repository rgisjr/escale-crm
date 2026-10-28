import { roleAtLeast, type Role } from "@/lib/auth/types";
import { normalizar } from "@/lib/catalogo/busca";

import type { EdicaoDoPainel } from "./tipos";

/**
 * AS REGRAS DA LISTA DE PAINÉIS (fork Escale, Fase 7B) — puras, sem tela nem banco.
 */

/** Os papéis que o seletor da aba Permissões oferece (papéis no lugar de setores, decisão 5). */
export const PAPEIS_DO_PAINEL = ["agent", "manager", "admin"] as const satisfies readonly Role[];
export type PapelDoPainel = (typeof PAPEIS_DO_PAINEL)[number];

const LIMITE_DO_NOME = 80;

export function podeGerirPaineis(papel: Role | null): boolean {
  return roleAtLeast(papel, "manager");
}

/** Busca da Clint: pelo nome, sem acento nem maiúscula. */
export function filtrarPaineis<T extends { nome: string }>(paineis: readonly T[], busca: string): T[] {
  const termo = normalizar(busca);
  if (!termo) return [...paineis];
  return paineis.filter((p) => normalizar(p.nome).includes(termo));
}

/** Ordem alfabética (10-001); empate pelo id. Devolve cópia. */
export function ordenarPaineis<T extends { id: string; nome: string }>(paineis: readonly T[]): T[] {
  return [...paineis].sort(
    (a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }) || a.id.localeCompare(b.id),
  );
}

/** "{nome} (cópia)", cortado para caber no limite do nome. */
export function nomeDaCopia(nome: string): string {
  const sufixo = " (cópia)";
  return `${nome.slice(0, LIMITE_DO_NOME - sufixo.length)}${sufixo}`;
}

/** Quem grava continua vendo o painel com as listas novas? (Q5) */
export function continuaVendo(
  eu: { id: string; papel: Role },
  usuarios: readonly string[],
  papeis: readonly string[],
): boolean {
  if (eu.papel === "admin") return true;
  if (usuarios.length === 0 && papeis.length === 0) return true;
  return usuarios.includes(eu.id.toLowerCase()) || papeis.includes(eu.papel);
}

/** 10-004: a chave do rótulo do seletor; vira a contagem quando há escolha (`{n}` no texto). */
export function textoDaContagem(n: number, tipo: "usuario" | "papel"): string {
  if (tipo === "usuario") {
    if (n === 0) return "Usuários";
    return n === 1 ? "1 usuário selecionado" : "{n} usuários selecionados";
  }
  if (n === 0) return "Papéis";
  return n === 1 ? "1 papel selecionado" : "{n} papéis selecionados";
}

function mesmoConjunto(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const conjunto = new Set(a);
  return b.every((v) => conjunto.has(v));
}

/** O corpo do PATCH: só os campos que mudaram (nome com trim, listas sem ordem). */
export function camposMudados(antes: EdicaoDoPainel, depois: EdicaoDoPainel): Partial<EdicaoDoPainel> {
  return {
    ...(antes.nome.trim() !== depois.nome.trim() && { nome: depois.nome.trim() }),
    ...(antes.cor !== depois.cor && { cor: depois.cor }),
    ...(antes.icone !== depois.icone && { icone: depois.icone }),
    ...(!mesmoConjunto(antes.permissoesUsuarios, depois.permissoesUsuarios) && {
      permissoesUsuarios: [...depois.permissoesUsuarios],
    }),
    ...(!mesmoConjunto(antes.permissoesPapeis, depois.permissoesPapeis) && {
      permissoesPapeis: [...depois.permissoesPapeis],
    }),
  };
}

/** Habilita o "Salvar" (B1): nome (com trim), cor, ícone e as duas listas (sem ordem). */
export function mudouAlgo(antes: EdicaoDoPainel, depois: EdicaoDoPainel): boolean {
  return Object.keys(camposMudados(antes, depois)).length > 0;
}
