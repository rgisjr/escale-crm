"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { deveMostrarContador } from "@/lib/escale/negocio/regras";

/**
 * "N NEGÓCIOS" DO CONTATO (fork Escale, Fase 1G, C7; 01-017). Só com mais de um
 * (Clint `Ue>1`); leva à página do contato (a Clint abre uma gaveta, Q8).
 */
export function ContadorDeNegocios({
  total,
  contatoId,
}: {
  total: number;
  contatoId: string | null;
}) {
  const t = useT();
  if (!contatoId || !deveMostrarContador(total)) return null;
  return (
    <Link
      href={`/app/contacts/${contatoId}`}
      className="inline-flex h-8 items-center rounded-md bg-casca-marca-suave px-3 text-[13px] font-medium text-casca-marca hover:bg-casca-marca-media"
    >
      {total} {t("Negócios")}
    </Link>
  );
}
