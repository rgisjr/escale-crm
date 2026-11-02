import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { zernioCredsForAccountId } from "@/lib/channels/zernio/credentials";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

import { EXPLICACAO_DO_DIRECT } from "./caixa";
import { contaDaCaixa, type ContaDaCaixa } from "./contas-da-caixa";
import type { ResultadoDaAcao } from "./acoes-manuais";
import { EXPLICACAO_DO_MOTIVO, motivoDoErro } from "./zernio";

/**
 * FORK ESCALE · Fase 10A: o prólogo único das rotas de ação da caixa de comentários (plano 10A, 3.3).
 * `requireSupportWrite()` NÃO mora aqui: o gate `suporte-cobertura-de-efeitos` exige a chamada
 * dentro de cada handler mutante. A 10D encaixa o "Curtir" no mesmo molde.
 */
const ID_MAXIMO = 128;
const alvoSchema = z.object({ canal: z.string().uuid(), publicacao: z.string().min(1).max(ID_MAXIMO) });

export interface AlvoDaAcao {
  canal: string;
  publicacao: string;
}

/** POST: corpo JSON `{ canal, publicacao, ... }`; DELETE: query `?canal=&publicacao=`. */
export async function lerAlvoDaAcao(
  req: NextRequest,
): Promise<{ alvo: AlvoDaAcao; corpo: Record<string, unknown> } | null> {
  const ehDelete = req.method === "DELETE";
  let bruto: unknown;
  if (ehDelete) {
    bruto = Object.fromEntries(req.nextUrl.searchParams.entries());
  } else {
    bruto = await req.json().catch(() => null);
  }
  const lido = alvoSchema.safeParse(bruto);
  if (!lido.success) return null;
  const { canal, publicacao, ...resto } = bruto as Record<string, unknown>;
  void canal;
  void publicacao;
  return { alvo: lido.data, corpo: resto };
}

export interface ContextoDaAcao {
  requestId: string;
  userId: string;
  organizationId: string;
  papel: Role;
  admin: SupabaseClient;
  /** A conta do alvo, já conferida (D7). */
  conta: ContaDaCaixa;
  /** A chave do Zernio da conta (nunca sai da rota). */
  chave: string;
  comentarioId: string;
  publicacaoId: string;
  /** O resto do corpo do POST (texto, autor…). */
  corpo: Record<string, unknown>;
}

export type PreparoDaAcao = { ok: true; ctx: ContextoDaAcao } | { ok: false; response: Response };

const recusa = (response: Response): { ok: false; response: Response } => ({ ok: false, response });

type Autorizado = Extract<Awaited<ReturnType<typeof requireRole>>, { ok: true }>;

interface ContaPreparada {
  admin: SupabaseClient;
  conta: ContaDaCaixa;
  chave: string;
}

/** A conta da org que a pessoa atende (404), com papel mínimo (403), conectada e com credencial (409). */
async function resolverConta(
  auth: Autorizado,
  requestId: string,
  canal: string,
  papelMinimo: "agent" | "manager",
): Promise<{ ok: true; preparada: ContaPreparada } | { ok: false; response: Response }> {
  const admin = createAdminClient();
  const conta = await contaDaCaixa(admin, {
    organizationId: auth.org.orgId,
    userId: auth.user.id,
    papel: auth.org.role,
    canal,
  });
  if (!conta) return recusa(fail("not_found", "Conta não encontrada.", 404, { requestId }));

  if (!roleAtLeast(auth.org.role, papelMinimo)) {
    return recusa(fail("forbidden_role", "Só gerente e administrador podem apagar comentários.", 403, { requestId }));
  }

  const desconectada = () => fail("conta_desconectada", "A conta está desconectada.", 409, { requestId });
  if (!conta.conectada) return recusa(desconectada());
  const credencial = await zernioCredsForAccountId(admin, { organizationId: auth.org.orgId, accountId: conta.contaId });
  if (!credencial) return recusa(desconectada());

  const { status: _status, ...contaSemStatus } = conta;
  return { ok: true, preparada: { admin, conta: contaSemStatus, chave: credencial.apiKey } };
}

export interface ContextoDaLeitura extends ContaPreparada {
  requestId: string;
  userId: string;
  organizationId: string;
  papel: Role;
}

export type PreparoDaLeitura = { ok: true; ctx: ContextoDaLeitura } | { ok: false; response: Response };

