"use client";
import { BOTAO_DA_BARRA_DE_LOTE } from "@/components/escale/contatos/massa/BarraDeLote";
import { PainelDeTag } from "@/components/escale/contatos/massa/PainelDeTag";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";

/**
 * A BARRA DA SELEÇÃO NOS DETALHES (material 2.3, `campaign-details-bulk-bar`;
 * sem print, no molde da barra da lista de contatos, 2b-29/30): o número,
 * SELECIONADOS, "Adicionar tag" (o painel da 2B), "Criar negócio", "Criar
 * campanha", "Excluir selecionados" (só antes do envio) e "Limpar seleção".
 */
export function BarraDaSelecaoDaCampanha({
  quantidade,
  podeTirar,
  ocupado,
  aoAplicarTag,
  aoCriarNegocio,
  aoCriarCampanha,
  aoExcluir,
  aoLimpar,
}: {
  quantidade: number;
  podeTirar: boolean;
  ocupado: boolean;
  aoAplicarTag: (acao: "incluir_tag" | "remover_tag", tag: string) => Promise<boolean>;
  aoCriarNegocio: () => void;
  aoCriarCampanha: () => void;
  aoExcluir: () => void;
  aoLimpar: () => void;
}) {
  const t = useT();
  return (
    <div
      role="toolbar"
      aria-label={t("Ações em massa")}
      className="fixed bottom-20 left-1/2 z-50 flex h-[52px] -translate-x-1/2 items-center gap-1 rounded-[8px] bg-casca-marca px-4 text-white shadow-casca-painel"
    >
      <span className="text-[13px] font-semibold">{numeroBr(quantidade)}</span>
      <span className="mr-2 ml-3 text-[11px] font-medium uppercase">{t("selecionados")}</span>
      <span aria-hidden className="mx-1 h-full w-px bg-surface opacity-40" />
      <PainelDeTag classeDoGatilho={BOTAO_DA_BARRA_DE_LOTE} aoAplicar={aoAplicarTag} />
      <button
        type="button"
        disabled={ocupado}
        onClick={aoCriarNegocio}
        className={BOTAO_DA_BARRA_DE_LOTE}
      >
        {t("Criar negócio")}
      </button>
      <button
        type="button"
        disabled={ocupado}
        onClick={aoCriarCampanha}
        className={BOTAO_DA_BARRA_DE_LOTE}
      >
        {t("Criar campanha")}
      </button>
      {podeTirar ? (
        <button
          type="button"
          disabled={ocupado}
          onClick={aoExcluir}
          className={BOTAO_DA_BARRA_DE_LOTE}
        >
          {t("Excluir selecionados")}
        </button>
      ) : null}
      <button type="button" onClick={aoLimpar} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Limpar seleção")}
      </button>
    </div>
  );
}
