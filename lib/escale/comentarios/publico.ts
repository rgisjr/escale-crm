import { PREFIXO_DO_LIBERAR, type PlataformaDeComentario } from "./constantes";
import type { PublicoDoComentario } from "./schema";

/** FORK ESCALE · Fase 10D (D12/D13): quem recebe a mensagem no gatilho de comentário. */
export type DecisaoDoPublico = "enviar" | "fora_do_publico" | "pedir_para_seguir";

/** `seguidor` = isFollower do webhook (null = não informado). Facebook (plataforma) → sempre "enviar". */
export function decisaoDoPublico(
  publico: PublicoDoComentario | null,
  plataforma: PlataformaDeComentario,
  seguidor: boolean | null,
): DecisaoDoPublico {
  if (plataforma !== "instagram" || publico === null || publico.quem === "todos") return "enviar";
  const quando = publico.quando_nao_informado;
  if (publico.quem === "seguidores") {
    if (seguidor === true) return "enviar";
    if (seguidor === false) return "pedir_para_seguir";
    if (quando === "nao_enviar") return "fora_do_publico";
    return quando === "pedir_para_seguir" ? "pedir_para_seguir" : "enviar";
  }
  // nao_seguidores
  if (seguidor === true) return "fora_do_publico";
  if (seguidor === false) return "enviar";
  return quando === "enviar" ? "enviar" : "fora_do_publico";
}

export function payloadDoLiberar(disparoId: string): string {
  return `${PREFIXO_DO_LIBERAR}${disparoId}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O uuid depois do prefixo, senão null. */
export function disparoDoLiberar(payload: string | null | undefined): string | null {
  if (!payload || !payload.startsWith(PREFIXO_DO_LIBERAR)) return null;
  const id = payload.slice(PREFIXO_DO_LIBERAR.length);
  return UUID.test(id) ? id : null;
}
