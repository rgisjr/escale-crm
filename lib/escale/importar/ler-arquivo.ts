import { CSV_MAX_BYTES, CSV_MAX_DATA_ROWS, decodificarCsv, parseCsv } from "@/lib/contacts/csv";

export type LeituraDoArquivo = { linhas: string[][] } | { erro: string };

/**
 * LÊ O ARQUIVO QUE A PESSOA ESCOLHEU NO PASSO 1 (fork Escale, Fase 1E). As
 * mesmas travas da rota (`CSV_MAX_BYTES`, `CSV_MAX_DATA_ROWS`), aplicadas antes
 * de a pessoa gastar três passos num arquivo que seria recusado no fim. A
 * decodificação é a do original (`decodificarCsv`), que lê o Latin-1 do Excel.
 * As frases dos limites dizem "5 MB" e "500 linhas" por extenso: se as
 * constantes mudarem, elas mudam juntas.
 */
export async function lerArquivoCsv(
  arquivo: File,
  t: (texto: string) => string,
): Promise<LeituraDoArquivo> {
  if (!/\.csv$/i.test(arquivo.name)) return { erro: t("Apenas arquivos CSV são aceitos.") };
  if (arquivo.size > CSV_MAX_BYTES)
    return { erro: t("O arquivo CSV excede o limite máximo de 5 MB.") };
  let bytes: ArrayBuffer;
  try {
    bytes = await arquivo.arrayBuffer();
  } catch {
    return { erro: t("Não consegui ler essa planilha.") };
  }
  const lido = decodificarCsv(bytes);
  if ("erro" in lido) return { erro: lido.erro };
  const linhas = parseCsv(lido.texto).filter((linha) =>
    linha.some((celula) => celula.trim() !== ""),
  );
  if (linhas.length === 0) return { erro: t("A planilha está vazia.") };
  if (linhas.length - 1 > CSV_MAX_DATA_ROWS) {
    return { erro: t("A planilha passa de 500 linhas. Divida em arquivos menores.") };
  }
  return { linhas };
}
