"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCamposDasOrigens } from "@/hooks/escale/useCamposDasOrigens";
import { usePrefsDoCard } from "@/hooks/escale/usePrefsDoCard";
import { useT } from "@/hooks/i18n/useT";
import {
  PREFS_PADRAO,
  camposDaCapa,
  diferemDoPadrao,
  type CampoDaCapa,
} from "@/lib/escale/capa/tipos";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import { SlidersHorizontal } from "@/lib/ui/icons-da-casca";

import { JanelaPersonalizarCards } from "./JanelaPersonalizarCards";

/**
 * O ÍCONE "PERSONALIZAR CARDS" DA LINHA DE CONTAGEM (fork Escale, Fase 1E; Clint
 * v2, prints `33a` e `v2-01`): ajustes de 17px logo depois do atualizar, dica em
 * balão lavanda embaixo e o ponto da marca quando a pessoa já personalizou.
 */
export function PersonalizarCards({ campos }: { campos: readonly CampoFiltravel[] }) {
  const t = useT();
  const [aberta, setAberta] = useState(false);
  const { data: prefs, isPending } = usePrefsDoCard();
  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <BotaoDaCasca
              type="button"
              variante="icone"
              aria-label={t("Personalizar cards")}
              aria-busy={isPending}
              onClick={() => setAberta(true)}
            >
              <span className="relative">
                <SlidersHorizontal size={17} aria-hidden />
                {prefs && diferemDoPadrao(prefs) ? (
                  <span
                    aria-hidden
                    data-testid="ponto-da-capa"
                    className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-casca-marca ring-2 ring-surface"
                  />
                ) : null}
              </span>
            </BotaoDaCasca>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="rounded-[4px] bg-casca-marca-suave text-[11px] text-casca-marca"
          >
            {t("Personalizar cards")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {aberta && <AbrirJanela campos={campos} onFechar={() => setAberta(false)} />}
    </>
  );
}

/**
 * A janela só monta com a preferência carregada: senão o rascunho nasceria do padrão e gravaria por cima.
 * Se a leitura falhar, a pessoa vê o erro e a janela não abre (antes, o clique não fazia nada).
 * O catálogo dos campos de todas as origens também é esperado: sem ele a janela não saberia o que
 * soltar. Se ele falhar, a janela abre sem catálogo e não solta nada.
 */
function AbrirJanela({
  campos,
  onFechar,
}: {
  campos: readonly CampoFiltravel[];
  onFechar: () => void;
}) {
  const t = useT();
  const { data: prefs, isSuccess, isError, error } = usePrefsDoCard();
  const catalogo = useCamposDasOrigens();
  useEffect(() => {
    if (!isError) return;
    toast.error(textoDoErro(error, t));
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avisa uma vez por falha
  }, [isError]);
  const camposDoCard = useMemo<CampoDaCapa[]>(
    () =>
      camposDaCapa([]).concat(
        campos
          .filter((c) => c.alvo === "negocio")
          .map((c) => ({
            entidade: "negocio" as const,
            chave: c.chave,
            rotulo: c.rotulo,
            deInterface: false,
            ...(c.opcoes ? { opcoes: c.opcoes } : {}),
          })),
      ),
    [campos],
  );
  if (!isSuccess || catalogo.isPending) return null;
  return (
    <JanelaPersonalizarCards
      prefs={prefs ?? PREFS_PADRAO}
      campos={camposDoCard}
      catalogo={catalogo.data}
      onFechar={onFechar}
    />
  );
}
