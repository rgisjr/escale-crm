"use client";
import { useState } from "react";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import { normalizar } from "@/lib/catalogo/busca";
import { Plus, X } from "@/lib/ui/icons-da-casca";

const TAGS_DO_FILTRO_MAX = 50;

/**
 * "+ ADICIONAR TAG" DO PASSO "CONFIGURE FILTROS" (10-020): pílula que abre a busca com o vocabulário de tags do
 * contato; cada tag escolhida vira um chip com ×. Não cria tag (o filtro só escolhe). Aberto sem print (provisório).
 */
export function EscolhaDeTagsDoModelo({ tags, aoMudar }: { tags: readonly string[]; aoMudar: (tags: string[]) => void }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null).data ?? [];
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const termo = normalizar(busca);
  const opcoes = vocabulario.filter((v) => !tags.includes(v) && (!termo || normalizar(v).includes(termo)));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={tags.length >= TAGS_DO_FILTRO_MAX}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-casca-borda px-2.5 text-[11px] text-casca-texto"
          >
            <Plus size={12} aria-hidden />
            {t("Adicionar tag")}
          </button>
        </PopoverTrigger>
        <PainelSuspenso sideOffset={8} className="w-[260px] p-3">
          <input
            autoFocus
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar")}
            aria-label={t("Buscar")}
            className="mb-2 h-8 w-full rounded-[4px] border-0 bg-casca-raia px-2 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-suave"
          />
          <div role="listbox" aria-label={t("Tags")} className="max-h-64 overflow-y-auto">
            {opcoes.map((tag) => (
              <button
                key={tag}
                type="button"
                role="option"
                aria-selected={false}
                aria-label={tag}
                onClick={() => {
                  aoMudar([...tags, tag]);
                  setBusca("");
                  setAberto(false);
                }}
                className="block w-full rounded-[6px] px-2 py-1.5 text-left hover:bg-casca-busca"
              >
                <ChipDaTag tag={tag} />
              </button>
            ))}
          </div>
        </PainelSuspenso>
      </Popover>
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1">
          <ChipDaTag tag={tag} />
          <button
            type="button"
            aria-label={t("Remover {tag}").replace("{tag}", tag)}
            onClick={() => aoMudar(tags.filter((x) => x !== tag))}
            className="text-casca-suave hover:text-casca-texto"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}
