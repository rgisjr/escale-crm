"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useColunasDoDetalhamento } from "@/hooks/escale/useColunasDoDetalhamento";
import { pedirCsvDoDetalhamento, useDetalhamento } from "@/hooks/escale/useDetalhamento";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { baixarCsv } from "@/lib/escale/exportar/baixar";
import { ErroDeTempoEsgotado } from "@/lib/escale/fetch-com-tempo-maximo";
import {
  nomeDoCsvDoDetalhamento,
  type ColunaDoDetalhamentoNaTela,
} from "@/lib/escale/indicadores/graficos/detalhamento";
import { LINHAS_DO_DETALHAMENTO_MAX } from "@/lib/escale/indicadores/catalogo/tipos";
import {
  POR_PAGINA_DO_DETALHAMENTO,
  type Detalhamento,
  type FiltroDoPainel,
  type Ponto,
  type Pergunta,
} from "@/lib/escale/indicadores/pergunta";
import { Download, HelpCircle, X } from "@/lib/ui/icons-da-casca";

import { EditarColunasDoDetalhamento } from "./EditarColunasDoDetalhamento";
import { TabelaDoDetalhamento, type OrdemDoDetalhamento } from "./TabelaDoDetalhamento";

export type AlvoDoDetalhamento = {
  graficoId: string;
  nomeDoGrafico: string;
  indicadorId: string;
  nomeDoIndicador: string;
  descricaoDoIndicador: string;
  /** O valor já formatado do ponto clicado (ou o total, sem clique). */
  valor: string;
  pergunta: Pergunta;
  filtroDoPainel: FiltroDoPainel;
  ponto: Ponto;
  colunas: readonly ColunaDoDetalhamentoNaTela[];
};

const dataParaNome = (): string => {
  const h = new Date();
  const d = (n: number) => String(n).padStart(2, "0");
  return `${d(h.getDate())}-${d(h.getMonth() + 1)}-${h.getFullYear()}`;
};

/**
 * A JANELA DE DETALHAMENTO (print 10-022): o nome do indicador, o bloco do valor com "Exportar .CSV",
 * "Editar colunas (N)", o total de itens, a tabela com ordenação e a paginação de 10/25/50.
 */
