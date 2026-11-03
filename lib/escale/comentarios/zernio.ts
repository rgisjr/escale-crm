import { zernioBaseUrl } from "@/lib/channels/zernio/credentials";

/**
 * FORK ESCALE · Fase 10B: o HTTP do Zernio para comentário. O `socialRequest` joga fora o corpo do
 * erro, e o motivo da recusa (resposta privada já usada, botão recusado) está nele; por isso o fork
 * tem o próprio `fetch`, com as mesmas proteções (sem redirecionar, sem cache, 15 s).
 * Contrato conferido no SDK 0.0.1300 em 01/11/2026 (plano 10B, seção 2.4).
 */
export type RespostaDoZernio<T> = { ok: true; dados: T } | { ok: false; status: number; corpo: unknown };

export interface BotaoDaResposta {
  titulo: string;
  url: string;
}

/** FORK ESCALE · Fase 10D: botão de link, ou postback (o único que avisa o toque, D13). */
export type BotaoDoDirect =
  | { tipo: "url"; titulo: string; url: string }
  | { tipo: "postback"; titulo: string; payload: string };

const botaoDoZernio = (b: BotaoDoDirect): Record<string, string> =>
  b.tipo === "url"
    ? { type: "url", title: b.titulo, url: b.url }
    : { type: "postback", title: b.titulo, payload: b.payload };

export interface PublicacaoDaConta {
  id: string;
  legenda: string | null;
  miniatura: string | null;
  tipo: string | null;
  criadaEm: string | null;
  link: string | null;
  comentarios: number | null;
}

export type MotivoDoDirect =
  | "prazo_vencido"
  | "resposta_privada_ja_usada"
  | "botoes_recusados"
  | "resultado_incerto"
  | "acesso_recusado"
  | "provedor_indisponivel"
  | "credencial_indisponivel"
  | "janela_fechada"
  | "nao_seguiu"
  | "mensagem_grande_demais";

const TEMPO_LIMITE_MS = 15_000;

/** FORK ESCALE · Fase 10A: exportada (e com `DELETE`) para a caixa de comentários e a 10D. */
export async function pedir<T>(
  chave: string,
  caminho: string,
  metodo: "GET" | "POST" | "DELETE",
  corpo?: unknown,
  idempotencia?: string,
): Promise<RespostaDoZernio<T>> {
  let resposta: Response;
  try {
    resposta = await fetch(`${zernioBaseUrl()}/v1/${caminho}`, {
      method: metodo,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
        ...(idempotencia ? { "Idempotency-Key": idempotencia } : {}),
      },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    });
  } catch {
    // Rede fora ou tempo esgotado: o corpo nunca carrega a chave.
    return { ok: false, status: 0, corpo: null };
  }
  const json: unknown = await resposta.json().catch(() => null);
  return resposta.ok ? { ok: true, dados: json as T } : { ok: false, status: resposta.status, corpo: json };
}

const textoOuNulo = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const objeto = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** POST inbox/comments/{postId}/{commentId}/private-reply → { messageId }. */
export async function respostaPrivada(
  chave: string,
  e: { postId: string; commentId: string; accountId: string; texto: string; botoes: readonly (BotaoDaResposta | BotaoDoDirect)[] },
): Promise<RespostaDoZernio<{ messageId: string | null }>> {
  const r = await pedir<unknown>(
    chave,
    `inbox/comments/${encodeURIComponent(e.postId)}/${encodeURIComponent(e.commentId)}/private-reply`,
    "POST",
    {
      accountId: e.accountId,
      message: e.texto,
      ...(e.botoes.length
        ? { buttons: e.botoes.map((b) => botaoDoZernio("tipo" in b ? b : { tipo: "url", titulo: b.titulo, url: b.url })) }
        : {}),
    },
  );
  return r.ok ? { ok: true, dados: { messageId: textoOuNulo(objeto(r.dados).messageId) } } : r;
}

/**
 * FORK ESCALE · Fase 10D (D8, D13). POST inbox/conversations/{conversationId}/messages. Com anexo E
 * texto são DUAS chamadas: o texto (com botões) e depois o anexo; falha do anexo devolve ok com
 * `anexoFalhou` (o texto já saiu).
 */
