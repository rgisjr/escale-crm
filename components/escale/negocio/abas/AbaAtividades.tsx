"use client";
import { useMemo, useRef, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { useTasks } from "@/hooks/tasks/useTasks";
import { diasDasTarefas, horaDaTarefa } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Tarefa } from "@/lib/tarefas/tipos";
import type { Lead } from "@/lib/types/leads";
import {
  Check,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Settings,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaFicha } from "../FotoDaFicha";

/**
 * A ABA ATIVIDADES DA FICHA (fork Escale, Fase 1G, C2; print 01).
 *
 * Mostra o que existe hoje: o trilho das etapas abertas da origem e as tarefas
 * do negócio (`crm_tasks`), só leitura. Concluir, criar, a coluna "Dias" e as
 * atividades do playbook são da 1I (C19–C21): no lugar certo, com "Em breve".
 */
const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";

export function AbaAtividades({ lead, stages }: { lead: Lead; stages: Stage[] }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const { tarefas, carregando, falhou } = useTasks({ lead_id: lead.id });
  const dias = useMemo(() => diasDasTarefas(tarefas, idioma), [tarefas, idioma]);
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null);
  const escolhida = tarefas.find((x) => x.id === escolhidaId) ?? dias[0]?.tarefas[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TrilhoDeEtapas lead={lead} stages={stages} />
      <div className="flex min-h-0 flex-1">
        <section
          aria-label={t("Próximas atividades")}
          className="flex w-[450px] shrink-0 flex-col border-r border-casca-borda"
        >
          <header className="flex h-10 shrink-0 items-center justify-between border-b border-casca-borda px-4">
            <h2 className="text-[15px] font-semibold text-casca-texto">
              {t("Próximas atividades")}
            </h2>
            <BotaoDaCasca
              variante="icone"
              disabled
              title={t("Em breve")}
              aria-label={t("Configurar atividades")}
              className={EM_BREVE}
            >
              <Settings aria-hidden />
            </BotaoDaCasca>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {carregando ? (
              <p className="px-4 py-6 text-xs text-casca-suave">{t("Carregando…")}</p>
            ) : falhou ? (
              <p className="px-4 py-6 text-xs text-casca-suave">
                {t("Não consegui carregar as atividades.")}
              </p>
            ) : dias.length === 0 ? (
              <p className="px-4 py-6 text-xs text-casca-suave">
                {t("Nenhuma atividade neste negócio.")}
              </p>
            ) : (
              dias.map((dia) => (
                <div key={dia.chave}>
                  <div className="flex items-center gap-2.5 px-4 pt-2 pb-1">
                    <span className="text-[11.5px] font-semibold text-casca-texto">
                      {dia.rotulo ?? t("Sem prazo")}
                    </span>
                    <span className="rounded-[5px] bg-casca-contador px-[7px] py-0.5 text-[9px] font-semibold text-casca-suave">
                      {dia.tarefas.length === 1
                        ? t("1 atividade")
                        : `${dia.tarefas.length} ${t("atividades")}`}
                    </span>
                  </div>
                  <ul>
                    {dia.tarefas.map((x) => (
                      <LinhaDaAtividade
                        key={x.id}
                        tarefa={x}
                        ativa={x.id === escolhida?.id}
                        aoEscolher={() => setEscolhidaId(x.id)}
                        idioma={idioma}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          <footer className="flex h-12 shrink-0 items-center border-t border-casca-borda px-4">
            <BotaoDaCasca
              variante="texto"
              tamanho="sm"
              disabled
              title={t("Em breve")}
              className={EM_BREVE}
            >
              <Plus aria-hidden />
              {t("Nova atividade")}
            </BotaoDaCasca>
          </footer>
        </section>
        <section aria-label={t("Detalhes da atividade")} className="flex min-w-0 flex-1 flex-col">
          {escolhida ? (
            <>
              <header className="flex h-10 shrink-0 items-center border-b border-casca-borda px-4">
                <h3 className="flex items-center gap-2 text-[13px] text-casca-texto">
                  <ClipboardList size={16} aria-hidden className="text-casca-marca" />
                  {escolhida.title}
                </h3>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 text-[13px] whitespace-pre-line text-casca-texto-2">
                {escolhida.description ?? ""}
              </div>
              <footer className="flex h-12 shrink-0 items-center border-t border-casca-borda px-4">
                <BotaoDaCasca
                  variante="icone"
                  disabled
                  title={t("Em breve")}
                  aria-label={t("Editar atividade")}
                  className={EM_BREVE}
                >
                  <Pencil aria-hidden />
                </BotaoDaCasca>
              </footer>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function TrilhoDeEtapas({ lead, stages }: { lead: Lead; stages: Stage[] }) {
  const t = useT();
  const trilho = useRef<HTMLOListElement>(null);
  const etapas = stages
    .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
    .sort((a, b) => a.position - b.position);
  return (
    <div className="relative flex h-[98px] shrink-0 border-b border-casca-borda">
      <ol
        ref={trilho}
        aria-label={t("Etapas da origem")}
        className="flex min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto px-6 pt-3"
      >
        {etapas.map((s, i) => {
          const atual = s.id === lead.stage_id;
          return (
            <li
              key={s.id}
              aria-current={atual ? "step" : undefined}
              className="relative flex w-[154px] shrink-0 flex-col items-center gap-2"
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute top-3 right-1/2 h-px w-full bg-casca-marca-media"
                />
              )}
              <span
                className={cn(
                  "relative z-[1] grid size-6 place-items-center rounded-full border text-[11px] font-semibold",
                  atual
                    ? "border-casca-marca bg-casca-marca text-white"
                    : "border-casca-marca-media bg-surface text-casca-marca",
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "max-w-full truncate px-1 text-xs",
                  atual ? "font-semibold text-casca-marca" : "text-casca-texto-2",
                )}
              >
                {s.name}
              </span>
              {atual && <FotoDaFicha lead={lead} tamanho="trilho" />}
            </li>
          );
        })}
      </ol>
      <BotaoDaCasca
        variante="icone"
        aria-label={t("Mais etapas")}
        title={t("Mais etapas")}
        onClick={() => trilho.current?.scrollBy({ left: 400, behavior: "smooth" })}
        className="absolute top-3 right-4 border border-casca-borda bg-surface shadow-casca-painel"
      >
        <ChevronRight aria-hidden />
      </BotaoDaCasca>
    </div>
  );
}

function LinhaDaAtividade({
  tarefa,
  ativa,
  aoEscolher,
  idioma,
}: {
  tarefa: Tarefa;
  ativa: boolean;
  aoEscolher: () => void;
  idioma: string;
}) {
  const t = useT();
  const feita = tarefa.status === "done";
  return (
    <li
      className={cn(
        "flex items-center gap-3 border-l-[3px] pr-4",
        ativa ? "border-casca-marca bg-casca-raia" : "border-transparent hover:bg-casca-raia",
      )}
    >
      <button
        type="button"
        onClick={aoEscolher}
        aria-pressed={ativa}
        className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left"
      >
        <ClipboardList size={16} aria-hidden className="shrink-0 text-casca-marca" />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[13px] text-casca-texto",
              feita && "text-casca-meta line-through",
            )}
          >
            {tarefa.title}
          </span>
          {tarefa.due_date ? (
            <span className="block text-[11px] text-casca-suave">
              {horaDaTarefa(tarefa.due_date, idioma)}
            </span>
          ) : null}
        </span>
      </button>
      <span
        role="checkbox"
        aria-checked={feita}
        aria-disabled="true"
        aria-label={t("Concluída")}
        title={t("Em breve")}
        className={cn(
          "grid size-[18px] shrink-0 cursor-not-allowed place-items-center rounded-[4px] border",
          feita ? "border-casca-marca bg-casca-marca text-white" : "border-casca-borda bg-surface",
        )}
      >
        {feita ? <Check size={12} aria-hidden /> : null}
      </span>
    </li>
  );
}
