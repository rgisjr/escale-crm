/**
 * Quem é o usuário desta requisição — lido das CLAIMS do JWT, sem ir ao GoTrue.
 *
 * ─── Por que existe ────────────────────────────────────────────────────────
 *
 * `supabase.auth.getUser()` faz um `GET /auth/v1/user` a CADA chamada. Medido em
 * 26/10/2026 (edge_logs): 10–14 mil idas por dia ao GoTrue só para confirmar
 * quem é a pessoa, numa máquina de 426 MB de RAM que já vive em swap. Rajadas
 * dessas chamadas esperavam 13–30 s e o app mostrava "Erro inesperado".
 *
 * O projeto assina o access token com chave ASSIMÉTRICA (ES256, JWKS em
 * `/auth/v1/.well-known/jwks.json`). Com isso `supabase.auth.getClaims()` valida
 * a ASSINATURA e o `exp` localmente (WebCrypto), com a chave pública guardada em
 * cache por processo: depois da primeira busca da JWKS, nenhuma rede.
 *
 * ─── Risco aceito ──────────────────────────────────────────────────────────
 *
 * Uma sessão revogada no GoTrue (logout global, usuário removido) continua
 * válida até o access token expirar (≤ 1 h, o prazo padrão). É o comportamento
 * que o próprio Supabase recomenda para servidores. O vínculo com a empresa NÃO
 * depende disso: `user_organizations.revoked_at` é lido do banco a cada
 * requisição em `loadAuthUser`.
 *
 * ─── Limite: metadados ficam velhos até o refresh ──────────────────────────
 *
 * `user_metadata`/`app_metadata` vêm do token, então refletem o momento em que
 * ele foi emitido. Quem GRAVA metadado do usuário (`updateUser({ data })`) precisa
 * renovar a sessão logo depois — ver `renovarClaimsDaSessao`.
 *
 * ─── Quando continuar com getUser() ────────────────────────────────────────
 *
 * Onde o dado precisa estar FRESCO no GoTrue: MFA, troca de senha ou de e-mail,
 * aceite de convite, callbacks de login e "sair de todos os aparelhos".
 */
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

export interface UsuarioDoToken {
  /** `claims.sub`. */
  id: string;
  /** `claims.email`, ou "" quando o token não traz. */
  email: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

/**
 * "Não havia sessão nenhuma" — o estado NORMAL, não um incidente.
 *
 * Sem cookie de sessão, o auth-js devolve `AuthSessionMissingError` (status 400)
 * em vez de `error: null`. Como não há `middleware.ts` neste projeto (o gate de
 * `/app/*` é o próprio `app/app/layout.tsx`), todo visitante deslogado e todo
 * crawler passa por aqui sem sessão: logar isso como erro afogaria a linha
 * diagnóstica em tráfego anônimo.
 *
 * Compara por `name` e não por `instanceof`: pode haver mais de uma cópia de
 * `@supabase/auth-js` na árvore, e `instanceof` só acerta quando o erro vem da
 * mesma cópia que o chamador importou.
 */
export function ehSessaoAusente(error: { name?: string } | null | undefined): boolean {
  return error?.name === "AuthSessionMissingError";
}

function comoObjeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {};
}

/**
 * Só aceita `data.claims` de `getClaims()` — que já verificou a assinatura —;
 * nunca decodifica o JWT à mão. Sem claims devolve `usuario: null` e o `error`
 * (que pode ser `null`: sessão ausente sem erro é o caso do visitante).
 */
export async function usuarioDoToken(
  supabase: SupabaseClient,
): Promise<{ usuario: UsuarioDoToken | null; error: AuthError | null }> {
  let resposta: Awaited<ReturnType<typeof supabase.auth.getClaims>>;
  try {
    resposta = await supabase.auth.getClaims();
  } catch (err) {
    // O auth-js só converte em retorno os erros de AUTH; token com partes
    // base64 válidas mas conteúdo que não é JSON, `alg` desconhecido ou chave
    // incompatível ele RELANÇA. Cookie corrompido não pode virar 500 em toda
    // requisição: é "não autenticado" (login / 401), com rastro no log.
    logger.error("[auth] getClaims lançou — tratando como não autenticado", {
      name: err instanceof Error ? err.name : "desconhecido",
      message: err instanceof Error ? err.message : String(err),
    });
    return { usuario: null, error: null };
  }
  const { data, error } = resposta;
  const claims = data?.claims;
  if (!claims?.sub) {
    // ⚠️ `usuario: null` é ambíguo: "não está logado" (estado normal) E "não deu
    // para verificar" (assinatura inválida, token ilegível, JWKS fora do ar).
    // A ação não muda — sem usuário confirmado, o desfecho seguro é tratar como
    // deslogado —, mas a INFORMAÇÃO não pode falhar fechada junto: só o erro que
    // NÃO é sessão ausente deixa rastro. `name` separa as classes de falha
    // (rede x token ilegível); as chaves são as mesmas do log de `loadAuthUser`.
    if (error && !ehSessaoAusente(error)) {
      logger.error("[auth] getClaims falhou — tratando como não autenticado", {
        name: error.name,
        code: error.code ?? null,
        status: error.status ?? null,
        message: error.message,
      });
    }
    return { usuario: null, error: error ?? null };
  }
  return {
    usuario: {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      user_metadata: comoObjeto(claims.user_metadata),
      app_metadata: comoObjeto(claims.app_metadata),
    },
    error: null,
  };
}

/**
 * Renova a sessão para o access token passar a carregar o `user_metadata` novo.
 *
 * `updateUser({ data })` grava no GoTrue, mas o token que o navegador já tem
 * continua com os metadados antigos até o próximo refresh. Como `loadAuthUser`
 * lê idioma, nome, avatar e fuso das claims, sem esta chamada a pessoa trocaria
 * o idioma e a tela só mudaria quando o token vencesse (até 1 h depois).
 * Falha aqui não desfaz a gravação: o pior caso é o valor antigo até o refresh
 * natural, então só devolve se deu certo.
 */
export async function renovarClaimsDaSessao(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.auth.refreshSession();
  if (error) {
    logger.warn("[auth] refreshSession falhou após gravar metadado — claims antigas até o refresh natural", {
      name: error.name,
      message: error.message,
    });
  }
  return !error;
}
