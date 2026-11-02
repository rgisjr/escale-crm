"use client";
import Link from "next/link";

import { useContasSociais } from "@/hooks/escale/useComentarios";
import { useT } from "@/hooks/i18n/useT";
import { MessagesSquare } from "@/lib/ui/icons-da-casca";

/**
 * FORK ESCALE · Fase 10A (D1): a entrada da caixa de comentários, na barra da fila de Conversas, antes da
 * engrenagem. Só aparece quando a organização tem conta do Instagram ou do Facebook.
 */
export function BotaoDosComentarios() {
  const t = useT();
  const { contas } = useContasSociais();
  if (contas.length === 0) return null;
  return (
    <Link
      href="/app/inbox/comentarios"
      aria-label={t("Comentários")}
      title={t("Comentários")}
      className="grid size-8 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
    >
      <MessagesSquare size={18} aria-hidden />
    </Link>
  );
}
