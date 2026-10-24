"use client";

import { useState } from "react";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { TAGS_DO_POS_ENVIO_MAX } from "@/lib/escale/campanhas/assistente";
import { Plus, X } from "@/lib/ui/icons-da-casca";

import { CAMPO } from "../molde/estilos";

/**
 * "ADICIONAR TAG PARA CONTATOS" (fork Escale, Fase 8B; 09-040): a pílula "+
 * Adicionar tag" abre "Nome" com a busca e as etiquetas do vocabulário do
 * contato; Enter cria uma nova. Até 20, normalizadas como o banco guarda.
 */
export function EscolhaDeTagsDaCampanha({
  tags,
  aoMudar,
}: {
  tags: string[];
  aoMudar: (tags: string[]) => void;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null).data ?? [];
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const opcoes = vocabulario.filter((v) => !tags.includes(v) && (!termo || v.includes(termo)));
  const incluir = (tag: string) => {
    const novas = normalizarTags([...tags, tag]).slice(0, TAGS_DO_POS_ENVIO_MAX);
    aoMudar(novas);
    setBusca("");
    setAberto(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
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
      {tags.length < TAGS_DO_POS_ENVIO_MAX && (
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("Adicionar tag")}
              className="flex h-6 items-center gap-1 rounded-full border border-casca-borda px-2.5 text-[11px] font-medium text-casca-texto"
            >
              <Plus className="size-3" aria-hidden />
              {t("Adicionar tag")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso sideOffset={8} className="w-[290px] p-3">
            <label className="mb-2 block text-[13px] text-casca-texto">
              {t("Nome")}
              <input
                autoFocus
                value={busca}
                placeholder={t("Adicione uma tag")}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && termo) {
                    e.preventDefault();
                    incluir(termo);
                  }
                }}
                className={`${CAMPO} mt-2 border-casca-marca bg-surface`}
              />
            </label>
            <div role="listbox" aria-label={t("Tags")} className="max-h-64 overflow-y-auto">
              {opcoes.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  role="option"
                  aria-selected={false}
                  aria-label={tag}
                  onClick={() => incluir(tag)}
                  className="block w-full rounded-[6px] px-2 py-1.5 text-left hover:bg-casca-busca"
                >
                  <ChipDaTag tag={tag} />
                </button>
              ))}
            </div>
          </PainelSuspenso>
        </Popover>
      )}
    </div>
  );
}