/** As rotas de leitura (`contas` fica de fora: só lista). requireRole("agent") → canal (404) → conta e credencial. */
export async function prepararLeituraDaCaixa(canal: string | null): Promise<PreparoDaLeitura> {
  const requestId = randomUUID();
  const auth = await requireRole("agent", { requestId, resource: "channel_session" });
  if (!auth.ok) return recusa(auth.response);
  if (!canal || !z.string().uuid().safeParse(canal).success) {
    return recusa(fail("not_found", "Conta não encontrada.", 404, { requestId }));
  }
  const r = await resolverConta(auth, requestId, canal, "agent");
  if (!r.ok) return r;
  return {
    ok: true,
    ctx: { ...r.preparada, requestId, userId: auth.user.id, organizationId: auth.org.orgId, papel: auth.org.role },
  };
}

/** requireRole("agent") → alvo (422) → conta da org e atendida (404) → `papelMinimo` (403) → WORKING e credencial (409). */
export async function prepararAcaoNoComentario(
  req: NextRequest,
  params: Promise<{ comentarioId: string }>,
  opcoes: { papelMinimo: "agent" | "manager" },
): Promise<PreparoDaAcao> {
  const requestId = randomUUID();
  const auth = await requireRole("agent", { requestId, resource: "channel_session" });
  if (!auth.ok) return recusa(auth.response);

  const { comentarioId } = await params;
  const lido = await lerAlvoDaAcao(req);
  if (!lido || comentarioId.length < 1 || comentarioId.length > ID_MAXIMO) {
    return recusa(fail("validation_failed", "Falha na validação dos dados!", 422, { requestId }));
  }

  const r = await resolverConta(auth, requestId, lido.alvo.canal, opcoes.papelMinimo);
  if (!r.ok) return r;
  return {
    ok: true,
    ctx: {
      ...r.preparada,
      requestId,
      userId: auth.user.id,
      organizationId: auth.org.orgId,
      papel: auth.org.role,
      comentarioId,
      publicacaoId: lido.alvo.publicacao,
      corpo: lido.corpo,
    },
  };
}

/**
 * Erro do Zernio → resposta da rota: 401/403 → 409 `acesso_recusado`; 404 → 404
 * `comentario_nao_encontrado`; 400 com `privateReplyConsumed` → 409 `resposta_privada_ja_usada`;
 * o resto → 502 `provedor_indisponivel`. A mensagem nunca é o corpo do Zernio.
 */
export function respostaDoErroDoZernio(status: number, corpo: unknown, requestId: string): Response {
  if (status === 404) return fail("comentario_nao_encontrado", "O comentário não existe mais.", 404, { requestId });
  const motivo = motivoDoErro(status, corpo);
  if (motivo === "acesso_recusado") {
    return fail("acesso_recusado", EXPLICACAO_DO_MOTIVO.acesso_recusado, 409, { requestId });
  }
  if (motivo === "resposta_privada_ja_usada") {
    return fail("resposta_privada_ja_usada", EXPLICACAO_DO_DIRECT.ja_usado, 409, { requestId });
  }
  return fail("provedor_indisponivel", EXPLICACAO_DO_MOTIVO.provedor_indisponivel, 502, { requestId });
}

/** O desfecho de uma ação à mão → a resposta da rota. */
export function respostaDoResultado(r: ResultadoDaAcao, requestId: string): Response {
  if (r.ok) return ok(r.dados, { requestId });
  if ("jaUsado" in r) return fail("resposta_privada_ja_usada", EXPLICACAO_DO_DIRECT.ja_usado, 409, { requestId });
  const motivo = (r.corpo as { motivo?: unknown } | null)?.motivo;
  if (r.status === 409 && motivo === "prazo_vencido") {
    return fail("prazo_vencido", EXPLICACAO_DO_DIRECT.prazo_vencido, 409, { requestId });
  }
  return respostaDoErroDoZernio(r.status, r.corpo, requestId);
}

/** 500 com `requestId`: o erro vai para o log, nunca para a resposta. */
export function erroInesperado(rota: string, requestId: string, erro: unknown): Response {
  logger.error(`[escale-comentarios] ${rota}`, {
    requestId,
    erro: erro instanceof Error ? erro.message : String(erro),
  });
  return fail("internal_error", "Erro inesperado.", 500, { requestId });
}
