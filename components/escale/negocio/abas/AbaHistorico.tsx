"use client";
import { useMemo } from "react";

import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useLeadTimeline } from "@/hooks/leads/useLeadTimeline";
import { useT } from "@/hooks/i18n/useT";
import { haQuantoTempo, secoesDoHistorico } from "@/lib/escale/negocio/regras";
import { activityLabel, actorName } from "@/lib/leads/activity-vocabulary";
import type { TimelineItemView } from "@/lib/types/contacts";
import type { Lead } from "@/lib/types/leads";
import { ChevronDown, Clock, ListChecks, Search } from "@/lib/ui/icons-da-casca";

/**
 * A ABA HISTÓRICO DA FICHA (fork Escale, Fase 1G, C2; prints 07 e 12).
 *
 * A linha do tempo do original (cerca de 60 tipos, autor e tempo real), em
 * cartões da Clint, por semana. Busca e filtro de tipo são da 1H (C18).
 */
export function AbaHistorico({ lead }: { lead: Lead }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const linha = useLeadTimeline(lead.id, lead.contact_id);
  const secoes = useMemo(
    () => secoesDoHistorico(linha.itens, new Date(), idioma),
    [linha.itens, idioma],
  );

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3">
        <span className="relative">
          <input
            disabled
            title={t("Em breve")}
            placeholder={t("Buscar no histórico")}
            className="h-8 w-[148px] rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta disabled:cursor-not-allowed"
          />
          <Search
            size={14}
            aria-hidden
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
          />
        </span>
        <button
          type="button"
          disabled
          title={t("Em breve")}
          className="flex h-8 w-[218px] items-center justify-between rounded-md border border-casca-borda px-2.5 text-[13px] text-casca-texto disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {t("Todos")}
          <ChevronDown size={14} aria-hidden />
        </button>
      </div>
      {linha.isLoading ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Carregando…")}</p>
      ) : linha.isError ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Não consegui carregar o histórico.")}</p>
      ) : secoes.length === 0 ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Nenhum evento ainda.")}</p>
      ) : (
        secoes.map((s) => (
          <section key={s.chave} className="mt-6">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold text-casca-texto uppercase">
              <span>{t(s.rotulo)}</span>
              <span className="font-normal text-casca-meta normal-case">{s.data}</span>
              <span aria-hidden className="h-px flex-1 bg-casca-borda" />
            </h3>
            <ol className="mt-3 flex flex-col gap-2">
              {s.itens.map((item) => (
                <CartaoDoHistorico key={item.id} item={item} idioma={idioma} />
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

function CartaoDoHistorico({ item, idioma }: { item: TimelineItemView; idioma: string }) {
  const t = useT();
  const quem = actorName(
    item.actor_kind ?? null,
    { agente: item.actor_agent_name ?? null, usuario: item.actor_user_name ?? null },
    t,
  );
  return (
    <li className="flex gap-3 rounded-lg bg-casca-raia p-3">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-md text-casca-suave"
      >
        <ListChecks size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-casca-texto">{t(activityLabel(item.type))}</p>
        {item.reason ? (
          <p className="mt-0.5 text-[13px] text-casca-texto-2">{t(item.reason)}</p>
        ) : null}
        <p className="mt-1 flex items-center gap-1 text-[11px] text-casca-suave">
          <Clock size={12} aria-hidden />
          {haQuantoTempo(item.performed_at, new Date(), idioma)} {t("por")} {quem}
        </p>
      </div>
    </li>
  );
}
