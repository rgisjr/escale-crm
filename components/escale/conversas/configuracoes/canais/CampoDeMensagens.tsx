"use client";
import { useState } from "react";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { adicionarMensagem } from "@/lib/escale/conversas/criacao-de-negocio";
import { X } from "@/lib/ui/icons-da-casca";

/** As mensagens da condição (16/10-01): Enter vira chip; até 10, sem repetir (as frases da Clint). */
export function CampoDeMensagens({
  valores,
  aoMudar,
  desabilitado,
}: {
  valores: string[];
  aoMudar: (v: string[]) => void;
  desabilitado: boolean;
}) {
  const t = useT();
  const [texto, setTexto] = useState("");
  return (
    <div className="flex min-h-9 flex-1 flex-wrap items-center gap-1 rounded-casca-gatilho bg-casca-busca px-2 py-1">
      {valores.map((m) => (
        <span
          key={m}
          className="flex h-6 items-center gap-1 rounded-[4px] bg-surface px-2 text-[11px] text-casca-texto"
        >
          {m}
          {!desabilitado ? (
            <button
              type="button"
              aria-label={`${t("Remover")} ${m}`}
              onClick={() => aoMudar(valores.filter((x) => x !== m))}
              className="text-casca-suave hover:text-casca-texto"
            >
              <X size={12} aria-hidden />
            </button>
          ) : null}
        </span>
      ))}
      <input
        value={texto}
        disabled={desabilitado}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const r = adicionarMensagem(valores, texto);
          if (!r.ok) {
            toast.error(t(r.erro));
            return;
          }
          aoMudar(r.lista);
          setTexto("");
        }}
        placeholder={valores.length ? "" : t("Digite uma ou mais mensagens")}
        className="h-7 min-w-[120px] flex-1 bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
      />
    </div>
  );
}
