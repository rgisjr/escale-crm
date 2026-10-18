/**
 * A ATRIBUIÇÃO DE GANHO DA ORIGEM (fork Escale, Fase 1K, D14; código `Ks` da Clint).
 *
 * Duas chaves no `settings` da origem: `escale_so_admin_ganha` (a caixa
 * "Atribuição de ganho pelo sistema": só o admin põe o negócio em Ganho; o
 * banco aplica, N15) e `escale_atribuicao_de_ganho` (as regras que escolhem
 * quem leva o crédito do ganho, N17). Leitura tolerante: lixo vira "sem regra".
 */
import { z } from "zod";

import type { Role } from "@/lib/auth/types";
import { normalizarTag } from "@/lib/contacts/tag-normalizada";
import { TIPOS_DE_ATIVIDADE, type TipoDeAtividade } from "@/lib/escale/playbook/regras";

/** Cópia local do `comoRecord` de `configuracoes/tipos.ts`: `tipos.ts` importa este arquivo (sem ciclo). */
function comoRecord(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

export const CHAVE_DO_SO_ADMIN = "escale_so_admin_ganha";
export const CHAVE_DA_ATRIBUICAO = "escale_atribuicao_de_ganho";
export const CONDICOES_MAX = 20;
export const VEZES_MAX = 999;

/** A lista da Clint (print 027): a ordem e os rótulos dela; os valores da 1I (N20). */
export const TIPOS_NA_ATRIBUICAO: ReadonlyArray<{ valor: TipoDeAtividade; rotulo: string }> = [
  { valor: "ligacao", rotulo: "Ligação" },
  { valor: "email", rotulo: "Email" },
  { valor: "agendamento", rotulo: "Agendamento" },
  { valor: "tarefa", rotulo: "Tarefa" },
  { valor: "reuniao", rotulo: "Reunião" },
  { valor: "whatsapp", rotulo: "Whatsapp" },
  { valor: "instagram", rotulo: "Instagram" },
];

export type CondicaoDeGanho =
  { tipo: "atividade"; vezes: number; atividade: TipoDeAtividade } | { tipo: "tag"; tag: string };
export interface AtribuicaoDeGanho {
  operador: "e" | "ou";
  condicoes: CondicaoDeGanho[];
}

/** Na tela, o número é o texto do campo e o tipo pode estar vazio. */
export type CondicaoNaTela =
  | { tipo: "atividade"; vezes: string; atividade: TipoDeAtividade | "" }
  | { tipo: "tag"; tag: string };
export interface AtribuicaoNaTela {
  soAdmin: boolean;
  operador: "e" | "ou";
  condicoes: CondicaoNaTela[];
}

/** A linha que a Clint mostra numa origem sem regra (`won_attribution` padrão). */
export const CONDICAO_VAZIA: CondicaoNaTela = { tipo: "atividade", vezes: "1", atividade: "" };

export function soAdminGanha(settings: unknown): boolean {
  return comoRecord(settings)[CHAVE_DO_SO_ADMIN] === true;
}

function condicaoLida(bruta: unknown): CondicaoDeGanho | null {
  const c = comoRecord(bruta);
  if (
    c.tipo === "atividade" &&
    (TIPOS_DE_ATIVIDADE as readonly unknown[]).includes(c.atividade) &&
    Number.isInteger(c.vezes) &&
    (c.vezes as number) >= 1 &&
    (c.vezes as number) <= VEZES_MAX
  ) {
    return {
      tipo: "atividade",
      vezes: c.vezes as number,
      atividade: c.atividade as TipoDeAtividade,
    };
  }
  if (c.tipo === "tag" && typeof c.tag === "string") {
    const tag = normalizarTag(c.tag);
    return tag ? { tipo: "tag", tag } : null;
  }
  return null;
}

export function lerAtribuicao(settings: unknown): AtribuicaoDeGanho {
  const bruta = comoRecord(comoRecord(settings)[CHAVE_DA_ATRIBUICAO]);
  const lista = Array.isArray(bruta.condicoes) ? bruta.condicoes : [];
  return {
    operador: bruta.operador === "ou" ? "ou" : "e",
    condicoes: lista
      .map(condicaoLida)
      .filter((c): c is CondicaoDeGanho => c !== null)
      .slice(0, CONDICOES_MAX),
  };
}

export function atribuicaoDaTela(fork: {
  soAdminGanha: boolean;
  atribuicao: AtribuicaoDeGanho;
}): AtribuicaoNaTela {
  const condicoes: CondicaoNaTela[] = fork.atribuicao.condicoes.map((c) =>
    c.tipo === "atividade"
      ? { tipo: "atividade", vezes: String(c.vezes), atividade: c.atividade }
      : c,
  );
  return {
    soAdmin: fork.soAdminGanha,
    operador: fork.atribuicao.operador,
    condicoes: condicoes.length > 0 ? condicoes : [CONDICAO_VAZIA],
  };
}

export const atribuicaoSchema = z
  .object({
    so_admin: z.boolean(),
    operador: z.enum(["e", "ou"]),
    condicoes: z
      .array(
        z.discriminatedUnion("tipo", [
          z
            .object({
              tipo: z.literal("atividade"),
              vezes: z.number().int().min(1).max(VEZES_MAX),
              atividade: z.enum(TIPOS_DE_ATIVIDADE),
            })
            .strict(),
          z.object({ tipo: z.literal("tag"), tag: z.string().min(1).max(80) }).strict(),
        ]),
      )
      .max(CONDICOES_MAX),
  })
  .strict();
export type PatchDaAtribuicao = z.infer<typeof atribuicaoSchema>;

/** Da tela para o PATCH: condição sem tipo e tag vazia não vão (N20); número fora da faixa trava. */
export function patchDaAtribuicao(
  tela: AtribuicaoNaTela,
): { ok: true; patch: PatchDaAtribuicao } | { ok: false; erro: string } {
  const condicoes: PatchDaAtribuicao["condicoes"] = [];
  for (const c of tela.condicoes) {
    if (c.tipo === "tag") {
      const tag = normalizarTag(c.tag);
      if (tag) condicoes.push({ tipo: "tag", tag });
      continue;
    }
    if (!c.atividade) continue;
    const vezes = Number(c.vezes.trim());
    if (!Number.isInteger(vezes) || vezes < 1 || vezes > VEZES_MAX) {
      return { ok: false, erro: "Informe quantas vezes, de 1 a 999." };
    }
    condicoes.push({ tipo: "atividade", vezes, atividade: c.atividade });
  }
  return { ok: true, patch: { so_admin: tela.soAdmin, operador: tela.operador, condicoes } };
}

/** O `settings` com as duas chaves: o true entra, o false some; sem condição, a regra some. */
export function gravarAtribuicao(
  settings: Record<string, unknown>,
  p: PatchDaAtribuicao,
): Record<string, unknown> {
  const { [CHAVE_DO_SO_ADMIN]: _so, [CHAVE_DA_ATRIBUICAO]: _regra, ...resto } = settings;
  return {
    ...resto,
    ...(p.so_admin ? { [CHAVE_DO_SO_ADMIN]: true } : {}),
    ...(p.condicoes.length > 0
      ? {
          [CHAVE_DA_ATRIBUICAO]: {
            operador: p.operador,
            condicoes: p.condicoes.map((c) =>
              c.tipo === "tag" ? { tipo: "tag", tag: normalizarTag(c.tag) } : c,
            ),
          },
        }
      : {}),
  };
}

/** Quem pode pôr o negócio em Ganho nesta origem (Clint `canWinDeal`). */
export function podeMarcarGanho({
  papel,
  soAdmin,
}: {
  papel: Role | string | null | undefined;
  soAdmin: boolean;
}): boolean {
  return !soAdmin || papel === "admin";
}

/** As frases da janela "Atribuição de ganho" (Clint DealWonModal). Quem mostra passa o modelo por `t()` e troca os marcadores. */
export function frasesDasRegras(
  regras: AtribuicaoDeGanho,
): Array<{ modelo: string; valores: Record<string, string> }> {
  return regras.condicoes.map((c) =>
    c.tipo === "atividade"
      ? {
          modelo: "Ter realizado {n} vezes a atividade do tipo {tipo}",
          valores: {
            n: String(c.vezes),
            tipo: TIPOS_NA_ATRIBUICAO.find((x) => x.valor === c.atividade)?.rotulo ?? c.atividade,
          },
        }
      : { modelo: "Possuir a tag {tag}", valores: { tag: c.tag } },
  );
}
