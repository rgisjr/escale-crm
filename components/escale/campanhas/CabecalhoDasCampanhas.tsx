"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import {
  ROTA_DA_CONFIGURACAO,
  ROTA_DA_NOVA,
  ROTULO_DA_ABA,
  type AbaDasCampanhas,
} from "@/lib/escale/campanhas/rotas";
import { WhatsappLogo } from "@/lib/ui/icons";
import { Settings } from "@/lib/ui/icons-da-casca";

/**
 * O CABEÇALHO DE CAMPANHAS (002; PRD A1, A14): o nome do canal, a engrenagem
 * (a configuração do original, N11) e "Enviar WhatsApp". Sem o selo
 * "Otimizado" (Marketing Messages API, ignorado no PRD).
 */
export function CabecalhoDasCampanhas({ aba }: { aba: AbaDasCampanhas }) {
  const t = useT();
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-casca-divisoria px-6">
      <h1 className="text-[18px] font-medium text-casca-texto">{t(ROTULO_DA_ABA[aba])}</h1>
      {aba === "whatsapp" ? (
        <div className="flex items-center gap-2">
          <Link
            href={ROTA_DA_CONFIGURACAO}
            aria-label={t("Configuração de campanhas")}
            title={t("Configuração de campanhas")}
            className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:bg-casca-raia hover:text-casca-texto"
          >
            <Settings size={16} aria-hidden />
          </Link>
          <Link
            href={ROTA_DA_NOVA}
            className="inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-3.5 text-[12px] font-medium whitespace-nowrap text-accent-foreground transition-colors hover:bg-casca-marca-forte"
          >
            <WhatsappLogo size={14} aria-hidden />
            {t("Enviar WhatsApp")}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