export function JanelaDeDetalhamento({ alvo, aoFechar }: { alvo: AlvoDoDetalhamento; aoFechar: () => void }) {
  const t = useT();
  const { escolhidas, alternar } = useColunasDoDetalhamento(alvo.graficoId, alvo.colunas);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<(typeof POR_PAGINA_DO_DETALHAMENTO)[number]>(10);
  const [ordem, setOrdem] = useState<OrdemDoDetalhamento>(null);
  const [exportando, setExportando] = useState(false);

  const base = useMemo(
    () => ({
      pergunta: alvo.pergunta,
      filtroDoPainel: alvo.filtroDoPainel,
      indicador: alvo.indicadorId,
      ponto: alvo.ponto,
      colunas: escolhidas,
      ...(ordem ? { ordem } : {}),
    }),
    [alvo, escolhidas, ordem],
  );
  const pedido = useMemo(() => ({ ...base, pagina, porPagina }) as Detalhamento, [base, pagina, porPagina]);
  const consulta = useDetalhamento({ graficoId: alvo.graficoId, pedido, ligado: true });
  const resposta = consulta.data;
  const semDetalhamento = consulta.error instanceof ApiError && consulta.error.status === 422;

  function ordenar(coluna: string) {
    setPagina(1);
    setOrdem((o) => (o?.coluna === coluna ? (o.direcao === "asc" ? { coluna, direcao: "desc" } : null) : { coluna, direcao: "asc" }));
  }

  async function exportar() {
    setExportando(true);
    try {
      const { texto, truncado } = await pedirCsvDoDetalhamento(base as never);
      baixarCsv(nomeDoCsvDoDetalhamento(alvo.nomeDoGrafico, alvo.nomeDoIndicador, dataParaNome()), texto);
      toast.success(truncado ? t("Exportados os primeiros 20.000 registros.") : t("Exportação concluída com sucesso!"));
    } catch (e) {
      toast.error(e instanceof ErroDeTempoEsgotado ? t(e.message) : t("Erro ao exportar dados"));
    } finally {
      setExportando(false);
    }
  }

  const total = resposta?.total ?? 0;
  const textoDoTotal = resposta?.teto
    ? t("{total} itens").replace("{total}", `${LINHAS_DO_DETALHAMENTO_MAX.toLocaleString("pt-BR")}+`)
    : t("{total} itens").replace("{total}", total.toLocaleString("pt-BR"));

  let corpo;
  if (semDetalhamento) {
    corpo = <p className="grid flex-1 place-items-center text-[13px] text-casca-suave">{t("Essa métrica ainda não suporta detalhamento.")}</p>;
  } else if (consulta.isError) {
    corpo = (
      <div className="grid flex-1 place-items-center text-center text-[13px] text-casca-suave">
        <div>
          <p>{t("Erro ao carregar detalhes")}</p>
          <button type="button" onClick={() => void consulta.refetch()} className="mt-2 h-8 rounded-[6px] border border-casca-borda px-3 text-casca-texto">
            {t("Tentar de novo")}
          </button>
        </div>
      </div>
    );
  } else if (resposta && resposta.linhas.length === 0) {
    corpo = <p className="grid flex-1 place-items-center text-[13px] text-casca-suave">{t("Nenhum registro encontrado para esse detalhamento.")}</p>;
  } else {
    corpo = (
      <TabelaDoDetalhamento
        colunas={resposta?.colunas ?? []}
        linhas={resposta?.linhas ?? []}
        fuso={resposta?.fuso ?? "America/Sao_Paulo"}
        ordem={ordem}
        aoOrdenar={ordenar}
        carregando={!resposta}
      />
    );
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(a) => !a && aoFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/48" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[50%] left-[50%] z-50 flex h-[calc(100vh-80px)] w-[calc(100vw-130px)] max-w-[1390px] translate-x-[-50%] translate-y-[-50%] flex-col rounded-[8px] bg-surface px-6 text-casca-texto shadow-casca-painel"
        >
          <div className="flex h-14 shrink-0 items-center justify-between">
            <DialogTitle className="text-base font-medium">{alvo.nomeDoIndicador}</DialogTitle>
            <DialogPrimitive.Close aria-label={t("Fechar")} className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto">
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-3 flex h-20 shrink-0 items-center justify-between rounded-[8px] bg-casca-raia px-5 py-4">
            <div>
              <p className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.06em] text-casca-suave uppercase">
                {alvo.nomeDoIndicador}
                <DicaAoPassar texto={alvo.descricaoDoIndicador || alvo.nomeDoIndicador}>
                  <HelpCircle size={12} aria-hidden />
                </DicaAoPassar>
              </p>
              <p className="text-[20px] font-semibold text-casca-texto">{alvo.valor}</p>
            </div>
            <button
              type="button"
              onClick={() => void exportar()}
              disabled={exportando}
              className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-casca-borda bg-surface px-3 text-[13px] font-medium disabled:opacity-60"
            >
              <Download size={14} aria-hidden />
              {t("Exportar .CSV")}
            </button>
          </div>
          <div className="mt-4 flex shrink-0 items-center justify-between">
            <EditarColunasDoDetalhamento colunas={alvo.colunas} escolhidas={escolhidas} aoAlternar={alternar} />
            <span className="text-[13px] text-casca-texto">{resposta ? textoDoTotal : ""}</span>
          </div>
          <div className="mt-3 flex min-h-0 flex-1 flex-col">{corpo}</div>
          <div className="shrink-0 border-t border-casca-divisoria py-3">
            <PaginacaoDaCasca
              pagina={pagina}
              total={total}
              porPagina={porPagina}
              opcoesPorPagina={POR_PAGINA_DO_DETALHAMENTO}
              aoMudarPagina={setPagina}
              aoMudarPorPagina={(n) => {
                setPorPagina(n as (typeof POR_PAGINA_DO_DETALHAMENTO)[number]);
                setPagina(1);
              }}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
