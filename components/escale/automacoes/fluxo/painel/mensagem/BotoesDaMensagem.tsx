"use client";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  AVISO_DA_LISTA,
  MAXIMO_DE_BOTOES,
  MAXIMO_DE_BOTOES_SEM_LISTA,
  RECUSA_BOTAO_GRANDE,
  TAMANHO_DO_BOTAO,
  type BotaoDoItem,
} from "@/lib/escale/automacoes/fluxo/sequencia";
import { Plus, Trash2 } from "@/lib/ui/icons-da-casca";

/**
 * OS BOTÕES DE UM TEXTO (07-027): cartões brancos empilhados, o link tracejado "+ Adicionar botão" (até 10) e, acima
 * de 3, o aviso em cinza de que a mensagem vai como lista. Cada botão vira uma saída própria no canvas.
 */
export function BotoesDaMensagem({
  botoes,
  novoId,
  aoMudar,
}: {
  botoes: readonly BotaoDoItem[];
  novoId: () => string;
  aoMudar: (botoes: BotaoDoItem[]) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2" data-testid="botoes-da-mensagem">
      {botoes.map((b, i) => (
        <div key={b.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2 rounded-lg border border-casca-divisoria bg-surface p-2">
            <CampoDeTexto
              value={b.titulo}
              aria-label={`${t("Botão")} ${i + 1}`}
              placeholder={t("Texto do botão")}
              onChange={(e) => aoMudar(botoes.map((x) => (x.id === b.id ? { ...x, titulo: e.target.value } : x)))}
              className="h-8"
            />
            <button
              type="button"
              aria-label={`${t("Remover botão")} ${i + 1}`}
              onClick={() => aoMudar(botoes.filter((x) => x.id !== b.id))}
              className="grid size-7 shrink-0 place-items-center rounded-md text-casca-suave hover:text-casca-alerta"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
          {b.titulo.length > TAMANHO_DO_BOTAO ? (
            <p role="alert" className="text-[12px] text-casca-alerta">
              {t(RECUSA_BOTAO_GRANDE)}
            </p>
          ) : null}
        </div>
      ))}
      {botoes.length > MAXIMO_DE_BOTOES_SEM_LISTA ? <p className="text-[12px] text-casca-suave">{t(AVISO_DA_LISTA)}</p> : null}
      <button
        type="button"
        disabled={botoes.length >= MAXIMO_DE_BOTOES}
        onClick={() => aoMudar([...botoes, { id: novoId(), titulo: "" }])}
        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-casca-divisoria text-[13px] font-medium text-casca-marca-forte hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={14} aria-hidden />
        {t("Adicionar botão")}
      </button>
    </div>
  );
}
