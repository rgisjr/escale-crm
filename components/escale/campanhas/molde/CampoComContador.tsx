"use client";

import { useId } from "react";

import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

import { CAMPO, ROTULO } from "./estilos";

/** O CAMPO COM CONTADOR (fork Escale, Fase 8B; 09-018 "0/80", 09-025 "25/80"). */
export function CampoComContador({
  rotulo,
  valor,
  aoMudar,
  maximo,
  placeholder,
  erro,
  id,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  maximo: number;
  placeholder?: string;
  erro?: string | null;
  id?: string;
}) {
  const t = useT();
  const gerado = useId();
  const idDoCampo = id ?? gerado;
  const noLimite = valor.length >= maximo;
  const aviso =
    erro ??
    (noLimite ? t("Limite de {max} caracteres atingido.").replace("{max}", String(maximo)) : null);
  return (
    <div>
      <label htmlFor={idDoCampo} className={ROTULO}>
        {rotulo}
      </label>
      <input
        id={idDoCampo}
        value={valor}
        maxLength={maximo}
        placeholder={placeholder}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={`${idDoCampo}-contador`}
        className={cn(CAMPO, erro && "border-casca-alerta")}
      />
      <div className="mt-1.5 flex justify-between gap-3 text-[11px]">
        <span role={aviso ? "alert" : undefined} className="text-casca-alerta">
          {aviso}
        </span>
        <span
          id={`${idDoCampo}-contador`}
          className="shrink-0 text-casca-meta"
        >{`${valor.length}/${maximo}`}</span>
      </div>
    </div>
  );
}
