/**
 * AS NOTIFICAÇÕES DA ORIGEM (fork Escale, Fase 1K, D15; código `Ie` da Clint).
 *
 * A Clint manda e-mail em dois eventos (novo negócio vindo de integração;
 * negócio que vira Ganho ou Perdido) às pessoas escolhidas. Aqui o aviso é
 * dentro do app (Q1): o push pelo servidor e o toast pelo tempo real, com a
 * mesma régua (`destinatariosDoEvento` e `avisoDoNegocio`). Pessoas por id (N24).
 */
import { z } from "zod";

import type { EntregarAvisoInput } from "@/lib/notifications/deliver";

export const CHAVE_DAS_NOTIFICACOES = "escale_notificacoes";
export const STATUS_AVISADOS = ["won", "lost"] as const;
export type StatusAvisado = (typeof STATUS_AVISADOS)[number];
export const PESSOAS_DO_AVISO_MAX = 200;
export const ERRO_SEM_USUARIO = "Selecione um usuário para continuar";

export interface NotificacoesDaOrigem {
  novoNegocio: string[];
  mudancaDeStatus: { status: StatusAvisado[]; pessoas: string[] };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function comoRecord(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function ids(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return [
    ...new Set(
      valor
        .filter((x): x is string => typeof x === "string" && UUID.test(x))
        .map((x) => x.toLowerCase()),
    ),
  ].slice(0, PESSOAS_DO_AVISO_MAX);
}

function statusDe(valor: unknown): StatusAvisado[] {
  return Array.isArray(valor)
    ? STATUS_AVISADOS.filter((s) => (valor as unknown[]).includes(s))
    : [];
}

export function lerNotificacoes(settings: unknown): NotificacoesDaOrigem {
  const n = comoRecord(comoRecord(settings)[CHAVE_DAS_NOTIFICACOES]);
  const mudanca = comoRecord(n.mudanca_de_status);
  return {
    novoNegocio: ids(comoRecord(n.novo_negocio).pessoas),
    mudancaDeStatus: { status: statusDe(mudanca.status), pessoas: ids(mudanca.pessoas) },
  };
}

export const notificacoesSchema = z
  .object({
    novo_negocio: z
      .object({ pessoas: z.array(z.string().uuid()).max(PESSOAS_DO_AVISO_MAX) })
      .strict(),
    mudanca_de_status: z
      .object({
        status: z.array(z.enum(STATUS_AVISADOS)).max(STATUS_AVISADOS.length),
        pessoas: z.array(z.string().uuid()).max(PESSOAS_DO_AVISO_MAX),
      })
      .strict(),
  })
  .strict();
export type PatchDasNotificacoes = z.infer<typeof notificacoesSchema>;

/** "Selecione um usuário para continuar": há status escolhido e ninguém para avisar (Clint). */
export function erroDasNotificacoes(n: NotificacoesDaOrigem): string | null {
  return n.mudancaDeStatus.status.length > 0 && n.mudancaDeStatus.pessoas.length === 0
    ? ERRO_SEM_USUARIO
    : null;
}

export function patchDasNotificacoes(n: NotificacoesDaOrigem): PatchDasNotificacoes {
  return {
    novo_negocio: { pessoas: [...n.novoNegocio] },
    mudanca_de_status: {
      status: [...n.mudancaDeStatus.status],
      pessoas: [...n.mudancaDeStatus.pessoas],
    },
  };
}

/** O `settings` com a chave. Só membros ativos; sem ninguém a avisar, a chave some. */
export function gravarNotificacoes(
  settings: Record<string, unknown>,
  p: PatchDasNotificacoes,
  membros: readonly string[],
): { ok: true; settings: Record<string, unknown> } | { ok: false; erro: string } {
  const novo = ids(p.novo_negocio.pessoas);
  const pessoas = ids(p.mudanca_de_status.pessoas);
  const status = statusDe(p.mudanca_de_status.status);
  if (status.length > 0 && pessoas.length === 0) return { ok: false, erro: ERRO_SEM_USUARIO };
  if ([...novo, ...pessoas].some((x) => !membros.includes(x))) {
    return { ok: false, erro: "Este usuário não faz parte da equipe." };
  }
  const resto = Object.fromEntries(
    Object.entries(settings).filter(([k]) => k !== CHAVE_DAS_NOTIFICACOES),
  );
  const avisaStatus = status.length > 0 && pessoas.length > 0;
  if (novo.length === 0 && !avisaStatus) return { ok: true, settings: resto };
  return {
    ok: true,
    settings: {
      ...resto,
      [CHAVE_DAS_NOTIFICACOES]: {
        novo_negocio: { pessoas: novo },
        mudanca_de_status: avisaStatus ? { status, pessoas } : { status: [], pessoas: [] },
      },
    },
  };
}

/** Quem o evento do barramento avisa (servidor). Mudança de status não avisa o dono: o original já o avisa (N22). */
export function destinatariosDoEvento(
  evento: "lead.created" | "lead.won" | "lead.lost",
  n: NotificacoesDaOrigem,
  lead: { owner_user_id: string | null; created_by_user_id: string | null },
): string[] {
  if (evento === "lead.created") return lead.created_by_user_id ? [] : [...n.novoNegocio];
  const status: StatusAvisado = evento === "lead.won" ? "won" : "lost";
  if (!n.mudancaDeStatus.status.includes(status)) return [];
  const dono = lead.owner_user_id?.toLowerCase() ?? null;
  return n.mudancaDeStatus.pessoas.filter((p) => p !== dono);
}

export interface OrigemQueAvisa {
  id: string;
  nome: string;
  novo: boolean;
  status: StatusAvisado[];
}

/** As origens que avisam ESTA pessoa (a rota que a casca lê ao abrir). */
export function origensQueAvisam(
  origens: ReadonlyArray<{ id: string; name: string; settings: unknown }>,
  eu: string,
): OrigemQueAvisa[] {
  const me = eu.toLowerCase();
  return origens.flatMap((o) => {
    const n = lerNotificacoes(o.settings);
    const novo = n.novoNegocio.includes(me);
    const status = n.mudancaDeStatus.pessoas.includes(me) ? [...n.mudancaDeStatus.status] : [];
    return novo || status.length > 0 ? [{ id: o.id, nome: o.name, novo, status }] : [];
  });
}

/** Quanto tempo depois do fechamento um ganho/perda ainda é "notícia" para o tempo real. */
export const JANELA_DO_FECHAMENTO_MS = 60_000;

export interface EntradaDoAviso {
  tipo: "INSERT" | "UPDATE";
  novo: Record<string, unknown>;
  antigo: Record<string, unknown> | null;
  origem: OrigemQueAvisa | undefined;
  eu: string;
  /** Relógio injetável (testes); o padrão é `Date.now()`. */
  agora?: number;
}

/** O aviso na tela para um negócio que chegou pelo tempo real (a RLS já entrega só o que a pessoa vê). */
export function avisoDoNegocio({
  tipo,
  novo,
  antigo,
  origem,
  eu,
  agora = Date.now(),
}: EntradaDoAviso): EntregarAvisoInput | null {
  if (!origem) return null;
  const id = typeof novo.id === "string" ? novo.id : null;
  if (!id) return null;
  const titulo =
    typeof novo.title === "string" && novo.title.trim() ? novo.title.trim() : "Negócio";
  const body = `${origem.nome} · ${titulo}`;
  const href = `/app/negocios/${id}`;
  if (tipo === "INSERT") {
    if (!origem.novo || novo.created_by_user_id) return null;
    return {
      category: "lead_assigned",
      kind: "lead_assigned",
      title: "Novo negócio",
      body,
      tag: `escale-novo:${id}`,
      href,
    };
  }
  const status = novo.status;
  if ((status !== "won" && status !== "lost") || status === antigo?.status) return null;
  if (!origem.status.includes(status)) return null;
  // O `old` do tempo real traz só o `id` (identidade de réplica padrão), então a
  // comparação com o status antigo acima nunca barra nada: qualquer UPDATE de um
  // negócio que já estava ganho/perdido (título, dono, valor...) chega com o
  // status final. O fechamento recente separa a virada de um UPDATE qualquer.
  if (typeof novo.closed_at === "string") {
    const fechadoEm = Date.parse(novo.closed_at);
    if (Number.isFinite(fechadoEm) && agora - fechadoEm > JANELA_DO_FECHAMENTO_MS) return null;
  }
  if (
    typeof novo.owner_user_id === "string" &&
    novo.owner_user_id.toLowerCase() === eu.toLowerCase()
  )
    return null;
  return status === "won"
    ? {
        category: "lead_won",
        kind: "lead_won",
        title: "Negócio ganho",
        body,
        tag: `escale-ganho:${id}`,
        href,
      }
    : {
        category: "lead_lost",
        kind: "lead_lost",
        title: "Negócio perdido",
        body,
        tag: `escale-perdido:${id}`,
        href,
      };
}

/**
 * `avisoDoNegocio` + a memória da sessão: cada negócio+status avisa uma vez só
 * (`jaAvisados` vive num ref do hook). Marca só quando há aviso para entregar.
 */
export function avisoDoNegocioUmaVez(
  entrada: EntradaDoAviso,
  jaAvisados: Set<string>,
): EntregarAvisoInput | null {
  const aviso = avisoDoNegocio(entrada);
  if (!aviso) return null;
  const chave = `${String(entrada.novo.id)}:${entrada.tipo === "INSERT" ? "novo" : String(entrada.novo.status)}`;
  if (jaAvisados.has(chave)) return null;
  jaAvisados.add(chave);
  return aviso;
}
