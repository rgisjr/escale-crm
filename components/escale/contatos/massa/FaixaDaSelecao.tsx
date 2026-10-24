"use client";

import { useT } from "@/hooks/i18n/useT";

/**
 * A FAIXA DA SELEÇÃO (decisão B3 do usuário; textos nossos no tom da Clint):
 * página toda marcada → "Os N contatos desta página estão selecionados.
 * Selecionar todos os {total} contatos · Limpar seleção"; tudo marcado →
 * "Todos os {total} contatos estão selecionados. · Limpar seleção".
 */
export function FaixaDaSelecao({
  modo,
  naPagina,
  total,
  aoSelecionarTodos,
  aoLimpar,
  rotuloDeTodos,
}: {
  modo: "pagina" | "todos" | null;
  naPagina: number;
  total: number;
  aoSelecionarTodos: () => void;
  aoLimpar: () => void;
  /** FORK ESCALE · Fase 8C: o texto do link de todos ("…contatos filtrados", nos Detalhes da campanha). */
  rotuloDeTodos?: string;
}) {
  const t = useT();
  if (!modo) return null;
  const totalBr = total.toLocaleString("pt-BR");
  const link = "font-medium text-casca-marca hover:underline";
  return (
    <div
      role="status"
      className="flex h-9 shrink-0 items-center justify-center gap-2 bg-casca-marca-suave px-6 text-[13px] text-casca-texto"
    >
      {modo === "pagina" ? (
        <>
          <span>
            {t("Os {n} contatos desta página estão selecionados.").replace("{n}", String(naPagina))}
          </span>
          <button type="button" onClick={aoSelecionarTodos} className={link}>
            {rotuloDeTodos ?? t("Selecionar todos os {total} contatos").replace("{total}", totalBr)}
          </button>
        </>
      ) : (
        <span>
          {t("Todos os {total} contatos estão selecionados.").replace("{total}", totalBr)}
        </span>
      )}
      <span aria-hidden>·</span>
      <button type="button" onClick={aoLimpar} className={link}>
        {t("Limpar seleção")}
      </button>
    </div>
  );
}
