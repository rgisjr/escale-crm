"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import {
  fimDoPrazo,
  PRAZOS_DA_PAUSA,
  pausaVigente,
  seloDaPausa,
  textoDoFim,
} from "@/lib/escale/conversas/pausa";
import { ChevronDown, CirclePause, Clock, Play } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ITEM =
  "flex h-9 w-full items-center justify-between px-3 text-left text-[12px] text-casca-texto hover:bg-casca-raia";

/**
 * "PAUSAR AUTOMAÇÃO" (c06, c07, c73, c74; D4; N9): o cartão de 44px entre o
 * negócio e as seções. Fechado: título e chevron. Aberto sem pausa:
 * "Nenhuma automação ativa · Nesta conversa" ou "{n} automação(ões) ativa(s)"
 * e "Pausar ▾" (4 prazos, Até retomar, Escolher data e hora). Com pausa:
 * "Pausa de todas", o selo "🕓 Até retomar / até hh:mm", "Por {pessoa}" e
 * "▶ Retomar".
 */
export function CartaoPausarAutomacao({ conversationId }: { conversationId: string }) {
  const t = useT();
  const { pausa: estado, pausar, retomar } = useConversaDaCasca(conversationId);
  const { data: membros = [] } = useAssignableMembers(true);
  const [aberto, setAberto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  const [quando, setQuando] = useState(() => new Date(Date.now() + 3_600_000));
  const agora = new Date();
  const vigente = estado?.pausa && pausaVigente(estado.pausa, agora) ? estado.pausa : null;
  const quem = vigente
    ? (membros.find((m) => m.user_id === vigente.user_id)?.full_name?.trim() ?? t("Atendente"))
    : null;
  const ativos = (estado?.followups.ativos ?? 0) + (estado?.agenteAtivo ? 1 : 0);
  const ocupado = pausar.isPending || retomar.isPending;

  const pausarAte = (ate: string | null) => {
    setMenu(false);
    setEscolhendo(false);
    pausar.mutate({ ate });
  };

  return (
    <section
      className={cn(
        "mb-4 rounded-lg border border-casca-borda",
        vigente && "border-casca-pausa-texto/40 bg-casca-pausa",
      )}
      data-testid="cartao-pausar-automacao"
    >
      <button
        type="button"
        className="flex h-11 w-full items-center gap-2 px-3 text-left"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      >
        <CirclePause
          size={16}
          aria-hidden
          className={vigente ? "text-casca-pausa-texto" : "text-casca-suave"}
        />
        <span className="flex-1 text-[13px] font-medium text-casca-texto">
          {t("Pausar automação")}
        </span>
        {vigente && !aberto ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-casca-pausa-texto">
            <Clock size={12} aria-hidden />
            {seloDaPausa(vigente, agora, t)}
          </span>
        ) : null}
        <ChevronDown
          size={16}
          aria-hidden
          className={cn("text-casca-chevron transition-transform", aberto && "rotate-180")}
        />
      </button>
      {aberto ? (
        <div className="border-t border-casca-borda px-3 py-3">
          {vigente ? (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-casca-texto">
                  {t("Pausa de todas")}
                </div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-casca-pausa-texto">
                  <Clock size={12} aria-hidden />
                  <span>{seloDaPausa(vigente, agora, t)}</span>
                </div>
                <div className="text-[11px] text-casca-suave">
                  {t("Por")} {quem}
                </div>
              </div>
              <BotaoDaCasca
                variante="texto"
                tamanho="sm"
                disabled={ocupado}
                onClick={() => retomar.mutate()}
                aria-label={t("Retomar")}
              >
                <Play size={14} aria-hidden /> {t("Retomar")}
              </BotaoDaCasca>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-casca-texto">
                  {ativos === 0
                    ? t("Nenhuma automação ativa")
                    : ativos === 1
                      ? t("1 automação ativa")
                      : `${ativos} ${t("automações ativas")}`}
                </div>
                <div className="text-[11px] text-casca-suave">{t("Nesta conversa")}</div>
              </div>
              <Popover.Root
                open={menu}
                onOpenChange={(o) => {
                  setMenu(o);
                  if (!o) setEscolhendo(false);
                }}
              >
                <Popover.Trigger asChild>
                  <BotaoDaCasca
                    variante="marca"
                    tamanho="sm"
                    disabled={ocupado}
                    aria-label={t("Pausar")}
                  >
                    {t("Pausar")} <ChevronDown size={14} aria-hidden />
                  </BotaoDaCasca>
                </Popover.Trigger>
                <PainelSuspenso align="end" className="w-[240px] py-1">
                  {!escolhendo ? (
                    <>
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
                        {t("Pausar todas por")}
                      </div>
                      {PRAZOS_DA_PAUSA.map((p) => (
                        <button
                          key={p.chave}
                          type="button"
                          className={ITEM}
                          onClick={() => pausarAte(fimDoPrazo(p.chave, new Date()).toISOString())}
                        >
                          <span>{t(p.rotulo)}</span>
                          <span className="text-[11px] text-casca-suave">
                            {textoDoFim(
                              fimDoPrazo(p.chave, new Date()).toISOString(),
                              new Date(),
                              t,
                            )}
                          </span>
                        </button>
                      ))}
                      <div className="my-1 h-px bg-casca-borda" />
                      <button type="button" className={ITEM} onClick={() => pausarAte(null)}>
                        {t("Até retomar")}
                      </button>
                      <button type="button" className={ITEM} onClick={() => setEscolhendo(true)}>
                        {t("Escolher data e hora")}
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 p-3">
                      <SeletorDeDataEHora valor={quando} aoMudar={setQuando} />
                      <BotaoDaCasca
                        variante="marca"
                        tamanho="sm"
                        disabled={quando.getTime() <= agora.getTime()}
                        onClick={() => pausarAte(quando.toISOString())}
                      >
                        {t("Pausar")}
                      </BotaoDaCasca>
                    </div>
                  )}
                </PainelSuspenso>
              </Popover.Root>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
