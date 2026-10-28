"use client";
import { useT } from "@/hooks/i18n/useT";
import { textoDaCelula } from "@/lib/escale/indicadores/graficos/detalhamento";
import type { ColunaDaPagina } from "@/lib/escale/indicadores/motor/detalhamento";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "@/lib/ui/icons-da-casca";

export type OrdemDoDetalhamento = { coluna: string; direcao: "asc" | "desc" } | null;
const NUMERICOS = new Set(["valor", "numero", "duracao"]);

/** A tabela do detalhamento (print 10-022): cabeçalho em maiúsculas que ordena, linhas de 36 px, rolagem horizontal. */
export function TabelaDoDetalhamento({
  colunas,
  linhas,
  fuso,
  ordem,
  aoOrdenar,
  carregando,
}: {
  colunas: readonly ColunaDaPagina[];
  linhas: readonly Record<string, unknown>[];
  fuso: string;
  ordem: OrdemDoDetalhamento;
  aoOrdenar: (coluna: string) => void;
  carregando: boolean;
}) {
  const t = useT();
  return (
    <div className="min-h-0 flex-1 overflow-auto" aria-busy={carregando}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {colunas.map((c) => {
              const ativa = ordem?.coluna === c.chave;
              const Seta = !ativa ? ChevronsUpDown : ordem?.direcao === "asc" ? ChevronUp : ChevronDown;
              return (
                <th
                  key={c.chave}
                  className={`min-w-[140px] px-2 pb-2 text-[10px] font-semibold tracking-[0.06em] whitespace-nowrap text-casca-suave uppercase ${
                    c.formato && NUMERICOS.has(c.formato) ? "text-right" : ""
                  }`}
                >
                  <button type="button" onClick={() => aoOrdenar(c.chave)} className="inline-flex items-center gap-1 uppercase">
                    {c.nome}
                    <Seta size={12} aria-hidden />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {carregando
            ? Array.from({ length: 10 }, (_, i) => (
                <tr key={i} className="h-9 border-b border-casca-divisoria">
                  <td colSpan={colunas.length} className="px-2">
                    <div className="h-3 animate-pulse rounded bg-casca-raia" />
                  </td>
                </tr>
              ))
            : linhas.map((linha, i) => (
                <tr key={i} className="h-9 border-b border-casca-divisoria text-[13px] text-casca-texto">
                  {colunas.map((c) => (
                    <td
                      key={c.chave}
                      className={`px-2 whitespace-nowrap ${c.formato && NUMERICOS.has(c.formato) ? "text-right" : ""}`}
                    >
                      {textoDaCelula(linha[c.chave], c.formato, fuso, t)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
