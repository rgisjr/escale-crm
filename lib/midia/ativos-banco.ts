import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { audit } from "@/lib/audit";
import { assertUrlDeMidiaSegura } from "@/lib/messaging/media/url-de-midia-externa";
import {
  caminhoDoAtivo,
  extensaoDoMime,
  TAMANHO_MAXIMO_DO_ATIVO,
  tipoDaMidia,
  validarMimeDoAtivo,
  type TipoDeMidia,
} from "@/lib/midia/ativos";

const BUCKET = "whatsapp-media";
const TEMPO_LIMITE_DO_DOWNLOAD_MS = 20_000;

export interface AtivoLido {
  id: string;
  nome: string;
  mime: string;
  sizeBytes: number;
  tipo: TipoDeMidia;
}

/** Lê o corpo aos pedaços e aborta ao passar do teto: sem Content-Length (ou com valor falso) nada vai inteiro para a memória. */
async function lerComTeto(resposta: Response): Promise<Uint8Array> {
  if (!resposta.body) {
    const bytes = new Uint8Array(await resposta.arrayBuffer());
    if (bytes.byteLength > TAMANHO_MAXIMO_DO_ATIVO) throw new Error("ativo_grande_demais");
    return bytes;
  }
  const leitor = resposta.body.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > TAMANHO_MAXIMO_DO_ATIVO) {
      await leitor.cancel();
      throw new Error("ativo_grande_demais");
    }
    pedacos.push(value);
  }
  const inteiro = new Uint8Array(total);
  let posicao = 0;
  for (const p of pedacos) {
    inteiro.set(p, posicao);
    posicao += p.byteLength;
  }
  return inteiro;
}

async function baixar(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
  await assertUrlDeMidiaSegura(url);
  const resposta = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE_DO_DOWNLOAD_MS), redirect: "error" });
  if (!resposta.ok) throw new Error(`download_falhou:${resposta.status}`);
  const declarado = Number(resposta.headers.get("content-length") ?? "0");
  if (declarado > TAMANHO_MAXIMO_DO_ATIVO) throw new Error("ativo_grande_demais");
  const mime = resposta.headers.get("content-type") ?? "application/octet-stream";
  const validacao = validarMimeDoAtivo(mime);
  if (!validacao.ok) throw new Error(validacao.motivo);
  const bytes = await lerComTeto(resposta);
  if (bytes.byteLength === 0) throw new Error("ativo_vazio");
  return { bytes, mime: mime.split(";")[0]!.trim().toLowerCase() };
}

/** Baixa da URL (anti-SSRF, 16 MB, 20 s), guarda no bucket privado e registra o ativo na organização. */
export async function subirAtivoPorUrl(
  admin: SupabaseClient,
  entrada: { organizationId: string; nome: string; url: string; requestId: string; actorUserId: string | null },
): Promise<AtivoLido> {
  const { bytes, mime } = await baixar(entrada.url);
  const id = randomUUID();
  const storagePath = caminhoDoAtivo(entrada.organizationId, id, entrada.nome);
  const { error: erroDoUpload } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: mime, upsert: false });
  if (erroDoUpload) throw new Error(`upload_falhou:${erroDoUpload.message}`);
  const { error } = await admin.from("org_media_assets").insert({
    id,
    organization_id: entrada.organizationId,
    nome: entrada.nome.slice(0, 120),
    mime,
    size_bytes: bytes.byteLength,
    storage_path: storagePath,
  });
  if (error) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  void audit({
    action: "media_asset.created",
    actorUserId: entrada.actorUserId,
    organizationId: entrada.organizationId,
    resourceType: "media_asset",
    resourceId: id,
    requestId: entrada.requestId,
    metadata: { mime, size_bytes: bytes.byteLength },
  });
  return { id, nome: entrada.nome, mime, sizeBytes: bytes.byteLength, tipo: tipoDaMidia(mime) };
}

export async function listarAtivos(admin: SupabaseClient, organizationId: string): Promise<AtivoLido[]> {
  const { data, error } = await admin
    .from("org_media_assets")
    .select("id, nome, mime, size_bytes")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string; nome: string; mime: string; size_bytes: number }>).map((a) => ({
    id: a.id,
    nome: a.nome,
    mime: a.mime,
    sizeBytes: a.size_bytes,
    tipo: tipoDaMidia(a.mime),
  }));
}

/**
 * O `sendMessageHandler` só aceita `media_storage_path` dentro de `{org}/{conversa}/…` (anti-travessia):
 * enviar um ativo é COPIAR o objeto para lá. Ativo e conversa são lidos filtrando a organização.
 */
export async function copiarAtivoParaConversa(
  admin: SupabaseClient,
  entrada: { organizationId: string; assetId: string; conversationId: string },
): Promise<{ storagePath: string; mime: string; tipo: TipoDeMidia }> {
  const [{ data: ativo, error: erroDoAtivo }, { data: conversa, error: erroDaConversa }] = await Promise.all([
    admin
      .from("org_media_assets")
      .select("storage_path, mime")
      .eq("organization_id", entrada.organizationId)
      .eq("id", entrada.assetId)
      .maybeSingle(),
    admin
      .from("conversations")
      .select("id")
      .eq("organization_id", entrada.organizationId)
      .eq("id", entrada.conversationId)
      .maybeSingle(),
  ]);
  if (erroDoAtivo) throw new Error(erroDoAtivo.message);
  if (erroDaConversa) throw new Error(erroDaConversa.message);
  if (!ativo) throw new Error("ativo_nao_encontrado");
  if (!conversa) throw new Error("conversa_nao_encontrada");
  const { storage_path: origem, mime } = ativo as { storage_path: string; mime: string };
  // Defesa em profundidade além do CHECK do banco: o objeto de origem tem de ser DESTE ativo, desta organização.
  if (!origem.startsWith(`${entrada.organizationId}/assets/${entrada.assetId}/`) || origem.includes("..")) {
    throw new Error("ativo_com_caminho_invalido");
  }
  // Destino determinístico: a nova tentativa de um passo reaproveita a cópia em vez de deixar objeto órfão.
  const destino = `${entrada.organizationId}/${entrada.conversationId}/auto-${entrada.assetId}.${extensaoDoMime(mime)}`;
  const { error } = await admin.storage.from(BUCKET).copy(origem, destino);
  if (error && !/already exists|duplicate|409/i.test(error.message)) throw new Error(`copia_falhou:${error.message}`);
  return { storagePath: destino, mime, tipo: tipoDaMidia(mime) };
}
