"use client";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { VISUALIZACAO_MAX_ORIGENS } from "@/lib/escale/visualizacoes/regras";

/**
 * O RODAPÉ DO MODO SELEÇÃO (fork Escale, Fase 1C), como o da Clint: "N origens
 * selecionadas · Rascunho", Cancelar e Salvar. Salvar fica desligado fora da
 * faixa de 1 a 20 origens — a mesma da rota e da função do banco.
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
    <div className="border-t px-3 py-2">
      <p className="text-xs font-medium text-accent" aria-live="polite">
        {(quantas === 1 ? t("{n} origem selecionada · Rascunho") : t("{n} origens selecionadas · Rascunho")).replace(
          "{n}",
          String(quantas),
        )}
      </p>
      {quantas > VISUALIZACAO_MAX_ORIGENS && (
        <p className="mt-1 text-xs text-destructive">{t("Uma visualização junta de 1 a 20 origens.")}</p>
      )}
      {erro && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {erro}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>
          {t("Cancelar")}
        </Button>
        <Button type="button" size="sm" disabled={foraDaFaixa || salvando} onClick={onSalvar}>
          {editando ? t("Salvar origens") : t("Salvar como visualização")}
        </Button>
      </div>
    </div>
  );
}
