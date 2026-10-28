"use client";

/** Divisor (T15, provisório): o nome como título de seção, com uma linha até o fim. Nunca consulta o motor. */
export function GraficoDivisor({ nome }: { nome: string }) {
  return (
    <div className="flex h-full items-center gap-3">
      <p className="shrink-0 text-[14px] font-semibold text-casca-texto">{nome}</p>
      <span aria-hidden className="h-px flex-1 bg-casca-divisoria" />
    </div>
  );
}
