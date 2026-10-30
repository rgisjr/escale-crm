"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { Plus } from "@/lib/ui/icons-da-casca";

/** O CABEÇALHO (07-001): "Automações" e o botão "Nova automação +" na cor da marca. */
export function CabecalhoDasAutomacoes({ aoCriar }: { aoCriar: () => void }) {
  const t = useT();
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-casca-divisoria px-6">
      <h1 className="text-[18px] font-medium text-casca-texto">{t("Automações")}</h1>
      <BotaoDaCasca variante="marca" tamanho="sm" onClick={aoCriar}>
        {t("Nova automação")}
        <Plus size={14} aria-hidden />
      </BotaoDaCasca>
    </header>
  );
}