export async function enviarDirect(
  chave: string,
  e: {
    conversaZernioId: string;
    accountId: string;
    texto: string;
    botoes: readonly BotaoDoDirect[];
    anexo?: { tipo: string; url: string } | null;
  },
): Promise<RespostaDoZernio<{ messageId: string | null; anexoFalhou: boolean }>> {
  const caminho = `inbox/conversations/${encodeURIComponent(e.conversaZernioId)}/messages`;
  const texto1 = await pedir<unknown>(chave, caminho, "POST", {
    accountId: e.accountId,
    message: e.texto,
    ...(e.botoes.length ? { buttons: e.botoes.map(botaoDoZernio) } : {}),
  });
  if (!texto1.ok) return texto1;
  const messageId = textoOuNulo(objeto(texto1.dados).messageId) ?? textoOuNulo(objeto(objeto(texto1.dados).data).messageId);
  if (!e.anexo) return { ok: true, dados: { messageId, anexoFalhou: false } };
  const anexo = await pedir<unknown>(chave, caminho, "POST", {
    accountId: e.accountId,
    attachmentUrl: e.anexo.url,
    attachmentType: e.anexo.tipo,
  });
  return { ok: true, dados: { messageId, anexoFalhou: !anexo.ok } };
}

/** FORK ESCALE · Fase 10D (D14, D15). POST/DELETE inbox/comments/{postId}/{commentId}/like — só Facebook. */
export function curtirComentario(chave: string, e: AlvoDeModeracao): Promise<RespostaDoZernio<unknown>> {
  return pedir<unknown>(
    chave,
    `inbox/comments/${encodeURIComponent(e.postId)}/${encodeURIComponent(e.commentId)}/like`,
    "POST",
    { accountId: e.accountId },
  );
}

export function descurtirComentario(chave: string, e: AlvoDeModeracao): Promise<RespostaDoZernio<unknown>> {
  return pedir<unknown>(
    chave,
    `inbox/comments/${encodeURIComponent(e.postId)}/${encodeURIComponent(e.commentId)}/like?accountId=${encodeURIComponent(e.accountId)}`,
    "DELETE",
  );
}

/** POST inbox/comments/{postId} com { accountId, message, commentId } e o header Idempotency-Key. */
export async function responderComentario(
  chave: string,
  e: { postId: string; commentId: string; accountId: string; texto: string; idempotencia: string },
): Promise<RespostaDoZernio<{ commentId: string | null }>> {
  const r = await pedir<unknown>(
    chave,
    `inbox/comments/${encodeURIComponent(e.postId)}`,
    "POST",
    { accountId: e.accountId, message: e.texto, commentId: e.commentId },
    e.idempotencia,
  );
  return r.ok ? { ok: true, dados: { commentId: textoOuNulo(objeto(objeto(r.dados).data).commentId) } } : r;
}

interface AlvoDeModeracao {
  postId: string;
  commentId: string;
  accountId: string;
}

/** FORK ESCALE · Fase 10A. POST inbox/comments/{postId}/{commentId}/hide com { accountId }. */
export function ocultarComentario(chave: string, e: AlvoDeModeracao): Promise<RespostaDoZernio<unknown>> {
  return pedir<unknown>(
    chave,
    `inbox/comments/${encodeURIComponent(e.postId)}/${encodeURIComponent(e.commentId)}/hide`,
    "POST",
    { accountId: e.accountId },
  );
}

/** FORK ESCALE · Fase 10A. DELETE inbox/comments/{postId}/{commentId}/hide?accountId= */
export function reexibirComentario(chave: string, e: AlvoDeModeracao): Promise<RespostaDoZernio<unknown>> {
  return pedir<unknown>(
    chave,
    `inbox/comments/${encodeURIComponent(e.postId)}/${encodeURIComponent(e.commentId)}/hide?accountId=${encodeURIComponent(e.accountId)}`,
    "DELETE",
  );
}

/** FORK ESCALE · Fase 10A. DELETE inbox/comments/{postId}?accountId=&commentId= */
export function apagarComentario(chave: string, e: AlvoDeModeracao): Promise<RespostaDoZernio<unknown>> {
  return pedir<unknown>(
    chave,
    `inbox/comments/${encodeURIComponent(e.postId)}?accountId=${encodeURIComponent(e.accountId)}&commentId=${encodeURIComponent(e.commentId)}`,
    "DELETE",
  );
}

