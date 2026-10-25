"use client";
import { useState } from "react";

import { CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { LinhaCriarTag } from "@/components/escale/ui/LinhaCriarTag";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTag } from "@/lib/contacts/tag-normalizada";
import { tagNovaDoTexto } from "@/lib/escale/tag-nova";
import { cn } from "@/lib/utils";

/**
 * O campo "Tag" da ação em massa "Incluir tag" (Clint, print do "teste"): escreve-se
 * para buscar; a lista traz as tags existentes e, no alto, "Criar" + a etiqueta
 * quando o texto não existe. `valor` é a tag já escolhida (ou "" enquanto não há).
 */
export function CampoDeTagComCriar({
  vocabulario,
  valor,
  aoMudar,
}: {
  vocabulario: readonly string[];
  valor: string;
  aoMudar: (tag: string) => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState(valor);
  const [aberta, setAberta] = useState(false);
  const termo = normalizarTag(texto);
  const opcoes = vocabulario.filter((v) => v.toLowerCase().includes(termo)).slice(0, 50);
  const nova = tagNovaDoTexto(texto, vocabulario);

  function escolher(tag: string) {
    setTexto(tag);
    setAberta(false);
    aoMudar(tag);
  }

  return (
    <div className="space-y-1">
      <input
        role="combobox"
        aria-expanded={aberta}
        aria-label={t("Tag")}
        value={texto}
        placeholder={t("Adicione uma tag")}
        onFocus={() => setAberta(true)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberta(true);
          aoMudar("");
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || !termo) return;
          e.preventDefault();
          escolher(opcoes.find((o) => o === termo) ?? nova ?? termo);
        }}
        className={cn(CLASSE_DO_CAMPO, "border-casca-marca")}
      />
      {aberta ? (
        <div
          role="listbox"
          aria-label={t("Tags")}
          className="max-h-60 overflow-y-auto rounded-[6px] border border-casca-borda bg-surface p-1"
        >
          {nova ? <LinhaCriarTag tag={nova} aoCriar={escolher} /> : null}
          {opcoes.map((o) => (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={o === valor}
              aria-label={o}
              onClick={() => escolher(o)}
              className="flex min-h-[34px] w-full items-center rounded-[4px] px-2 text-left hover:bg-casca-busca"
            >
              <ChipDaTag tag={o} />
            </button>
          ))}
          {opcoes.length === 0 && !nova ? (
            <p className="px-2 py-1.5 text-[12px] text-casca-suave">
              {t("Nenhuma tag correspondente")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
