"use client";
import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { useT } from "@/hooks/i18n/useT";
import { seloDoPrazo, textoDoPrazo, type AtividadeDoPlaybook } from "@/lib/escale/playbook/regras";
import { ArrowDown, ArrowUp, EyeOff, Trash2 } from "@/lib/ui/icons-da-casca";

/**
 * A LINHA DA ATIVIDADE NA COLUNA DA ETAPA (fork Escale, Fase 1I; print 030):
 * o número e a letra da unidade (o `DurationBadge` da Clint: "1 D" = 1 dia), o
 * ícone do tipo, o título truncado e o olho cortado da não listada. No hover,
 * ↑↓ (só entre vizinhas de mesmo prazo) e a lixeira, sem confirmação (Clint).
 */
export function ItemDoPlaybook({
  atividade,
  podeSubir,
  podeDescer,
  aoAbrir,
  aoSubir,
  aoDescer,
  aoRemover,
}: {
  atividade: AtividadeDoPlaybook;
  podeSubir: boolean;
  podeDescer: boolean;
  aoAbrir: () => void;
  aoSubir: () => void;
  aoDescer: () => void;
  aoRemover: () => void;
}) {
  const t = useT();
  const selo = seloDoPrazo(atividade.prazoMinutos);
  const acao =
    "grid size-5 place-items-center rounded-[4px] text-casca-suave hover:bg-casca-raia hover:text-casca-texto";
  return (
    <li className="group flex h-[30px] items-center gap-2 px-3">
      <span className="min-w-3 text-[11px] text-casca-marca">{selo.numero}</span>
      <DicaEscura texto={`${textoDoPrazo(atividade.prazoMinutos, t)} ${t("após entrar na etapa")}`}>
        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-casca-marca-suave text-[9px] font-bold text-casca-marca">
          {selo.inicial}
        </span>
      </DicaEscura>
      <IconeDoTipo tipo={atividade.tipo} tamanho={12} className="shrink-0 text-casca-marca" />
      <button
        type="button"
        onClick={aoAbrir}
        className="min-w-0 flex-1 truncate text-left text-[12px] text-casca-texto hover:underline"
      >
        {atividade.titulo}
      </button>
      {atividade.visibilidade === "nao_listada" ? (
        <DicaEscura texto={t("Essa atividade não será listada na visão de atividades")}>
          <span
            role="img"
            aria-label={t("Atividade não listada")}
            className="shrink-0 text-(--escale-nao-listada)"
          >
            <EyeOff size={12} aria-hidden />
          </span>
        </DicaEscura>
      ) : null}
      <span className="hidden shrink-0 items-center gap-0.5 group-focus-within:flex group-hover:flex">
        {podeSubir ? (
          <button
            type="button"
            aria-label={t("Subir")}
            title={t("Subir")}
            onClick={aoSubir}
            className={acao}
          >
            <ArrowUp size={12} aria-hidden />
          </button>
        ) : null}
        {podeDescer ? (
          <button
            type="button"
            aria-label={t("Descer")}
            title={t("Descer")}
            onClick={aoDescer}
            className={acao}
          >
            <ArrowDown size={12} aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={t("Remover atividade")}
          title={t("Remover atividade")}
          onClick={aoRemover}
          className={acao}
        >
          <Trash2 size={12} aria-hidden />
        </button>
      </span>
    </li>
  );
}
