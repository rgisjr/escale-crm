"use client";
import type { ReactNode } from "react";

import { BotaoDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import type { ProblemaDoDesenho } from "@/lib/automation/desenho-da-regra";
import type { TipoDoNo } from "@/lib/escale/automacoes/fluxo/paleta";
import { ChevronLeft } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { VISUAL_DO_NO } from "../visual-do-fluxo";

/** Os problemas do último Salvar recusado, no topo do corpo (texto de hoje). */
export function ProblemasDoPainel({ lista }: { lista?: readonly ProblemaDoDesenho[] }) {
  const t = useT();
  if (!lista || lista.length === 0) return null;
  return (
    <div role="alert" className="mb-4 rounded-md border border-casca-alerta/40 p-3 text-[12px] text-casca-alerta">
      <p className="font-medium">{t("Para salvar, corrija:")}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {lista.map((p) => (
          <li key={p.mensagem}>{t(p.mensagem)}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A CASCA DO PAINEL DO NÓ (D13, 07-013, 07-025, 07-027): por cima do canvas, à
 * esquerda, 400 px (800 na escolha do gatilho). Cabeçalho de 49 px tingido pela cor
 * do tipo, corpo com rolagem e rodapé fixo "Cancelar" e "Salvar". O painel guarda o
 * rascunho; quem o usa decide o que "Salvar" faz.
 */
export function PainelDoNo({
  tipo,
  titulo,
  largura = 400,
  aoVoltar,
  comRodape = true,
  salvarDesabilitado = false,
  aoCancelar,
  aoSalvar,
  children,
}: {
  tipo: TipoDoNo;
  titulo: string;
  largura?: 400 | 800;
  aoVoltar?: () => void;
  comRodape?: boolean;
  salvarDesabilitado?: boolean;
  aoCancelar: () => void;
  aoSalvar: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const visual = VISUAL_DO_NO[tipo];
  const Icone = visual.icone;
  return (
    <section
      data-testid="painel-do-no"
      data-largura={largura}
      className={cn(
        "absolute inset-y-0 left-0 z-10 flex max-w-[calc(100%-78px)] flex-col border-r border-casca-divisoria bg-surface shadow-[4px_0_12px_rgb(17_24_39/0.06)]",
        largura === 800 ? "w-[800px]" : "w-[400px]",
      )}
    >
      <header
        data-testid="painel-do-no-cabecalho"
        className={cn("flex h-[49px] shrink-0 items-center gap-2 border-b border-casca-divisoria px-6", tipo !== "condicoes" && visual.fundo)}
      >
        {aoVoltar ? (
          <button
            type="button"
            aria-label={t("Voltar")}
            onClick={aoVoltar}
            className="grid size-6 place-items-center rounded-casca-gatilho text-casca-texto-2 hover:bg-casca-raia"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
        ) : null}
        <Icone size={18} className={visual.texto} aria-hidden />
        <h2 className="text-[14px] font-medium text-casca-texto">{titulo}</h2>
      </header>
      {/* A ajuda "?" precisa de um provedor de dicas acima; sem ele o painel cairia. */}
      <TooltipProvider>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </TooltipProvider>
      {comRodape ? (
        <footer className="flex h-16 shrink-0 items-center justify-end gap-2 border-t border-casca-divisoria px-6">
          <BotaoDaJanela variante="cancelar" onClick={aoCancelar}>
            {t("Cancelar")}
          </BotaoDaJanela>
          <BotaoDaCasca variante="marca" disabled={salvarDesabilitado} onClick={aoSalvar}>
            {t("Salvar")}
          </BotaoDaCasca>
        </footer>
      ) : null}
    </section>
  );
}
