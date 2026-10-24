"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DA_NOVA_PROSPECCAO } from "@/lib/escale/prospeccao/rotas";
import { Plus } from "@/lib/ui/icons-da-casca";

import { BotaoDaChave } from "./BotaoDaChave";

/** As ações do cabeçalho na aba Prospecção (D11, D12): a engrenagem da chave e "Nova prospecção" (molde do "Enviar WhatsApp"). */
export function AcoesDaProspeccao() {
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      <BotaoDaChave forma="icone" />
      <Link
        href={ROTA_DA_NOVA_PROSPECCAO}
        className="inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-3.5 text-[12px] font-medium whitespace-nowrap text-accent-foreground transition-colors hover:bg-casca-marca-forte"
      >
        <Plus size={14} aria-hidden />
        {t("Nova prospecção")}
      </Link>
    </div>
  );
}
