import { campoDaColuna } from "@/lib/leads/planilha";

/**
 * O MAPEAMENTO DA IMPORTAÇÃO (fork Escale, Fase 1E; Clint v2: "Mapeie os campos
 * do seu arquivo"). A rota de importação que já existe lê o cabeçalho pelo nome:
 * mapear, aqui, é reescrever o cabeçalho com o nome que ela reconhece e tirar as
 * colunas que a pessoa não quer. Só os campos que a rota lê (E10d).
 */
export const CAMPOS_DA_IMPORTACAO = [
  { chave: "contato", rotulo: "Nome do contato", grupo: "contato", cabecalho: "nome do contato" },
  { chave: "telefone", rotulo: "Telefone", grupo: "contato", cabecalho: "telefone" },
  { chave: "email", rotulo: "Email", grupo: "contato", cabecalho: "email" },
  { chave: "titulo", rotulo: "Nome do negócio", grupo: "negocio", cabecalho: "nome" },
  { chave: "valor", rotulo: "Valor do negócio", grupo: "negocio", cabecalho: "valor" },
  { chave: "descricao", rotulo: "Observação", grupo: "negocio", cabecalho: "observacao" },
  { chave: "origem", rotulo: "Fonte", grupo: "negocio", cabecalho: "origem" },
  { chave: "etiquetas", rotulo: "Tags", grupo: "negocio", cabecalho: "tags" },
] as const;

export type ChaveDaImportacao = (typeof CAMPOS_DA_IMPORTACAO)[number]["chave"];
export type MapaDaImportacao = ReadonlyArray<ChaveDaImportacao | null>;

const CHAVES = new Set<string>(CAMPOS_DA_IMPORTACAO.map((c) => c.chave));
const CABECALHO = new Map<string, string>(CAMPOS_DA_IMPORTACAO.map((c) => [c.chave, c.cabecalho]));

export function sugerirMapa(cabecalho: readonly string[]): Array<ChaveDaImportacao | null> {
  const usados = new Set<string>();
  return cabecalho.map((titulo) => {
    const campo = campoDaColuna(titulo);
    if (!campo || !CHAVES.has(campo) || usados.has(campo)) return null;
    usados.add(campo);
    return campo as ChaveDaImportacao;
  });
}

/** A rota recusa planilha sem nome do negócio nem do contato: o "Continuar" já trava antes. */
export function podeContinuar(mapa: MapaDaImportacao): boolean {
  return mapa.includes("titulo") || mapa.includes("contato");
}

/** RFC 4180, sem guarda de fórmula: aqui é dado de entrada, e a rota lê o texto como veio. */
function celulaCrua(valor: string): string {
  return /[",\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

export function csvMapeado(
  linhas: readonly string[][],
  mapa: MapaDaImportacao,
  tagsExtras: readonly string[],
): string {
  const usadas = mapa.flatMap((chave, indice) => (chave ? [{ indice, chave }] : []));
  const temTags = usadas.some((c) => c.chave === "etiquetas");
  const extras = tagsExtras.map((t) => t.trim()).filter(Boolean);
  const cabecalho = usadas.map((c) => CABECALHO.get(c.chave) ?? c.chave);
  if (!temTags && extras.length > 0) cabecalho.push("tags");
  const corpo = linhas.slice(1).map((bruta) => {
    const celulas = usadas.map(({ indice, chave }) => {
      const valor = (bruta[indice] ?? "").trim();
      return chave === "etiquetas" && extras.length > 0
        ? [valor, ...extras].filter(Boolean).join(";")
        : valor;
    });
    if (!temTags && extras.length > 0) celulas.push(extras.join(";"));
    return celulas;
  });
  return `${[cabecalho, ...corpo].map((l) => l.map(celulaCrua).join(",")).join("\r\n")}\r\n`;
}
