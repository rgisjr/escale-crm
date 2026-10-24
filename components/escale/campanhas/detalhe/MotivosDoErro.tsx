"use client";
import { useState } from "react";

import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  porcentoDoMotivo,
  resumoDosMotivos,
  seloDasFalhas,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import { SEM_CODIGO, textoDoMotivo } from "@/lib/escale/campanhas/detalhe/motivos";
import type { MotivoDoErro } from "@/lib/escale/campanhas/detalhe/tipos";

/** "MOTIVOS DO ERRO" (010): selo vermelho com as falhas, o resumo e "Ver motivos"/"Ocultar motivos". */
export function MotivosDoErro({
  motivos,
  erros,
}: {
  motivos: readonly MotivoDoErro[];
  erros: number;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  if (erros === 0) return null;
  return (
    <SecaoDoSumario
      titulo={t("Motivos do erro")}
      tituloGrande
      selo={
        <span className="rounded-[4px] bg-(--escale-tom-vermelho-fundo) px-1.5 py-0.5 text-[11px] text-(--escale-tom-vermelho-texto)">
          {seloDasFalhas(erros, t)}
        </span>
      }
      legenda={t("% sobre não entregues")}
    >
      <div className="-mx-4 border-t border-casca-divisoria px-4 pt-3">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span>{resumoDosMotivos(motivos, t)}</span>
          <button
            type="button"
            aria-expanded={aberto}
            onClick={() => setAberto((a) => !a)}
            className="shrink-0 text-[12px] font-medium text-casca-marca hover:underline"
          >
            {aberto ? t("Ocultar motivos") : t("Ver motivos")}
          </button>
        </div>
        {aberto ? (
          <ul className="mt-3 space-y-2">
            {motivos.map((m) => {
              const texto = textoDoMotivo(m.codigo, t);
              return (
                <li
                  key={m.codigo ?? SEM_CODIGO}
                  className="flex items-center justify-between gap-3 text-[12px]"
                >
                  <span className="truncate" title={texto}>
                    {texto}
                  </span>
                  <span className="shrink-0 text-casca-suave">
                    {`${numeroBr(m.quantidade)} · ${porcentoDoMotivo(m.quantidade, motivos) ?? 0}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </SecaoDoSumario>
  );
}
