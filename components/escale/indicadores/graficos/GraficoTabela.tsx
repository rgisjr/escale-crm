"use client";
import { useMemo, useState } from "react";

import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { linhasDaTabela } from "@/lib/escale/indicadores/graficos/dados";
import type { Clique } from "@/lib/escale/indicadores/graficos/detalhamento";
import { formatarValor, rotuloDoTempo } from "@/lib/escale/indicadores/graficos/formatos";
import { POR_PAGINA_DA_TABELA } from "@/lib/escale/indicadores/graficos/tipos";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";
import { medidaPorId } from "@/lib/escale/indicadores/catalogo";
import { ArrowUpDown, CircleCheck, CircleX } from "@/lib/ui/icons-da-casca";

type Ordem = { chave: string; direcao: "asc" | "desc" } | null;

/** Tabela (print 10-034): ordena só no navegador, pagina de 50 e, com `totais`, soma contagem e valor. */
export function GraficoTabela({
  resultado,
  pergunta,
  opcoes,
}: {
  resultado: Resultado;
  pergunta: Pergunta;
  opcoes: OpcoesDoGrafico;
  aoClicarNoPonto?: (clique: Clique) => void;
}) {
  const t = useT();
  const assunto = medidaPorId(pergunta.indicadores[0] ?? "")?.assunto.nome;
  const { colunas, linhas } = useMemo(() => linhasDaTabela(resultado, assunto, opcoes), [resultado, assunto, opcoes]);
  const [ordem, setOrdem] = useState<Ordem>(null);
  const [pagina, setPagina] = useState(1);

  const ordenadas = useMemo(() => {
    if (!ordem) return linhas;
    const fator = ordem.direcao === "asc" ? 1 : -1;
    return [...linhas].sort((a, b) => {
      const x = a[ordem.chave];
      const y = b[ordem.chave];
      if (typeof x === "number" && typeof y === "number") return (x - y) * fator;
      return String(x ?? "").localeCompare(String(y ?? ""), "pt-BR") * fator;
    });
  }, [linhas, ordem]);
  const visiveis = ordenadas.slice((pagina - 1) * POR_PAGINA_DA_TABELA, pagina * POR_PAGINA_DA_TABELA);

  const alternar = (chave: string) =>
    setOrdem((o) => (o?.chave === chave ? (o.direcao === "asc" ? { chave, direcao: "desc" } : null) : { chave, direcao: "asc" }));

  const celula = (valor: unknown, c: (typeof colunas)[number]) => {
    if (c.tipo === "meta") {
      const meta = valor as { valor: number; atingiu: boolean } | undefined;
      if (!meta) return "—";
      return (
        <span className="inline-flex items-center justify-end gap-1.5">
          {formatarValor(meta.valor, c.unidade ?? "contagem")}
          {meta.atingiu ? <CircleCheck size={14} aria-label={t("Meta atingida")} style={{ color: "#22C55E" }} /> : <CircleX size={14} aria-label={t("Meta não atingida")} className="text-casca-alerta" />}
        </span>
      );
    }
    if (c.tipo === "indicador") return valor === null || valor === undefined ? "—" : formatarValor(Number(valor), c.unidade ?? "contagem");
    if (c.tipo === "tempo") return rotuloDoTempo(String(valor ?? ""), pergunta.tempo?.granularidade, false);
    return String(valor ?? "");
  };
  const total = (chave: string, unidade: string | undefined) =>
    unidade === "contagem" || unidade === "valor"
      ? formatarValor(linhas.reduce((n, l) => n + Number(l[chave] ?? 0), 0), unidade)
      : "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {colunas.map((c) => (
                <th key={c.chave} className={`px-2 pb-1 text-[11px] font-semibold text-casca-suave uppercase ${c.tipo === "indicador" || c.tipo === "meta" ? "text-right" : ""}`}>
                  <button type="button" onClick={() => alternar(c.chave)} className="inline-flex items-center gap-1 uppercase">
                    {c.nome}
                    <ArrowUpDown size={12} aria-hidden />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((linha, i) => (
              <tr key={i} className="h-9 border-b border-casca-divisoria text-[13px] text-casca-texto">
                {colunas.map((c) => (
                  <td key={c.chave} className={`px-2 ${c.tipo === "indicador" || c.tipo === "meta" ? "text-right" : ""}`}>
                    {celula(linha[c.chave], c)}
                  </td>
                ))}
              </tr>
            ))}
            {opcoes.tabela.totais ? (
              <tr className="h-9 text-[13px] font-semibold text-casca-texto">
                {colunas.map((c, i) => (
                  <td key={c.chave} className={`px-2 ${c.tipo === "indicador" ? "text-right" : ""}`}>
                    {i === 0 ? t("Total") : c.tipo === "indicador" ? total(c.chave, c.unidade) : ""}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {linhas.length > POR_PAGINA_DA_TABELA ? (
        <PaginacaoDaCasca
          pagina={pagina}
          total={linhas.length}
          porPagina={POR_PAGINA_DA_TABELA}
          opcoesPorPagina={[POR_PAGINA_DA_TABELA]}
          aoMudarPagina={setPagina}
          aoMudarPorPagina={() => setPagina(1)}
        />
      ) : null}
    </div>
  );
}
