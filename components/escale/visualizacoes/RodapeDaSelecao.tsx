"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { VISUALIZACAO_MAX_ORIGENS } from "@/lib/escale/visualizacoes/regras";
import { Bookmark, Save } from "@/lib/ui/icons-da-casca";

/**
 * O RODAPÉ DO MODO SELEÇÃO (fork Escale, Fase 1C; visual da Clint na casca V3).
 *
 * É o de 01-026, a única evidência; ela é da variante lateral:
 * - à esquerda, o marcador e "N origens selecionadas · Rascunho", 600 na cor da marca;
 * - à direita, "Cancelar" de texto e o botão da marca com o disquete.
 *
 * No painel de 250px os dois botões ficam numa linha abaixo do texto. Salvar
 * fica desligado fora da faixa de 1 a 20 origens, a mesma da rota e da função
 * do banco.
 */
export function RodapeDaSelecao({
  quantas,
  editando,
  salvando,
  erro,
  onCancelar,
  onSalvar,
}: {
  quantas: number;
  editando: boolean;
  salvando: boolean;
  erro: string | null;
  onCancelar: () => void;
  onSalvar: () => void;
}) {
  const t = useT();
  const foraDaFaixa = quantas === 0 || quantas > VISUALIZACAO_MAX_ORIGENS;
  return (
    <div className="shrink-0 border-t border-casca-borda bg-surface px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-casca-marca" aria-live="polite">
        <Bookmark size={14} aria-hidden className="shrink-0" />
        {(quantas === 1 ? t("{n} origem selecionada · Rascunho") : t("{n} origens selecionadas · Rascunho")).replace(
          "{n}",
          String(quantas),
        )}
      </p>
      {quantas > VISUALIZACAO_MAX_ORIGENS && (
        <p className="mt-1 text-[11px] text-casca-alerta">{t("Uma visualização junta de 1 a 20 origens.")}</p>
      )}
      {erro && (
        <p role="alert" className="mt-1 text-[11px] text-casca-alerta">
          {erro}
        </p>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        <BotaoDaCasca type="button" variante="texto" tamanho="sm" disabled={salvando} onClick={onCancelar}>
          {t("Cancelar")}
        </BotaoDaCasca>
        <BotaoDaCasca type="button" variante="marca" tamanho="sm" disabled={foraDaFaixa || salvando} onClick={onSalvar}>
          <Save size={14} aria-hidden />
          {editando ? t("Salvar origens") : t("Salvar como visualização")}
        </BotaoDaCasca>
      </div>
    </div>
  );
}
