"use client";
import { useState, type ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { numeroDoValor } from "@/lib/escale/filtros/campos";
import { dataBrDoIso, isoDaDataBr } from "@/lib/escale/filtros/periodo";

/**
 * Peças pequenas dos filtros do quadro (fork Escale, Fase 1D; visual da Clint na
 * Casca V4). Nenhuma é controle nativo de seleção, data ou caixinha: caixinha é
 * `CaixaDaCasca`, seleção é `SeletorDaCasca` e data é `CampoDeData` (dd/mm/aaaa).
 *
 * Número, texto e data só valem quando a pessoa TERMINA de digitar (sai do campo
 * ou dá Enter): cada tecla seria uma troca de URL, e "1," no meio do caminho seria
 * lido como 1. Quem usa dá `key` com o valor de fora, para "Limpar" refletir aqui.
 */

/** O campo da Clint (design system §6.7): fundo claro, sem borda aparente, 32px, raio 4px; foco na cor da marca. */
export const CLASSE_DO_CAMPO =
  "h-8 w-full rounded-[4px] border border-transparent bg-casca-busca px-2.5 text-xs text-casca-texto outline-hidden placeholder:text-casca-meta focus:border-casca-marca focus:bg-surface";

/** Item de menu da Clint (design system §6.5): 11px, 34px de altura, destaque no tom claro da marca. */
export const CLASSE_DA_LINHA_DO_MENU =
  "flex h-[34px] w-full items-center gap-2 rounded-[2px] px-3 text-left text-[11px] text-casca-texto hover:bg-casca-marca-suave hover:text-casca-marca disabled:cursor-default disabled:text-casca-meta disabled:hover:bg-transparent";

/** O rótulo de grupo da Clint ("DONO DO NEGÓCIO"): 11px, 600, maiúsculas, espaçado. */
export function RotuloDoGrupo({ children, ajuda }: { children: ReactNode; ajuda?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold tracking-[0.6px] text-casca-suave uppercase">
        {children}
      </p>
      {ajuda ? <p className="text-[11px] text-casca-meta">{ajuda}</p> : null}
    </div>
  );
}

export function CampoNumerico({
  rotulo,
  dica,
  valor,
  onMudar,
}: {
  rotulo: string;
  dica?: string;
  valor: number | undefined;
  onMudar: (valor: number | undefined) => void;
}) {
  const [texto, setTexto] = useState(valor === undefined ? "" : String(valor).replace(".", ","));
  function confirmar() {
    if (texto.trim() === "") {
      if (valor !== undefined) onMudar(undefined);
      return;
    }
    const n = numeroDoValor(texto);
    if (n !== null && n >= 0) {
      if (n !== valor) onMudar(n);
      return;
    }
    setTexto(valor === undefined ? "" : String(valor).replace(".", ","));
  }
  return (
    <input
      aria-label={rotulo}
      placeholder={dica ?? rotulo}
      inputMode="decimal"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className={CLASSE_DO_CAMPO}
    />
  );
}

export function CampoDeTexto({
  rotulo,
  valor,
  onMudar,
}: {
  rotulo: string;
  valor: string | undefined;
  onMudar: (valor: string | undefined) => void;
}) {
  const [texto, setTexto] = useState(valor ?? "");
  function confirmar() {
    const limpo = texto.trim() || undefined;
    if (limpo !== valor) onMudar(limpo);
  }
  return (
    <input
      aria-label={rotulo}
      placeholder={rotulo}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className={CLASSE_DO_CAMPO}
    />
  );
}

/**
 * Uma data digitada em dd/mm/aaaa (o formato da Clint), guardada como AAAA-MM-DD.
 * Data que não existe ("31/02/2026") volta ao valor de antes, sem trocar a URL.
 */
export function CampoDeData({
  rotulo,
  valor,
  onMudar,
}: {
  rotulo: string;
  valor: string | undefined;
  onMudar: (iso: string | undefined) => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState(dataBrDoIso(valor));
  function confirmar() {
    if (texto.trim() === "") {
      if (valor !== undefined) onMudar(undefined);
      return;
    }
    const iso = isoDaDataBr(texto);
    if (iso) {
      if (iso !== valor) onMudar(iso);
      return;
    }
    setTexto(dataBrDoIso(valor));
  }
  return (
    <input
      aria-label={rotulo}
      placeholder={t("dd/mm/aaaa")}
      inputMode="numeric"
      maxLength={10}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className={CLASSE_DO_CAMPO}
    />
  );
}

/** Marca ou desmarca `valor`; a lista vazia vira `undefined` (filtro desligado). */
export function alternarNaLista<T>(lista: readonly T[] | undefined, valor: T): T[] | undefined {
  const atual = lista ?? [];
  const proxima = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
  return proxima.length > 0 ? proxima : undefined;
}
