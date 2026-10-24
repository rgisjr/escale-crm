import { z } from "zod";

/** NOTAS DO NEGÓCIO (fork Escale, Fase 1H; C15, N7): o contrato entre a tela e as rotas. */
export const MAX_TEXTO_DA_NOTA = 4000;

export interface Nota {
  id: string;
  /** Nulo: nota do contato (9106, Fase 2E). */
  lead_id: string | null;
  contact_id: string | null;
  user_id: string;
  user_nome: string | null;
  texto: string;
  created_at: string;
  updated_at: string;
}

export const COLUNAS_DA_NOTA =
  "id, lead_id, contact_id, user_id, user_nome, texto, created_at, updated_at";

export const notaSchema = z
  .object({
    texto: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1).max(MAX_TEXTO_DA_NOTA)),
  })
  .strict();

export const rotaDasNotas = (leadId: string) => `/api/v1/leads/${leadId}/notas`;

/** FORK ESCALE · Fase 2E (Q5): a nota é do negócio ou do contato. */
export type AlvoDaNota = { tipo: "negocio" | "contato"; id: string };

export const rotaDasNotasDoAlvo = (alvo: AlvoDaNota) =>
  alvo.tipo === "negocio" ? rotaDasNotas(alvo.id) : `/api/v1/contatos/${alvo.id}/notas`;

/**
 * O nome que a nota leva como autor: o do perfil; sem ele, a parte local do
 * e-mail. O banco carimba por cima quando há sessão (trigger da 9008), então
 * isto é o reserva; o corpo da requisição nunca decide.
 */
export function nomeDoAutor(user: {
  full_name?: string | null;
  email?: string | null;
}): string | null {
  const nome = user.full_name?.trim();
  if (nome) return nome;
  const local = user.email?.split("@")[0]?.trim();
  return local ? local : null;
}

/** SQLSTATE 42501 (insufficient_privilege): a RLS ou o grant recusou a escrita. */
export const ehPermissaoNegada = (error: { code?: string | null } | null | undefined): boolean =>
  error?.code === "42501";
