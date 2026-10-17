"use client";
import type { ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { partesDaContagem } from "@/lib/escale/quadro/aparencia";
import { MessageSquare, RefreshCw, Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A LINHA DE CONTAGEM E AÇÕES (fork Escale, Casca V4; 01-010 e o recorte
 * `docs/escale/clint/crops/icons-right.png`): "N oportunidades de **Negócio**"
 * (número real e plural, D14) à esquerda; ordenar, atualizar, exportar, engrenagem
 * e ajuda à direita. Exportar (Fase 1E) só para gerente ou acima no funil; a
 * engrenagem abre as configurações da origem (Fase 1F, print 15); a ajuda segue desligada (D6).
 */
export function LinhaDeContagem({
  contagem,
  ordemAtiva,
  onAtualizar,
  atualizando = false,
  ordenar,
  personalizar,
  exportar,
  configurar,
  dicaDaEngrenagem,
}: {
  contagem: number;
  ordemAtiva: boolean;
  onAtualizar: () => void;
  atualizando?: boolean;
  /** FORK ESCALE · Fase 1E (E15): o botão "↑↓ Ordenar", logo antes do atualizar. */
  ordenar?: ReactNode;
  /** FORK ESCALE · Fase 1E: o ícone "Personalizar cards" (Clint v2), logo depois do atualizar. */
  personalizar?: ReactNode;
  /** Fase 1E: o `ExportarCards`; ausente = sem ícone (Visualização, abaixo de gerente). */
  exportar?: ReactNode;
  /** Fase 1F (F20): abre as configurações da origem. Ausente = engrenagem desligada. */
  configurar?: () => void;
  /** Fase 1F: a dica da engrenagem desligada ("Sem permissão"); ausente = "Em breve". */
  dicaDaEngrenagem?: string;
}) {
  const t = useT();
  const { antes, depois } = partesDaContagem(
    contagem === 1 ? t("{n} oportunidade de {negocio}") : t("{n} oportunidades de {negocio}"),
    contagem,
  );
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-casca-texto" aria-live="polite" data-testid="contagem-do-quadro">
          {antes}
          <span className="font-semibold">{t("Negócio")}</span>
          {depois}
        </p>
        {ordemAtiva ? (
          <p className="text-[11px] text-casca-suave">
            {t(
              "Ordenação ativa · arrastar para reordenar dentro da coluna está desabilitado. Mover de etapa continua funcionando.",
            )}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {ordenar}
        <BotaoDaCasca
          type="button"
          variante="icone"
          onClick={onAtualizar}
          disabled={atualizando}
          aria-label={t("Atualizar")}
          title={t("Atualizar")}
        >
          <RefreshCw size={17} aria-hidden className={cn(atualizando && "animate-spin")} />
        </BotaoDaCasca>
        {personalizar}
        {exportar}
        {/* Fase 1F (F20): a engrenagem abre as configurações da origem, como na Clint (print 15 da 1E). */}
        <BotaoDaCasca
          type="button"
          variante="icone"
          disabled={!configurar}
          onClick={configurar}
          aria-label={t("Configurações da origem")}
          title={configurar ? t("Configurações da origem") : (dicaDaEngrenagem ?? t("Em breve"))}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Settings size={16} aria-hidden />
        </BotaoDaCasca>
        <BotaoDaCasca
          type="button"
          variante="icone"
          disabled
          aria-label={t("Ajuda")}
          title={t("Em breve")}
          className="bg-casca-marca-suave disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <IconeDeAjuda />
        </BotaoDaCasca>
      </div>
    </div>
  );
}

/** O "?" dentro de um balão quadrado da Clint (lucide não tem esse ícone pronto). */
function IconeDeAjuda() {
  return (
    <span aria-hidden className="relative grid place-items-center">
      <MessageSquare size={16} />
      <span className="absolute -mt-0.5 text-[9px] leading-none font-semibold">?</span>
    </span>
  );
}
