"use client";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { useT } from "@/hooks/i18n/useT";

/**
 * A LINHA "CRIAR" DAS LISTAS DE TAG (Clint, print do "teste"): primeira da lista,
 * destacada na cor clara da marca, com "Criar" e a etiqueta que vai nascer, já na
 * cor que ela terá. Só se mostra quando o texto digitado não bate com nenhuma tag
 * (ver `tagNovaDoTexto`). Clicar — ou Enter no campo — usa a tag.
 */
export function LinhaCriarTag({ tag, aoCriar }: { tag: string; aoCriar: (tag: string) => void }) {
  const t = useT();
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      aria-label={`${t("Criar")} ${tag}`}
      onClick={() => aoCriar(tag)}
      className="flex min-h-[34px] w-full items-center gap-2 rounded-[4px] bg-casca-marca-suave px-2 text-left text-[11px] text-casca-suave"
    >
      <span aria-hidden>{t("Criar")}</span>
      <ChipDaTag tag={tag} />
    </button>
  );
}
