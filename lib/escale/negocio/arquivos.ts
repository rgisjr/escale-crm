/**
 * ARQUIVOS DO CONTATO (fork Escale, Fase 1H; C17, N8): regras puras. Sem
 * React e sem rede. A lista de extensões, o limite de 9 MB e o filtro por
 * extensão são os da Clint (`Cx`, `ImportModal`); o caminho no bucket segue o
 * padrão do anexo de nota interna do original (`{org}/{dono}/{id}.{ext}`).
 */
export interface Arquivo {
  id: string;
  contact_id: string;
  lead_id: string | null;
  user_id: string;
  user_nome: string | null;
  nome: string;
  extensao: string;
  mime: string;
  tamanho: number;
  created_at: string;
}

export const BUCKET_DOS_ARQUIVOS = "arquivos-do-contato";
/**
 * 9 MB, e não os 25 MB da Clint: o `proxy.ts` do original cobre `/api/*` e o Next
 * (experimental.proxyClientMaxBodySize) corta o corpo da requisição em 10 MB, o
 * que quebraria um envio maior com um erro confuso. Subir para 25 MB pede essa
 * opção em `next.config.ts` (arquivo do original): pendência registrada no PR.
 */
export const MAX_ARQUIVO_MB = 9;
export const MAX_ARQUIVO_BYTES = MAX_ARQUIVO_MB * 1024 * 1024;
/** Nunca inclui `storage_path` nem `organization_id`: a lista não entrega o caminho do bucket. */
export const COLUNAS_DO_ARQUIVO =
  "id, contact_id, lead_id, user_id, user_nome, nome, extensao, mime, tamanho, created_at";

export const EXTENSOES_ACEITAS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg",
  "zip",
  "rar",
  "mp4",
  "avi",
  "mp3",
  "wav",
] as const;
export type Extensao = (typeof EXTENSOES_ACEITAS)[number];
export const ACCEPT_DO_INPUT = EXTENSOES_ACEITAS.map((e) => `.${e}`).join(",");

const MIME: Record<Extensao, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  svg: "image/svg+xml",
  zip: "application/zip",
  rar: "application/vnd.rar",
  mp4: "video/mp4",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export type FamiliaDoArquivo = "imagem" | "planilha" | "audio" | "video" | "pacote" | "documento";

export function extensaoDe(nome: string): string | null {
  const i = nome.lastIndexOf(".");
  return i > 0 && i < nome.length - 1 ? nome.slice(i + 1).toLowerCase() : null;
}

export const extensaoAceita = (ext: string | null): ext is Extensao =>
  ext !== null && (EXTENSOES_ACEITAS as readonly string[]).includes(ext);

export type Validacao = { ok: true; extensao: Extensao } | { ok: false; erro: string };

export function validarArquivo(a: { nome: string; tamanho: number }): Validacao {
  if (!a.tamanho || a.tamanho <= 0) return { ok: false, erro: "Arquivo vazio." };
  if (a.tamanho > MAX_ARQUIVO_BYTES)
    return { ok: false, erro: "O arquivo {fileName} excede o limite de {maxMb} MB." };
  const ext = extensaoDe(a.nome);
  if (!extensaoAceita(ext)) return { ok: false, erro: "Tipo de arquivo não suportado." };
  return { ok: true, extensao: ext };
}

export const mimeDaExtensao = (ext: Extensao): string => MIME[ext];

export function familiaDaExtensao(ext: string): FamiliaDoArquivo {
  if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext)) return "imagem";
  if (["xls", "xlsx", "csv"].includes(ext)) return "planilha";
  if (["mp3", "wav"].includes(ext)) return "audio";
  if (["mp4", "avi"].includes(ext)) return "video";
  if (["zip", "rar"].includes(ext)) return "pacote";
  return "documento";
}

/** "512 B", "1,5 KB", "2,0 MB" (vírgula, como pede a regra 5 do CLAUDE.md). */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const unidades = ["KB", "MB", "GB"];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i += 1;
  }
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unidades[i]}`;
}

/** "17/10/2026 13:05:09" (a tabela da Clint mostra dd/mm/aaaa hh:mm:ss). */
export function dataHoraBr(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${data} ${hora}`;
}

