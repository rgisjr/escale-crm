"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { Sparkle } from "@/lib/ui/icons-da-casca";

/**
 * O ✦ do topo da Clint: estrela de 4 pontas preenchida, ~14px, escura.
 *
 * Na Clint ele abre a "Aura" (assistente de IA). O Escale não tem assistente
 * global, então ele leva ao hub "Agente de IA". Decisão D2, a confirmar com o
 * usuário. O estado aberto é print que falta.
 */
export function BotaoDaIa({ destino }: { destino: string | null }) {
  const t = useT();
  if (!destino) return null;
  return (
    <Link
      href={destino}
      aria-label={t("Agente de IA")}
      title={t("Agente de IA")}
      data-testid="ia-do-topo"
      className="grid size-7 place-items-center rounded-casca-gatilho text-casca-texto transition-colors hover:bg-casca-raia"
    >
      <Sparkle size={15} fill="currentColor" strokeWidth={0} aria-hidden />
    </Link>
  );
}
