"use client";
import type { ReactNode } from "react";

import { CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";

/**
 * OS CAMPOS DO ASSISTENTE E DO DETALHE DA PROSPECÇÃO (fork Escale, Fase 8D;
 * 018): rótulo 13px/500, campo de 32px da Clint, ajuda 11px. Nenhum controle
 * nativo de seleção ou data (regra 2 do CLAUDE.md).
 */
export function RotuloDoCampo({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-medium text-casca-texto">
      {children}
    </label>
  );
}

export function Ajuda({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-casca-suave">{children}</p>;
}

export function CampoDeTexto({
  id,
  rotulo,
  valor,
  aoMudar,
  placeholder,
  numerico = false,
  tipo = "text",
  ajuda,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  numerico?: boolean;
  tipo?: "text" | "password";
  ajuda?: string;
}) {
  return (
    <div className="space-y-1.5">
      <RotuloDoCampo htmlFor={id}>{rotulo}</RotuloDoCampo>
      <input
        id={id}
        type={tipo}
        autoComplete="off"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        inputMode={numerico ? "decimal" : undefined}
        className={CLASSE_DO_CAMPO}
      />
      {ajuda ? <Ajuda>{ajuda}</Ajuda> : null}
    </div>
  );
}

export function CampoDeTextoLongo({
  id,
  rotulo,
  valor,
  aoMudar,
  placeholder,
  ajuda,
  maximo,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  ajuda?: string;
  maximo: number;
}) {
  return (
    <div className="space-y-1.5">
      <RotuloDoCampo htmlFor={id}>{rotulo}</RotuloDoCampo>
      <textarea
        id={id}
        value={valor}
        maxLength={maximo}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full resize-y rounded-[4px] border border-transparent bg-casca-busca p-2.5 text-xs text-casca-texto outline-hidden placeholder:text-casca-meta focus:border-casca-marca focus:bg-surface"
      />
      {ajuda ? <Ajuda>{ajuda}</Ajuda> : null}
    </div>
  );
}

/** Os erros do passo, no topo do conteúdo, depois que a pessoa tentou seguir. */
export function ErrosDoPasso({ erros }: { erros: readonly string[] }) {
  if (!erros.length) return null;
  return (
    <ul
      role="alert"
      className="mb-4 space-y-1 rounded-md border border-casca-alerta bg-surface px-3 py-2 text-[12px] text-casca-alerta"
    >
      {erros.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}
