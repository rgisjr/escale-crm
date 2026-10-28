/** O CSV de um gráfico (R8, Fase 7C): do resultado agregado, no formato brasileiro. */
import { celula } from "@/lib/escale/exportar/csv-do-quadro";

import type { Resultado } from "../motor/executar";
import { linhasDaTabela } from "./dados";

/** `2026-10-03T14:30:00` → `03/10/2026` (e ` 14:30` quando há hora). */
function dataDoMotor(iso: string): string {
  const [ano = "", mes = "", dia = ""] = iso.slice(0, 10).split("-");
  const hora = iso.slice(11, 16);
  return `${dia}/${mes}/${ano}${hora && hora !== "00:00" ? ` ${hora}` : ""}`;
}

export function csvDoResultado(r: Resultado, assunto?: string): string {
  const { colunas, linhas } = linhasDaTabela(r, assunto);
  const cabecalho = colunas.map((c) => c.nome);
  const corpo = linhas.map((linha) =>
    colunas.map((c) => {
      const valor = linha[c.chave];
      return c.tipo === "tempo" && typeof valor === "string" ? dataDoMotor(valor) : valor;
    }),
  );
  return `${[cabecalho, ...corpo].map((l) => l.map(celula).join(",")).join("\r\n")}\r\n`;
}

/** `{nome} - dd-mm-aaaa.csv`, sem `/ \ : * ? " < > |`; data local de quem exporta. */
export function nomeDoCsv(nome: string, hoje: Date): string {
  const limpo = nome.replace(/[/\\:*?"<>|]/g, "").trim() || "grafico";
  const dd = String(hoje.getDate()).padStart(2, "0");
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  return `${limpo} - ${dd}-${mm}-${hoje.getFullYear()}.csv`;
}
