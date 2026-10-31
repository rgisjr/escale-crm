/**
 * Regras puras do repositório de mídia da organização (áudios, imagens e arquivos reutilizáveis em
 * automações e respostas rápidas). O arquivo mora no bucket privado `whatsapp-media`, em
 * `{organização}/assets/{ativo}/{nome}`; para enviar, é COPIADO para dentro da pasta da conversa.
 */
export type TipoDeMidia = "audio" | "image" | "video" | "document";

/** 16 MB: o Storage do self-host é uma cota de 1 GB dividida com `whatsapp-media`. */
export const TAMANHO_MAXIMO_DO_ATIVO = 16_777_216;

const ACEITOS: Record<string, string> = {
  "audio/ogg": "ogg",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

/** `audio/ogg; codecs=opus` → `audio/ogg`. */
function semParametros(mime: string): string {
  return mime.split(";")[0]!.trim().toLowerCase();
}

export function tipoDaMidia(mime: string): TipoDeMidia {
  const m = semParametros(mime);
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  return "document";
}

/** Áudio só ogg/opus: a API oficial não converte (e manda erro), o WAHA aceita. */
export function validarMimeDoAtivo(mime: string): { ok: true } | { ok: false; motivo: string } {
  const m = semParametros(mime);
  if (m.startsWith("audio/") && m !== "audio/ogg") return { ok: false, motivo: "audio_precisa_ser_ogg_opus" };
  return m in ACEITOS ? { ok: true } : { ok: false, motivo: "tipo_nao_aceito" };
}

export function extensaoDoMime(mime: string): string {
  return ACEITOS[semParametros(mime)] ?? "bin";
}

export function caminhoDoAtivo(organizationId: string, assetId: string, nome: string): string {
  const limpo =
    nome
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/\.{2,}/g, "")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|-(?=\.)|[-.]+$/g, "")
      .toLowerCase() || "arquivo";
  return `${organizationId}/assets/${assetId}/${limpo}`;
}