const MAX_NOME_DO_ARQUIVO = 255;
/** Controle C0/C1, separadores de linha, marcas de direção do texto (spoofing "fdp.exe") e o que quebra cabeçalho ou caminho. */
const PONTOS_PROIBIDOS: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x200e, 0x200f],
  [0x2028, 0x2029],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];
const CARACTERES_PROIBIDOS = new Set([...'"<>:*?|;']);
const proibido = (c: string): boolean => {
  const ponto = c.codePointAt(0) ?? 0;
  return (
    CARACTERES_PROIBIDOS.has(c) || PONTOS_PROIBIDOS.some(([de, ate]) => ponto >= de && ponto <= ate)
  );
};

/**
 * O nome que a tela mostra e que vai para o `Content-Disposition`: só o último
 * trecho do caminho que o navegador mandou, sem controle, aspas nem marcas de
 * direção, sem pontos no começo e com no máximo 255 caracteres (a extensão fica).
 */
export function nomeSeguro(bruto: string): string {
  const ultimo = bruto.split(/[\\/]/).pop() ?? "";
  const limpo = [...ultimo]
    .filter((c) => !proibido(c))
    .join("")

    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .trim();
  if (limpo.length <= MAX_NOME_DO_ARQUIVO) return limpo;
  const ext = extensaoDe(limpo);
  if (!ext) return limpo.slice(0, MAX_NOME_DO_ARQUIVO);
  const sufixo = `.${ext}`;
  return `${limpo.slice(0, MAX_NOME_DO_ARQUIVO - sufixo.length)}${sufixo}`;
}

export const caminhoNoBucket = (orgId: string, contactId: string, id: string, ext: string) =>
  `${orgId}/${contactId}/${id}.${ext}`;

function segmentosValidos(path: string): string[] | null {
  if (path.includes("\\")) return null;
  const partes = path.split("/");
  if (partes.length !== 3) return null;
  return partes.every((p) => p !== "" && p !== "." && !p.includes("..")) ? partes : null;
}

export function caminhoPertenceA(path: string, orgId: string, contactId: string): boolean {
  const partes = segmentosValidos(path);
  return partes !== null && partes[0] === orgId && partes[1] === contactId;
}

/**
 * O objeto está na pasta da organização (`org/<contato>/<id>.<ext>`). É esta a
 * régua das rotas de baixar e excluir, e não `caminhoPertenceA`: a mescla de
 * contatos troca o `contact_id` da linha, mas o caminho guarda o contato de
 * quando o arquivo subiu. Quem autoriza é a linha (a RLS), não o recálculo.
 */
export function caminhoDaOrganizacao(path: string, orgId: string): boolean {
  const partes = segmentosValidos(path);
  return partes !== null && partes[0] === orgId;
}

export interface FiltroDeArquivos {
  busca: string;
  de?: string;
  ate?: string;
  extensoes: readonly string[];
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** A data local (aaaa-mm-dd) do upload, para comparar com o período escolhido. */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function filtrarArquivos(lista: readonly Arquivo[], f: FiltroDeArquivos): Arquivo[] {
  const termo = semAcento(f.busca.trim());
  return lista.filter((a) => {
    if (termo && !semAcento(a.nome).includes(termo)) return false;
    const dia = diaLocal(a.created_at);
    if (f.de && dia < f.de) return false;
    if (f.ate && dia > f.ate) return false;
    if (f.extensoes.length && !f.extensoes.includes(a.extensao)) return false;
    return true;
  });
}

export type ColunaDeArquivos = "nome" | "data" | "usuario";
export type Direcao = "asc" | "desc";

export function ordenarArquivos(
  lista: readonly Arquivo[],
  coluna: ColunaDeArquivos,
  direcao: Direcao,
): Arquivo[] {
  const sinal = direcao === "asc" ? 1 : -1;
  const chave = (a: Arquivo) =>
    coluna === "nome"
      ? a.nome.toLowerCase()
      : coluna === "usuario"
        ? (a.user_nome ?? "").toLowerCase()
        : a.created_at;
  return [...lista].sort((a, b) =>
    chave(a) < chave(b) ? -sinal : chave(a) > chave(b) ? sinal : 0,
  );
}

export const rotaDosArquivos = (contactId: string) => `/api/v1/contacts/${contactId}/arquivos`;