/** GET accounts/{accountId}/posts → as 25 mais recentes. */
export async function publicacoesDaConta(chave: string, accountId: string): Promise<RespostaDoZernio<PublicacaoDaConta[]>> {
  const r = await pedir<unknown>(chave, `accounts/${encodeURIComponent(accountId)}/posts`, "GET");
  if (!r.ok) return r;
  const posts = objeto(r.dados).posts;
  const lista = Array.isArray(posts) ? posts : [];
  const publicacoes = lista.flatMap((bruto): PublicacaoDaConta[] => {
    const p = objeto(bruto);
    const id = textoOuNulo(p.id);
    if (!id) return [];
    return [
      {
        id,
        legenda: textoOuNulo(p.message),
        miniatura: textoOuNulo(p.picture),
        tipo: textoOuNulo(p.mediaType),
        criadaEm: textoOuNulo(p.createdTime),
        link: textoOuNulo(p.permalink),
        comentarios: typeof p.commentCount === "number" ? p.commentCount : null,
      },
    ];
  });
  return { ok: true, dados: publicacoes };
}

/** Procura o código de erro da Meta (`code`/`subcode`/`error_subcode`) em `details` ou `error`. */
function codigosDaMeta(corpo: unknown): { code: unknown; subcode: unknown } {
  const raiz = objeto(corpo);
  for (const candidato of [objeto(raiz.details), objeto(raiz.error), objeto(objeto(raiz.details).error)]) {
    const code = candidato.code;
    const subcode = candidato.subcode ?? candidato.error_subcode;
    if (code !== undefined || subcode !== undefined) return { code, subcode };
  }
  return { code: undefined, subcode: undefined };
}

/** D10: o motivo legível pela resposta de erro (status + corpo). */
export function motivoDoErro(status: number, corpo: unknown): MotivoDoDirect {
  if (status === 401 || status === 403) return "acesso_recusado";
  const detalhes = objeto(objeto(corpo).details);
  if (detalhes.privateReplyConsumed === true) return "resposta_privada_ja_usada";
  const { code, subcode } = codigosDaMeta(corpo);
  if (Number(code) === 2 && Number(subcode) === 1545133) return "botoes_recusados";
  // FORK ESCALE · Fase 10D: fora das 24 h da mensagem comum (Meta: código 10, subcódigo 2018278).
  if (Number(code) === 10 && Number(subcode) === 2018278) return "janela_fechada";
  if (/outside of allowed window/i.test(JSON.stringify(corpo ?? ""))) return "janela_fechada";
  if (status === 502 && detalhes.privateReplyOutcome === "unknown") return "resultado_incerto";
  return "provedor_indisponivel";
}

/** Vai em `detail.explicacao`, que a aba Insights (5C) mostra. */
export const EXPLICACAO_DO_MOTIVO: Record<MotivoDoDirect, string> = {
  prazo_vencido:
    "O comentário tem mais de 7 dias. O Instagram só aceita resposta no direct até 7 dias depois do comentário.",
  resposta_privada_ja_usada:
    "Este comentário já recebeu uma resposta no direct. O Instagram aceita uma só por comentário.",
  botoes_recusados:
    "O Instagram recusou a mensagem com botão porque a pessoa não segue a conta. A resposta deste comentário foi gasta.",
  resultado_incerto: "O Instagram não confirmou o envio. Confira a conversa antes de mandar de novo.",
  acesso_recusado: "O Zernio recusou o acesso. Confira a conexão da conta em Canais.",
  provedor_indisponivel: "O Zernio não respondeu agora. A mensagem não foi enviada.",
  janela_fechada:
    "Passaram 24 horas desde a última mensagem da pessoa. O Instagram só aceita mensagem dentro dessa janela.",
  mensagem_grande_demais:
    "A mensagem com os botões é grande demais para o Siga para liberar. Encurte o texto ou os links e salve de novo.",
  nao_seguiu: "A pessoa tocou em liberar 3 vezes sem seguir a conta. O direct não foi enviado.",
  credencial_indisponivel: "A chave do Zernio desta conta não está disponível. Reconecte a conta em Canais.",
};
