"use client";
import { useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { numeroDoValor } from "@/lib/escale/filtros/campos";
import { cn } from "@/lib/utils";

/**
 * Peças pequenas do painel de filtros (fork Escale, Fase 1D).
 *
 * Número e texto só valem quando a pessoa TERMINA de digitar (sai do campo ou dá
 * Enter): cada tecla seria uma troca de URL, e "1," no meio do caminho seria lido
 * como 1. Quem usa dá `key` com o valor de fora, para "Limpar" refletir aqui.
 */
export const classeDoSeletor =
  "h-9 w-full rounded-md border border-border bg-background px-2 text-sm";

export function RotuloDoGrupo({ children, ajuda }: { children: ReactNode; ajuda?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {children}
      </p>
      {ajuda ? <p className="text-xs text-muted-foreground">{ajuda}</p> : null}
    </div>
  );
}

export function Caixinha({
  marcada,
  onMudar,
  children,
}: {
  marcada: boolean;
  onMudar: (marcada: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 text-sm select-none",
        marcada && "font-medium",
      )}
    >
      <input type="checkbox" checked={marcada} onChange={(e) => onMudar(e.target.checked)} />
      {children}
    </label>
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
  const [texto, setTexto] = useState(valor === undefined ? "" : String(valor));
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
    setTexto(valor === undefined ? "" : String(valor));
  }
  return (
    <Input
      aria-label={rotulo}
      placeholder={dica ?? rotulo}
      inputMode="decimal"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className="h-9"
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
    <Input
      aria-label={rotulo}
      placeholder={rotulo}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className="h-9"
    />
  );
}

/** Marca ou desmarca `valor`; a lista vazia vira `undefined` (filtro desligado). */
export function alternarNaLista<T>(lista: readonly T[] | undefined, valor: T): T[] | undefined {
  const atual = lista ?? [];
  const proxima = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
  return proxima.length > 0 ? proxima : undefined;
}
