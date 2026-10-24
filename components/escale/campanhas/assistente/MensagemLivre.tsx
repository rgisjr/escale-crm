"use client";

import { useId, useRef, useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { TEXTO_MAX } from "@/lib/escale/campanhas/assistente";
import { CAMPOS_BASICOS, tokenDoCampo } from "@/lib/escale/campanhas/modelo";
import type { CampoPersonalizado } from "@/lib/escale/campanhas/previa";
import { Braces, FileText } from "@/lib/ui/icons-da-casca";

import { ROTULO } from "../molde/estilos";

/** A MENSAGEM DE TEXTO LIVRE (fork Escale, Fase 8B; N5): número não oficial. */
export function MensagemLivre({
  texto,
  aoMudar,
  personalizados,
  aoUsarTextoSalvo,
  erro,
}: {
  texto: string;
  aoMudar: (texto: string) => void;
  personalizados: readonly CampoPersonalizado[];
  aoUsarTextoSalvo: () => void;
  erro?: string | null;
}) {
  const t = useT();
  const id = useId();
  const campo = useRef<HTMLTextAreaElement>(null);
  const [aberto, setAberto] = useState(false);
  const inserir = (token: string) => {
    const el = campo.current;
    const ini = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    aoMudar(`${texto.slice(0, ini)}${token}${texto.slice(fim)}`.slice(0, TEXTO_MAX));
    setAberto(false);
  };
  const opcoes = [
    ...CAMPOS_BASICOS.map((c) => ({ campo: c.campo, rotulo: t(c.rotulo) })),
    ...personalizados,
  ];
  return (
    <div>
      <label htmlFor={id} className={ROTULO}>
        {t("Mensagem")}
      </label>
      <textarea
        id={id}
        ref={campo}
        value={texto}
        maxLength={TEXTO_MAX}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={erro ? true : undefined}
        className="h-36 w-full resize-y rounded-[6px] border border-transparent bg-casca-busca p-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:border-casca-marca focus-visible:outline-hidden"
      />
      <div className="mt-1.5 flex items-center gap-3 text-[12px]">
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center gap-1 font-medium text-casca-marca">
              <Braces className="size-3.5" aria-hidden />
              {t("Inserir variável")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso sideOffset={6} className="max-h-64 w-56 overflow-y-auto py-1">
            {opcoes.map((o) => (
              <button
                key={o.campo}
                type="button"
                onClick={() => inserir(tokenDoCampo(o.campo))}
                className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-casca-busca"
              >
                {o.rotulo}
              </button>
            ))}
          </PainelSuspenso>
        </Popover>
        <button
          type="button"
          onClick={aoUsarTextoSalvo}
          className="flex items-center gap-1 font-medium text-casca-marca"
        >
          <FileText className="size-3.5" aria-hidden />
          {t("Usar texto salvo")}
        </button>
        <span className="ml-auto text-[11px] text-casca-meta">{`${texto.length}/${TEXTO_MAX}`}</span>
      </div>
      {erro && (
        <p role="alert" className="mt-1 text-[11px] text-casca-alerta">
          {erro}
        </p>
      )}
    </div>
  );
}
