"use client";
import { useState, type MouseEvent } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import {
  chaveDoCampo,
  textoDoValor,
  valorDoCampo,
  type CampoDaCapa,
  type PrefsDoCard,
} from "@/lib/escale/capa/tipos";
import type { Lead } from "@/lib/types/leads";
import { Copy } from "@/lib/ui/icons-da-casca";

const parar = (e: MouseEvent) => e.stopPropagation();

/**
 * OS CAMPOS ESCOLHIDOS NO "PERSONALIZAR CARDS", em chips abaixo do rodapé (fork
 * Escale, Fase 1E; código do card da Clint, `customFields`): fundo claro da
 * marca, texto da marca, 10px/500, até 160px. O hover mostra o rótulo e o valor,
 * com "Copiar". Campo vazio não aparece (só a prévia mostra exemplo).
 */
export function ChipsDeCampos({
  lead,
  prefs,
  campos,
}: {
  lead: Lead;
  prefs: PrefsDoCard;
  campos: readonly CampoDaCapa[];
}) {
  const t = useT();
  const porChave = new Map(campos.map((c) => [chaveDoCampo(c), c]));
  const chips = prefs.campos.flatMap((escolhido) => {
    const campo = porChave.get(chaveDoCampo(escolhido));
    if (!campo) return [];
    const texto = textoDoValor(valorDoCampo(lead, campo), campo, t("Sim"), t("Não"));
    return texto
      ? [{ campo, texto, rotulo: campo.deInterface ? t(campo.rotulo) : campo.rotulo }]
      : [];
  });
  if (chips.length === 0) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <div
        data-testid="chips-de-campos"
        className="flex flex-wrap gap-1 px-2.5 pb-2"
        onClick={parar}
        onPointerDown={parar}
      >
        {chips.map(({ campo, texto, rotulo }) => (
          <ChipDoCampo key={chaveDoCampo(campo)} rotulo={rotulo} texto={texto} />
        ))}
      </div>
    </TooltipProvider>
  );
}

function ChipDoCampo({ rotulo, texto }: { rotulo: string; texto: string }) {
  const t = useT();
  const [copiado, setCopiado] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="max-w-40 truncate rounded-[4px] bg-casca-marca-suave px-1.5 text-[10px] leading-4 font-medium text-casca-marca">
          {texto}
        </span>
      </TooltipTrigger>
      <TooltipContent className="flex max-w-64 items-center gap-2 bg-casca-texto-2 text-[11px] break-words text-white">
        <span>
          <span className="font-semibold">{rotulo}</span> {texto}
        </span>
        <button
          type="button"
          aria-label={(copiado ? t("Copiado: {label}") : t("Copiar {label}")).replace(
            "{label}",
            rotulo,
          )}
          onClick={() => {
            void navigator.clipboard?.writeText(texto);
            setCopiado(true);
          }}
          className="grid size-5 place-items-center rounded-[4px] hover:bg-white/10"
        >
          <Copy size={12} aria-hidden />
        </button>
      </TooltipContent>
    </Tooltip>
  );
}
