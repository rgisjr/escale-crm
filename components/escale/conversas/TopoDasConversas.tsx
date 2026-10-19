"use client";
import Link from "next/link";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { Plus, Settings } from "@/lib/ui/icons-da-casca";

/** A barra do módulo (c01): "Conversas", o ⚙ do hub (3C) e "Nova conversa +". */
export function TopoDasConversas({
  aoNovaConversa,
  novaAberta,
}: {
  aoNovaConversa: () => void;
  novaAberta: boolean;
}) {
  const t = useT();
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-casca-borda pr-4 pl-6">
      <h1 className="text-[16px] font-medium text-casca-texto">{t("Conversas")}</h1>
      <div className="flex items-center gap-2">
        <Link
          href="/app/inbox/configuracoes"
          aria-label={t("Configurações")}
          title={t("Configurações")}
          className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <Settings size={16} aria-hidden />
        </Link>
        <BotaoDaCasca
          variante="marca"
          tamanho="md"
          onClick={aoNovaConversa}
          aria-label={t("Nova conversa")}
          aria-pressed={novaAberta}
        >
          {t("Nova conversa")}
          <Plus size={14} aria-hidden />
        </BotaoDaCasca>
      </div>
    </div>
  );
}
