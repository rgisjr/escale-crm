"use client";
import { useState } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAtividadesDoNegocio } from "@/hooks/escale/useAtividadesDoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import {
  ROTULO_DA_SECAO,
  SECOES,
  SECOES_PADRAO,
  secoesParaMostrar,
  type Secao,
  type SecoesVisiveis,
} from "@/lib/escale/conversas/secoes";
import type { Lead } from "@/lib/types/leads";
import {
  Briefcase,
  Building2,
  ChevronRight,
  ClipboardList,
  Clock,
  MessageCircle,
  Paperclip,
  SlidersHorizontal,
  StickyNote,
  User,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";

import { SecaoAnexos } from "./secoes/SecaoAnexos";
import { SecaoAtividades } from "./secoes/SecaoAtividades";
import { SecaoContato } from "./secoes/SecaoContato";
import { SecaoConversas } from "./secoes/SecaoConversas";
import { SecaoEmpresa } from "./secoes/SecaoEmpresa";
import { SecaoHistorico } from "./secoes/SecaoHistorico";
import { SecaoNegocio } from "./secoes/SecaoNegocio";
import { SecaoNotas } from "./secoes/SecaoNotas";

export const ICONE_DA_SECAO: Readonly<Record<Secao, LucideIcon>> = {
  atividades: ClipboardList,
  contato: User,
  negocio: Briefcase,
  empresa: Building2,
  notas: StickyNote,
  anexos: Paperclip,
  historico: Clock,
  conversas: MessageCircle,
};

/** Contagem e atrasadas de Atividades no cartão (c15, 02-009); só com negócio. */
function ContagemDeAtividades({ lead }: { lead: Lead }) {
  const t = useT();
  const { dados } = useAtividadesDoNegocio(lead);
  const [agora] = useState(() => Date.now());
  const pendentes = (dados?.atividades ?? []).filter((a) => a.status !== "done");
  const atrasadas = pendentes.filter((a) => a.due_date && Date.parse(a.due_date) < agora).length;
  if (pendentes.length === 0) return null;
  return (
    <span className="flex items-center gap-2">
      <span className="rounded-full bg-casca-marca-suave px-1.5 text-[11px] font-semibold text-casca-marca">
        {pendentes.length}
      </span>
      {atrasadas > 0 ? (
        <span className="rounded-full bg-casca-atraso px-2 text-[11px] font-medium text-casca-alerta">
          {`${atrasadas} ${atrasadas === 1 ? t("atrasada") : t("atrasadas")}`}
        </span>
      ) : null}
    </span>
  );
}

/**
 * SEÇÕES (fork Escale, Fase 3A; D5–D10; 02-009, c15, c49). A lista de cartões,
 * o balão "Seções visíveis" (só liga e desliga) e a seção aberta no lugar da
 * lista. Sem negócio, Atividades e Negócio somem (c48).
 */
export function SecoesDoPainel({
  conversa,
  quadro,
  secoes,
  aoMudarSecoes,
  aoAbrirConversa,
}: {
  conversa: ConversationWithContact;
  quadro: QuadroDoNegocio | null;
  secoes: SecoesVisiveis;
  aoMudarSecoes: (s: Partial<SecoesVisiveis>) => void;
  aoAbrirConversa: (id: string | null) => void;
}) {
  const t = useT();
  const [aberta, setAberta] = useState<Secao | null>(null);
  const [balao, setBalao] = useState(false);
  const [conversaVista, setConversaVista] = useState(conversa.id);
  if (conversaVista !== conversa.id) {
    setConversaVista(conversa.id);
    setAberta(null);
  }
  const visiveis = secoesParaMostrar(secoes, quadro !== null);
  const voltar = () => setAberta(null);

  if (aberta && visiveis.includes(aberta)) {
    const comum = { conversa, quadro, aoVoltar: voltar };
    switch (aberta) {
      case "atividades":
        return quadro ? <SecaoAtividades quadro={quadro} aoVoltar={voltar} /> : null;
      case "contato":
        return <SecaoContato {...comum} />;
      case "negocio":
        return quadro ? <SecaoNegocio quadro={quadro} aoVoltar={voltar} /> : null;
      case "empresa":
        return <SecaoEmpresa aoVoltar={voltar} />;
      case "notas":
        return <SecaoNotas quadro={quadro} aoVoltar={voltar} />;
      case "anexos":
        return <SecaoAnexos conversa={conversa} quadro={quadro} aoVoltar={voltar} />;
      case "historico":
        return <SecaoHistorico quadro={quadro} aoVoltar={voltar} />;
      case "conversas":
        return (
          <SecaoConversas conversa={conversa} aoAbrirConversa={aoAbrirConversa} aoVoltar={voltar} />
        );
    }
  }

  return (
    <section className="pb-6">
      <div className="flex h-8 items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
          {t("Seções")}
        </span>
        <Popover open={balao} onOpenChange={setBalao}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("Personalizar seções")}
              title={t("Personalizar seções")}
              className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
            >
              <SlidersHorizontal size={14} aria-hidden />
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="end" sideOffset={6} className="w-[258px] p-3">
            <p className="pb-2 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
              {t("Seções visíveis")}
            </p>
            <ul>
              {SECOES.map((s) => (
                <li
                  key={s}
                  className="flex h-9 items-center justify-between text-[12px] text-casca-texto"
                >
                  {t(ROTULO_DA_SECAO[s])}
                  <InterruptorDaCasca
                    ligado={secoes[s]}
                    aoMudar={(v) => aoMudarSecoes({ [s]: v })}
                    aria-label={t(ROTULO_DA_SECAO[s])}
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => aoMudarSecoes(SECOES_PADRAO)}
              className="mt-2 w-full text-center text-[12px] text-casca-marca hover:underline"
            >
              {t("Mostrar todas")}
            </button>
          </PainelSuspenso>
        </Popover>
      </div>
      <ul aria-label={t("Seções")} className="flex flex-col gap-2">
        {visiveis.map((s) => {
          const Icone = ICONE_DA_SECAO[s];
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => setAberta(s)}
                className="flex h-11 w-full items-center gap-2 rounded-[8px] border border-casca-borda bg-surface px-4 text-left hover:bg-casca-raia"
              >
                <Icone size={16} aria-hidden className="text-casca-suave" />
                <span className="flex-1 text-[13px] text-casca-texto">{t(ROTULO_DA_SECAO[s])}</span>
                {s === "atividades" && quadro ? <ContagemDeAtividades lead={quadro.lead} /> : null}
                <ChevronRight size={14} aria-hidden className="text-casca-chevron" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
